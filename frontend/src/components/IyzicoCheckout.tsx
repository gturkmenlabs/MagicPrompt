/**
 * IyzicoCheckout — iyzico Checkout Form bileşeni.
 * PricingPage'den plan + buyer bilgisi alır, /api/v1/iyzico/initialize çağırır
 * ve dönen HTML form'u iframe-free olarak render eder.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '../i18n';

interface BuyerInfo {
  name: string;
  surname: string;
  identityNumber: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
}

interface IyzicoCheckoutProps {
  plan: 'monthly' | 'yearly' | 'team';
  onClose: () => void;
}

const CITIES_TR = [
  'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya',
  'Gaziantep', 'Mersin', 'Diyarbakir', 'Kayseri', 'Eskisehir', 'Samsun',
  'Trabzon', 'Denizli', 'Malatya', 'Erzurum', 'Sanliurfa', 'Van', 'Mugla',
];

export default function IyzicoCheckout({ plan, onClose }: IyzicoCheckoutProps) {
  const { session } = useAuth();
  const { language } = useTranslation();
  const lang = language;

  const [step, setStep] = useState<'form' | 'checkout' | 'loading'>('form');
  const [error, setError] = useState<string | null>(null);
  const [checkoutHtml, setCheckoutHtml] = useState<string>('');
  const checkoutRef = useRef<HTMLDivElement>(null);

  const [buyer, setBuyer] = useState<BuyerInfo>({
    name: '', surname: '', identityNumber: '',
    phone: '', address: '', city: 'Istanbul', zipCode: '',
  });

  const updateField = (field: keyof BuyerInfo, value: string) => {
    setBuyer(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setStep('loading');
    setError(null);

    try {
      const res = await fetch('/api/v1/iyzico/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan, buyer }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Payment initialization failed');
        setStep('form');
        return;
      }

      setCheckoutHtml(data.checkoutFormContent);
      setStep('checkout');
    } catch {
      setError(lang === 'tr' ? 'Baglanti hatasi' : 'Connection error');
      setStep('form');
    }
  };

  // iyzico checkout formunu DOM'a enjekte et
  useEffect(() => {
    if (step === 'checkout' && checkoutHtml && checkoutRef.current) {
      checkoutRef.current.innerHTML = checkoutHtml;
      // iyzico script'lerini çalıştır
      const scripts = checkoutRef.current.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        if (oldScript.src) {
          newScript.src = oldScript.src;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    }
  }, [step, checkoutHtml]);

  const planLabels: Record<string, { tr: string; en: string }> = {
    monthly: { tr: 'Pro Aylik', en: 'Pro Monthly' },
    yearly: { tr: 'Pro Yillik', en: 'Pro Yearly' },
    team: { tr: 'Team Aylik', en: 'Team Monthly' },
  };

  const planLabel = planLabels[plan]?.[lang] || plan;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 glass-card p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-mono text-cyber-primary tracking-wider">
            {lang === 'tr' ? 'Odeme' : 'Payment'} — {planLabel}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 font-mono text-xs">
            {error}
          </div>
        )}

        {/* Buyer form */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label={lang === 'tr' ? 'Ad' : 'First Name'}
                value={buyer.name}
                onChange={v => updateField('name', v)}
                required
              />
              <InputField
                label={lang === 'tr' ? 'Soyad' : 'Last Name'}
                value={buyer.surname}
                onChange={v => updateField('surname', v)}
                required
              />
            </div>
            <InputField
              label={lang === 'tr' ? 'TC Kimlik No' : 'Identity Number'}
              value={buyer.identityNumber}
              onChange={v => updateField('identityNumber', v)}
              required
              maxLength={11}
              pattern="[0-9]{11}"
              placeholder="11 haneli TC"
            />
            <InputField
              label={lang === 'tr' ? 'Telefon' : 'Phone'}
              value={buyer.phone}
              onChange={v => updateField('phone', v)}
              required
              placeholder="+905XXXXXXXXX"
            />
            <InputField
              label={lang === 'tr' ? 'Adres' : 'Address'}
              value={buyer.address}
              onChange={v => updateField('address', v)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 font-mono text-xs mb-1">
                  {lang === 'tr' ? 'Sehir' : 'City'}
                </label>
                <select
                  value={buyer.city}
                  onChange={e => updateField('city', e.target.value)}
                  className="w-full bg-cyber-dark/60 border border-glass-border rounded-lg px-3 py-2 text-gray-200 font-mono text-sm focus:border-cyber-primary/50 focus:outline-none"
                >
                  {CITIES_TR.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <InputField
                label={lang === 'tr' ? 'Posta Kodu' : 'Zip Code'}
                value={buyer.zipCode}
                onChange={v => updateField('zipCode', v)}
                placeholder="34000"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-4 bg-cyber-primary/10 border border-cyber-primary text-cyber-primary font-mono font-bold py-3 rounded-lg hover:bg-cyber-primary/20 transition-all duration-200 tracking-wider text-sm"
            >
              {lang === 'tr' ? 'ODEMEYE DEVAM ET' : 'PROCEED TO PAYMENT'}
            </button>
          </form>
        )}

        {/* Loading */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyber-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-400 font-mono text-sm">
              {lang === 'tr' ? 'Odeme formu hazirlaniyor...' : 'Preparing payment form...'}
            </p>
          </div>
        )}

        {/* iyzico checkout form */}
        {step === 'checkout' && (
          <div ref={checkoutRef} id="iyzipay-checkout-form" className="min-h-[400px]" />
        )}
      </div>
    </div>
  );
}

function InputField({
  label, value, onChange, required, maxLength, pattern, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  maxLength?: number;
  pattern?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-gray-400 font-mono text-xs mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        pattern={pattern}
        placeholder={placeholder}
        className="w-full bg-cyber-dark/60 border border-glass-border rounded-lg px-3 py-2 text-gray-200 font-mono text-sm focus:border-cyber-primary/50 focus:outline-none placeholder-gray-600"
      />
    </div>
  );
}
