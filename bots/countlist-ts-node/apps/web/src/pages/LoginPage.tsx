import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, Send, AlertTriangle } from 'lucide-react';
import { useAppDispatch } from '@/hooks/useAppSelector';
import { setAuth } from '@/store/slices/auth.slice';
import { authApi } from '@/services/api';
import toast from 'react-hot-toast';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
    Telegram?: { WebApp?: { initData?: string; ready?: () => void; expand?: () => void } };
  }
}

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Widget ham, bot havolasi ham bir xil javob qaytaradi — kirishni bitta joyda yakunlaymiz.
  const finishLogin = useCallback(async (request: Promise<{ data: any }>) => {
    setLoading(true);
    try {
      const { data } = await request;
      const payload = data.data || data;
      dispatch(setAuth({
        user: payload.user,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
      }));
      toast.success(`Xush kelibsiz, ${payload.user.firstName}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Kirish muvaffaqiyatsiz: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [dispatch, navigate]);

  // Bot menyusidagi tugma (Mini App) orqali ochilgan bo'lsa — Telegram initData'ni
  // imzolab beradi, server tekshiradi: widget ham, /setdomain ham kerak emas.
  // Oddiy brauzerda initData bo'sh — pastdagi widget/havola ishlaydi.
  const inMiniApp = !!window.Telegram?.WebApp?.initData;
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.initData) return;
    webApp.ready?.();
    webApp.expand?.();
    void finishLogin(authApi.loginWebApp(webApp.initData));
  }, [finishLogin]);

  // Bot /login bergan havola: /login#token=... . Token # dan keyin keladi —
  // serverga ham, loglarga ham tushmaydi. O'qigach manzil satridan darhol
  // o'chiramiz: tarixda va "ulashish"da qolib ketmasin.
  useEffect(() => {
    const match = window.location.hash.match(/(?:^#|&)token=([^&]+)/);
    if (!match) return;
    window.history.replaceState(null, '', window.location.pathname);
    void finishLogin(authApi.loginBotLink(decodeURIComponent(match[1])));
  }, [finishLogin]);

  useEffect(() => {
    if (inMiniApp || !BOT_USERNAME || !widgetRef.current) return;

    // Widget faqat BotFather'da /setdomain qilingan domenda ishlaydi.
    // Kirish ma'lumotini Telegram imzolaydi — ID ni qo'lda yozib kirish
    // (avvalgi forma) istalgan odamga boshqaning akkauntini ochib berardi.
    window.onTelegramAuth = (user) => { void finishLogin(authApi.loginTelegram(user)); };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.onerror = () => toast.error("Telegram widget yuklanmadi: telegram.org ga ulanishni tekshiring");
    widgetRef.current.appendChild(script);

    const container = widgetRef.current;
    return () => {
      container.innerHTML = '';
      delete window.onTelegramAuth;
    };
  }, [finishLogin, inMiniApp]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-500/30"
            >
              <Wallet size={28} className="text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Expense Tracker</h1>
            <p className="text-slate-400 text-sm mt-1">Xarajatlaringizni boshqaring</p>
          </div>

          {/* Kirish */}
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-2">
              <Send size={15} className="text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-brand-300 text-xs font-medium mb-0.5">Telegram orqali kirish</p>
                <p className="text-brand-400/80 text-xs">
                  Tugmani bosing va Telegram'da tasdiqlang.
                </p>
              </div>
            </div>
          </div>

          {BOT_USERNAME ? (
            <div className="flex flex-col items-center gap-3 min-h-[48px]">
              <div ref={widgetRef} />
              {loading && <p className="text-slate-400 text-sm">Kirilmoqda...</p>}
            </div>
          ) : (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <AlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-xs">
                Kirish sozlanmagan: web servisiga <code>VITE_TELEGRAM_BOT_USERNAME</code> (bot username,
                @ belgisisiz) qo'shib qayta build qiling.
              </p>
            </div>
          )}

          <p className="text-center text-slate-400 text-xs mt-6">
            Tugma ishlamasa: botga shaxsiy chatda <code>/login</code> yozing — u kirish havolasini yuboradi.
            {BOT_USERNAME && (
              <>
                {' '}
                <a className="text-brand-300 underline" href={`https://t.me/${BOT_USERNAME}?start=login`}>
                  Botni ochish
                </a>
              </>
            )}
          </p>
          {loading && !BOT_USERNAME && <p className="text-center text-slate-400 text-sm mt-3">Kirilmoqda...</p>}
        </div>
      </motion.div>
    </div>
  );
}
