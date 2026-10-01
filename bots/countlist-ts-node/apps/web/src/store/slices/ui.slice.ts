import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  theme: 'light' | 'dark';
  // Telefondagi chiquvchi menyu (drawer). Kompyuterda sidebar doim ko'rinadi.
  sidebarOpen: boolean;
  // Kompyuterda sidebar yig'ilgan bo'lsa faqat iconlar ko'rinadi.
  sidebarCollapsed: boolean;
  selectedGroupId: string | null;
}

function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// localStorage brauzer sozlamasiga ko'ra yopiq bo'lishi mumkin — unda
// standart qiymat bilan ishlayveramiz, sahifa yiqilmasin.
function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch (err) {
    console.warn(`localStorage o'qilmadi (${key}):`, err);
    return false;
  }
}

const initialState: UIState = {
  theme: getInitialTheme(),
  // Avval true edi — telefonda sahifa ochilishi bilan menyu ekranni yopib qo'yardi.
  sidebarOpen: false,
  sidebarCollapsed: readFlag('sidebarCollapsed'),
  selectedGroupId: localStorage.getItem('selectedGroupId'),
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
      document.documentElement.classList.toggle('dark', state.theme === 'dark');
    },
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      document.documentElement.classList.toggle('dark', action.payload === 'dark');
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    closeSidebar(state) {
      state.sidebarOpen = false;
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', state.sidebarCollapsed ? '1' : '0');
    },
    setSelectedGroup(state, action: PayloadAction<string>) {
      state.selectedGroupId = action.payload;
      localStorage.setItem('selectedGroupId', action.payload);
    },
  },
});

export const {
  toggleTheme, setTheme, toggleSidebar, closeSidebar, toggleSidebarCollapsed, setSelectedGroup,
} = uiSlice.actions;
export default uiSlice.reducer;
