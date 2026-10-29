import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/gaegu/700.css'
import './index.css'
import App from './App.tsx'
import { getLang } from './i18n'

document.documentElement.lang = getLang()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
