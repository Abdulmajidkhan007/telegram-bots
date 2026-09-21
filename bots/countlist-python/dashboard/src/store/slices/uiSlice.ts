import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type Theme = 'light' | 'dark'

interface UiState {
  theme: Theme
  sidebarOpen: boolean
}

const stored = localStorage.getItem('theme') as Theme | null

const initialState: UiState = {
  theme: stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  sidebarOpen: true,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', state.theme)
    },
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
      localStorage.setItem('theme', state.theme)
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
  },
})

export const { toggleTheme, setTheme, toggleSidebar } = uiSlice.actions
export default uiSlice.reducer
