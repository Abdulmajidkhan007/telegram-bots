import { useEffect, useState } from 'react';

/** Har harfda so'rov yubormaslik uchun: qiymat `ms` davomida o'zgarmasa qaytadi. */
export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
