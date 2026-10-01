import {
  LayoutDashboard, Receipt, BarChart3, Tag, Users, Building2,
  Target, RefreshCw, Download, Settings,
} from 'lucide-react';

export const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', short: 'Asosiy' },
  { to: '/expenses', icon: Receipt, label: 'Xarajatlar', short: 'Xarajat' },
  { to: '/analytics', icon: BarChart3, label: 'Analitika', short: 'Tahlil' },
  { to: '/categories', icon: Tag, label: 'Kategoriyalar', short: 'Kategoriya' },
  { to: '/groups', icon: Building2, label: 'Guruhlar', short: 'Guruhlar' },
  { to: '/users', icon: Users, label: 'Foydalanuvchilar', short: 'A\'zolar' },
  { to: '/limits', icon: Target, label: 'Limitlar', short: 'Limit' },
  { to: '/recurring', icon: RefreshCw, label: 'Takroriy', short: 'Takroriy' },
  { to: '/exports', icon: Download, label: 'Export', short: 'Export' },
  { to: '/settings', icon: Settings, label: 'Sozlamalar', short: 'Sozlama' },
];

// Telefondagi pastki panelga sig'adigan asosiylar; qolgani "Menyu" orqali.
export const bottomNavPaths = ['/', '/expenses', '/analytics', '/categories'];
