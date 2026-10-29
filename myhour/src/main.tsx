import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/gaegu/700.css'
import './index.css'
import App from './App.tsx'
import { getLang } from './i18n'

document.documentElement.lang = getLang()
// 영어판 브라우저 탭 이름 (한국어는 index.html의 '하꾸 - 하루 꾸미기' 그대로)
if (getLang() === 'en') document.title = 'MyHour'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
