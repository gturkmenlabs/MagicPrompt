#!/usr/bin/env node

/**
 * UI Analyzer
 * Kullanim:
 *   node scripts/ui-analyze.mjs http://localhost:3000
 *   npm run analyze:ui -- http://localhost:3000
 *   npm run analyze:ui -- --all
 *   npm run analyze:ui -- --pages=dashboard,prompts,settings
 *
 * Varsayilan olarak desktop viewport'ta auth ekranini ve input sonrasi ana sayfalari tarar.
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { chromium } from 'playwright';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

dotenv.config();

const VIEWPORT_PRESETS = {
  mobile: { name: 'mobile', width: 390, height: 844 },
  tablet: { name: 'tablet', width: 768, height: 1024 },
  desktop: { name: 'desktop', width: 1440, height: 900 },
};

const APP_PAGES = [
  {
    key: 'dashboard',
    label: 'Prompt Lab',
    titleHints: ['Meta-prompt uretim yuzeyi', 'Meta-prompt production surface'],
  },
  {
    key: 'prompts',
    label: 'Library',
    titleHints: ['Arsiv, koleksiyon ve kisisel gecmis', 'Archive, collections, and personal history'],
  },
  {
    key: 'ailab',
    label: 'AI Lab',
    titleHints: ['Ajan kontrol merkezi', 'Agent control center'],
  },
  {
    key: 'optimizer',
    label: 'Optimizer',
    titleHints: ['Adimli optimizasyon flow', 'Stepped optimization flow'],
  },
  {
    key: 'ragflow',
    label: 'RAG Engine',
    titleHints: ['Bilgi tabani ve workflow merkezi', 'Knowledge base and workflow hub'],
  },
  {
    key: 'analytics',
    label: 'Analitik',
    titleHints: ['KPI ve kullanim gorunurlugu', 'KPI and usage visibility'],
  },
  {
    key: 'settings',
    label: 'Settings',
    titleHints: ['Saglayici ve guven ayarlari', 'Provider and trust settings'],
  },
];

const args = process.argv.slice(2);
const targetArg = args.find((arg) => !arg.startsWith('--'));
const flagArgs = args.filter((arg) => arg.startsWith('--'));

const TARGET_URL = targetArg || 'http://localhost:3000';
const outputArg = flagArgs.find((arg) => arg.startsWith('--output='));
const viewportsArg = flagArgs.find((arg) => arg.startsWith('--viewports='));
const pagesArg = flagArgs.find((arg) => arg.startsWith('--pages='));
const includeAll = flagArgs.includes('--all');
const authOnly = flagArgs.includes('--auth-only');
const skipLogin = flagArgs.includes('--skip-login');
const fullPage = !flagArgs.includes('--viewport-only');

const selectedViewportNames = viewportsArg
  ? viewportsArg
      .replace('--viewports=', '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  : includeAll
    ? ['mobile', 'tablet', 'desktop']
    : ['desktop'];

const VIEWPORTS = selectedViewportNames
  .map((name) => VIEWPORT_PRESETS[name])
  .filter(Boolean);

if (VIEWPORTS.length === 0) {
  console.error('Gecerli viewport bulunamadi. Kullanilabilir degerler: mobile, tablet, desktop');
  process.exit(1);
}

const selectedPageKeys = pagesArg
  ? pagesArg
      .replace('--pages=', '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  : APP_PAGES.map((page) => page.key);

const pagesToVisit = APP_PAGES.filter((page) => selectedPageKeys.includes(page.key));

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  outputArg ? outputArg.replace('--output=', '') : 'ui-analysis-report',
);

const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.VITE_ADMIN_PASSWORD || '';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeFilePart(value) {
  return String(value || 'screen')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function cloneEvents(events, startIndex) {
  return events.slice(startIndex);
}

async function quietWait(page, timeout = 500) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  await page.waitForTimeout(350);
}

async function analyzeDom(page) {
  return await page.evaluate(() => {
    function getSelector(el) {
      if (!el || !el.tagName) return 'unknown';
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const classes =
        el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().replace(/\s+/g, '.')
          : '';
      return `${tag}${id}${classes}`.slice(0, 300);
    }

    function isVisible(el) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        parseFloat(style.opacity || '1') > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }

    function accessibleName(el) {
      const ariaLabel = el.getAttribute('aria-label');
      const ariaLabelledBy = el.getAttribute('aria-labelledby');
      const title = el.getAttribute('title');
      const text = (el.innerText || el.textContent || '').trim();

      if (ariaLabel) return ariaLabel.trim();
      if (ariaLabelledBy) {
        const ids = ariaLabelledBy.split(/\s+/);
        const joined = ids
          .map((id) => document.getElementById(id)?.innerText || '')
          .join(' ')
          .trim();
        if (joined) return joined;
      }
      if (title) return title.trim();
      if (text) return text;
      return '';
    }

    const issues = {
      unlabeledInputs: [],
      unnamedButtons: [],
      unnamedLinks: [],
      smallTapTargets: [],
      missingAltImages: [],
      duplicateIds: [],
      horizontalOverflow: false,
    };

    const inputs = [...document.querySelectorAll('input, textarea, select')];
    for (const el of inputs) {
      if (!isVisible(el)) continue;
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'reset'].includes(type)) continue;

      const id = el.id;
      const ariaLabel = el.getAttribute('aria-label');
      const ariaLabelledBy = el.getAttribute('aria-labelledby');
      const placeholder = el.getAttribute('placeholder');
      const hasLabel =
        !!ariaLabel ||
        !!ariaLabelledBy ||
        !!placeholder ||
        (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
        el.closest('label');

      if (!hasLabel) {
        issues.unlabeledInputs.push({
          selector: getSelector(el),
          type: el.tagName.toLowerCase(),
          inputType: type || null,
        });
      }
    }

    const buttons = [...document.querySelectorAll("button, [role='button']")];
    for (const el of buttons) {
      if (!isVisible(el)) continue;
      const name = accessibleName(el);
      if (!name) {
        issues.unnamedButtons.push({
          selector: getSelector(el),
          html: el.outerHTML.slice(0, 300),
        });
      }

      const rect = el.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        issues.smallTapTargets.push({
          selector: getSelector(el),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          kind: 'button',
        });
      }
    }

    const links = [...document.querySelectorAll('a')];
    for (const el of links) {
      if (!isVisible(el)) continue;
      const name = accessibleName(el);
      if (!name) {
        issues.unnamedLinks.push({
          selector: getSelector(el),
          href: el.getAttribute('href'),
          html: el.outerHTML.slice(0, 300),
        });
      }

      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
        issues.smallTapTargets.push({
          selector: getSelector(el),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          kind: 'link',
        });
      }
    }

    const images = [...document.querySelectorAll('img')];
    for (const el of images) {
      if (!isVisible(el)) continue;
      const alt = el.getAttribute('alt');
      if (alt === null) {
        issues.missingAltImages.push({
          selector: getSelector(el),
          src: el.getAttribute('src'),
        });
      }
    }

    const idMap = new Map();
    [...document.querySelectorAll('[id]')].forEach((el) => {
      const id = el.id;
      idMap.set(id, (idMap.get(id) || 0) + 1);
    });

    for (const [id, count] of idMap.entries()) {
      if (count > 1) {
        issues.duplicateIds.push({ id, count });
      }
    }

    issues.horizontalOverflow =
      document.documentElement.scrollWidth > window.innerWidth + 2;

    return {
      title: document.title,
      url: location.href,
      issues,
    };
  });
}

async function analyzeImages(page) {
  return await page.evaluate(() => {
    const imgs = [...document.images];
    const broken = [];

    for (const img of imgs) {
      const src = img.currentSrc || img.src;
      const failed =
        !img.complete ||
        typeof img.naturalWidth !== 'number' ||
        img.naturalWidth === 0;

      if (failed) {
        broken.push({
          src,
          alt: img.alt || '',
        });
      }
    }

    return broken;
  });
}

async function hasSidebar(page) {
  return (await page.locator('aside button.app-sidebar-item').count()) > 0;
}

async function dismissOnboardingIfPresent(page) {
  const skipButton = page.getByRole('button', { name: /Atla|Skip/i }).first();
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click().catch(() => {});
    await page.waitForTimeout(450);
  }
}

async function loginIfNeeded(page) {
  if (await hasSidebar(page)) {
    return { authenticated: true, attempted: false, reason: 'existing_session' };
  }

  if (skipLogin) {
    return { authenticated: false, attempted: false, reason: 'login_skipped' };
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return { authenticated: false, attempted: false, reason: 'missing_credentials' };
  }

  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  const hasLoginForm =
    (await emailInput.count()) > 0 &&
    (await passwordInput.count()) > 0 &&
    (await submitButton.count()) > 0;

  if (!hasLoginForm) {
    return { authenticated: false, attempted: false, reason: 'login_form_not_found' };
  }

  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);
  await submitButton.click();

  try {
    await page.locator('aside button.app-sidebar-item').first().waitFor({ state: 'visible', timeout: 15000 });
    await quietWait(page, 2500);
    await dismissOnboardingIfPresent(page);
    return { authenticated: true, attempted: true, reason: 'login_success' };
  } catch (error) {
    const authError = await page.locator('.text-red-400').first().textContent().catch(() => '');
    return {
      authenticated: false,
      attempted: true,
      reason: authError || (error instanceof Error ? error.message : String(error)),
    };
  }
}

async function navigateToAppPage(page, pageConfig) {
  const sidebarItem = page
    .locator('aside button.app-sidebar-item')
    .filter({ hasText: pageConfig.label })
    .first();

  if ((await sidebarItem.count()) === 0) {
    throw new Error(`Sidebar item not found: ${pageConfig.label}`);
  }

  await sidebarItem.click();
  await page.waitForFunction(
    (label) => {
      const items = [...document.querySelectorAll('aside button.app-sidebar-item')];
      const match = items.find((item) => item.textContent?.includes(label));
      return match?.getAttribute('aria-current') === 'page';
    },
    pageConfig.label,
    { timeout: 8000 },
  );

  if (Array.isArray(pageConfig.titleHints) && pageConfig.titleHints.length > 0) {
    await page.waitForFunction(
      (hints) => {
        const title = document.querySelector('header h1')?.textContent || '';
        return hints.some((hint) => title.includes(hint));
      },
      pageConfig.titleHints,
      { timeout: 8000 },
    ).catch(() => {});
  }

  await quietWait(page, 3000);
}

async function captureSurface(page, viewport, pageMeta, events, shotIndex) {
  const eventOffsets = {
    consoleErrors: events.consoleErrors.length,
    pageErrors: events.pageErrors.length,
    failedRequests: events.failedRequests.length,
  };

  await quietWait(page, 3000);

  const screenshotName = `${viewport.name}-${String(shotIndex).padStart(2, '0')}-${sanitizeFilePart(pageMeta.key)}.png`;
  await page.screenshot({
    path: path.join(OUTPUT_DIR, screenshotName),
    fullPage,
  });

  const dom = await analyzeDom(page);
  const brokenImages = await analyzeImages(page);

  return {
    pageKey: pageMeta.key,
    pageLabel: pageMeta.label,
    title: dom.title,
    url: dom.url,
    screenshot: screenshotName,
    consoleErrors: cloneEvents(events.consoleErrors, eventOffsets.consoleErrors),
    pageErrors: cloneEvents(events.pageErrors, eventOffsets.pageErrors),
    failedRequests: cloneEvents(events.failedRequests, eventOffsets.failedRequests),
    brokenImages,
    issues: dom.issues,
  };
}

function addTotals(target, scan) {
  target.consoleErrors += scan.consoleErrors?.length || 0;
  target.pageErrors += scan.pageErrors?.length || 0;
  target.failedRequests += scan.failedRequests?.length || 0;
  target.brokenImages += scan.brokenImages?.length || 0;
  target.unlabeledInputs += scan.issues?.unlabeledInputs?.length || 0;
  target.unnamedButtons += scan.issues?.unnamedButtons?.length || 0;
  target.unnamedLinks += scan.issues?.unnamedLinks?.length || 0;
  target.smallTapTargets += scan.issues?.smallTapTargets?.length || 0;
  target.missingAltImages += scan.issues?.missingAltImages?.length || 0;
  target.duplicateIds += scan.issues?.duplicateIds?.length || 0;
  target.horizontalOverflowCount += scan.issues?.horizontalOverflow ? 1 : 0;
}

async function run() {
  ensureDir(OUTPUT_DIR);

  const browser = await chromium.launch({ headless: true });
  const report = {
    target: TARGET_URL,
    scannedAt: new Date().toISOString(),
    viewports: VIEWPORTS.map(({ name }) => name),
    authOnly,
    pagesRequested: pagesToVisit.map((page) => page.key),
    results: [],
  };

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      ignoreHTTPSErrors: true,
    });

    await context.addInitScript(() => {
      window.localStorage.setItem('sr_onboarding_done', '1');
    });

    const page = await context.newPage();
    const events = {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
    };

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        events.consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    page.on('pageerror', (error) => {
      events.pageErrors.push({
        message: error.message,
        stack: error.stack,
      });
    });

    page.on('requestfailed', (request) => {
      events.failedRequests.push({
        url: request.url(),
        method: request.method(),
        errorText: request.failure()?.errorText || 'unknown',
        resourceType: request.resourceType(),
      });
    });

    const viewportResult = {
      viewport,
      status: null,
      navigationError: null,
      authentication: null,
      scans: [],
    };

    try {
      const response = await page.goto(TARGET_URL, {
        waitUntil: 'networkidle',
        timeout: 45000,
      });
      viewportResult.status = response?.status() ?? null;

      let shotIndex = 1;
      viewportResult.scans.push(
        await captureSurface(page, viewport, { key: 'auth', label: 'Auth' }, events, shotIndex++),
      );

      const authState = await loginIfNeeded(page);
      viewportResult.authentication = authState;

      if (!authOnly && authState.authenticated && (await hasSidebar(page))) {
        await dismissOnboardingIfPresent(page);

        for (const pageConfig of pagesToVisit) {
          try {
            await navigateToAppPage(page, pageConfig);
            viewportResult.scans.push(
              await captureSurface(page, viewport, pageConfig, events, shotIndex++),
            );
          } catch (pageError) {
            viewportResult.scans.push({
              pageKey: pageConfig.key,
              pageLabel: pageConfig.label,
              navigationError: pageError instanceof Error ? pageError.message : String(pageError),
              consoleErrors: [],
              pageErrors: [],
              failedRequests: [],
              brokenImages: [],
              issues: {},
            });
          }
        }
      }

      report.results.push(viewportResult);
    } catch (error) {
      viewportResult.navigationError = error instanceof Error ? error.message : String(error);
      report.results.push(viewportResult);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  const summary = {
    target: report.target,
    scannedAt: report.scannedAt,
    viewports: report.viewports,
    totalViewports: report.results.length,
    totalScans: 0,
    authentication: report.results.map((result) => ({
      viewport: result.viewport.name,
      status: result.authentication?.reason || (result.authentication?.authenticated ? 'authenticated' : 'not_attempted'),
      authenticated: Boolean(result.authentication?.authenticated),
    })),
    totals: {
      consoleErrors: 0,
      pageErrors: 0,
      failedRequests: 0,
      brokenImages: 0,
      unlabeledInputs: 0,
      unnamedButtons: 0,
      unnamedLinks: 0,
      smallTapTargets: 0,
      missingAltImages: 0,
      duplicateIds: 0,
      horizontalOverflowCount: 0,
    },
  };

  for (const result of report.results) {
    for (const scan of result.scans || []) {
      summary.totalScans += 1;
      addTotals(summary.totals, scan);
    }
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'report.json'),
    JSON.stringify(report, null, 2),
    'utf8',
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  );

  console.log('\nUI analysis tamamlandi.\n');
  console.log('Hedef:', TARGET_URL);
  console.log('Viewportlar:', report.viewports.join(', '));
  console.log('Taranan ekranlar:', summary.totalScans);
  console.log('Rapor klasoru:', OUTPUT_DIR);
  console.log('\nOzet:');
  console.log(JSON.stringify(summary, null, 2));
}

run().catch((err) => {
  console.error('Script calisirken error olustu:');
  console.error(err);
  process.exit(1);
});
