/**
 * iyzico ödeme route'ları — checkout form başlatma + callback.
 * IYZICO_API_KEY/SECRET yoksa 503 döner.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { getIyzico, PLAN_PRICES } from '../lib/iyzico';
import { getPool } from '../db/client';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import type { AuthUser } from '../middleware/supabaseAuth';

const router = Router();

/**
 * POST /v1/iyzico/initialize — Checkout Form başlat.
 * Body: { plan: 'monthly'|'yearly'|'team', buyer: { name, surname, identityNumber, phone, address, city, zipCode } }
 */
router.post('/iyzico/initialize', requireAnyAuth, async (req, res) => {
  const iyzipay = getIyzico();
  if (!iyzipay) {
    return res.status(503).json({ error: 'iyzico not configured' });
  }

  try {
    const authUser = (req as any).authUser as AuthUser;
    const { plan, buyer } = req.body ?? {};

    const planInfo = PLAN_PRICES[plan];
    if (!planInfo) {
      return res.status(400).json({ error: `Invalid plan: ${plan}. Use monthly, yearly, or team.` });
    }

    if (!buyer?.name || !buyer?.surname || !buyer?.identityNumber || !buyer?.phone || !buyer?.address || !buyer?.city) {
      return res.status(400).json({ error: 'Missing buyer fields: name, surname, identityNumber, phone, address, city' });
    }

    const conversationId = crypto.randomUUID();
    const basketId = `basket_${Date.now()}`;
    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;

    const request = {
      locale: 'tr',
      conversationId,
      price: planInfo.price,
      paidPrice: planInfo.price,
      currency: 'TRY',
      basketId,
      paymentGroup: 'SUBSCRIPTION',
      callbackUrl: `${frontendUrl}/api/v1/iyzico/callback`,
      enabledInstallments: [1],
      buyer: {
        id: authUser.userId,
        name: buyer.name,
        surname: buyer.surname,
        email: authUser.email,
        identityNumber: buyer.identityNumber,
        gsmNumber: buyer.phone,
        registrationAddress: buyer.address,
        city: buyer.city,
        country: 'Turkey',
        zipCode: buyer.zipCode || '00000',
        ip: req.ip || '127.0.0.1',
      },
      shippingAddress: {
        contactName: `${buyer.name} ${buyer.surname}`,
        city: buyer.city,
        country: 'Turkey',
        address: buyer.address,
        zipCode: buyer.zipCode || '00000',
      },
      billingAddress: {
        contactName: `${buyer.name} ${buyer.surname}`,
        city: buyer.city,
        country: 'Turkey',
        address: buyer.address,
        zipCode: buyer.zipCode || '00000',
      },
      basketItems: [
        {
          id: `plan_${plan}`,
          name: planInfo.name,
          category1: 'SaaS Subscription',
          itemType: 'VIRTUAL',
          price: planInfo.price,
        },
      ],
    };

    // DB'ye pending ödeme kaydı
    const pool = getPool();
    if (pool) {
      await pool.query(
        `INSERT INTO payments (user_id, org_id, amount, currency, plan, status, conversation_id, basket_id)
         VALUES ($1, $2, $3, 'TRY', $4, 'pending', $5, $6)`,
        [authUser.userId, authUser.orgId, planInfo.price, plan, conversationId, basketId],
      );
    }

    iyzipay.checkoutFormInitialize.create(request, (err: any, result: any) => {
      if (err) {
        console.error('[iyzico] Initialize error:', err);
        return res.status(500).json({ error: 'iyzico initialize failed' });
      }
      if (result.status !== 'success') {
        console.error('[iyzico] Initialize failed:', result.errorMessage);
        return res.status(400).json({ error: result.errorMessage || 'iyzico form initialize failed' });
      }
      res.json({
        checkoutFormContent: result.checkoutFormContent,
        token: result.token,
        tokenExpireTime: result.tokenExpireTime,
      });
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'iyzico error';
    console.error('[iyzico] Initialize exception:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /v1/iyzico/callback — iyzico'dan gelen ödeme sonucu callback.
 * Form data olarak token gelir. Sonuca göre DB güncellenir ve frontend'e redirect yapılır.
 */
router.post('/iyzico/callback', async (req, res) => {
  const iyzipay = getIyzico();
  if (!iyzipay) {
    return res.status(503).send('iyzico not configured');
  }

  const token = req.body?.token;
  if (!token) {
    return res.status(400).send('Missing token');
  }

  const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;

  iyzipay.checkoutForm.retrieve(
    { locale: 'tr', token },
    async (err: any, result: any) => {
      const pool = getPool();

      if (err || result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
        // Ödeme başarısız
        const errorMsg = err?.message || result?.errorMessage || 'Payment failed';
        console.error('[iyzico] Callback failure:', errorMsg);

        if (pool && result?.basketId) {
          try {
            await pool.query(
              `UPDATE payments SET status = 'failed', iyzico_token = $1, iyzico_response = $2, updated_at = now()
               WHERE basket_id = $3 AND status = 'pending'`,
              [token, JSON.stringify(result || {}), result.basketId],
            );
          } catch (dbErr) {
            console.error('[iyzico] DB update failed:', dbErr);
          }
        }

        return res.redirect(`${frontendUrl}/?payment=failed&error=${encodeURIComponent(errorMsg)}`);
      }

      // Ödeme başarılı
      try {
        if (pool && result.basketId) {
          // payments tablosunu güncelle
          await pool.query(
            `UPDATE payments SET status = 'success', iyzico_token = $1, iyzico_payment_id = $2,
             iyzico_response = $3, updated_at = now()
             WHERE basket_id = $4 AND status = 'pending'`,
            [token, result.paymentId, JSON.stringify(result), result.basketId],
          );

          // Kullanıcının org planını yükselt
          const paymentRow = await pool.query(
            `SELECT user_id, org_id, plan FROM payments WHERE basket_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [result.basketId],
          );
          const payment = paymentRow.rows[0];
          if (payment?.org_id) {
            const newPlan = payment.plan === 'team' ? 'team' : 'pro';
            await pool.query(
              `UPDATE organizations SET plan = $1, updated_at = now() WHERE id = $2::uuid`,
              [newPlan, payment.org_id],
            );
          }
        }
      } catch (dbErr) {
        console.error('[iyzico] DB success update failed:', dbErr);
      }

      res.redirect(`${frontendUrl}/?payment=success`);
    },
  );
});

/**
 * GET /v1/iyzico/payments — Kullanıcının kendi ödeme geçmişi.
 */
router.get('/iyzico/payments', requireAnyAuth, async (req, res) => {
  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const authUser = (req as any).authUser as AuthUser;
    const result = await pool.query(
      `SELECT id, amount, currency, plan, status, created_at, updated_at
       FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [authUser.userId],
    );
    res.json({ payments: result.rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error';
    res.status(500).json({ error: msg });
  }
});

export default router;
