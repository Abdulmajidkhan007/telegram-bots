// Telegram Mini App (bot menyu tugmasi) ichida ochilganmi.
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
        HapticFeedback?: { notificationOccurred?: (type: 'success' | 'error' | 'warning') => void };
      };
    };
  }
}

export function isMiniApp(): boolean {
  return !!window.Telegram?.WebApp?.initData;
}

export function haptic(type: 'success' | 'error' | 'warning'): void {
  window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(type);
}
