import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/alegreya/latin-500.css'
import '@fontsource/alegreya/latin-700.css'
import '@fontsource/alegreya/latin-400-italic.css'
import '@fontsource/alegreya-sans/latin-400.css'
import '@fontsource/alegreya-sans/latin-500.css'
import '@fontsource/alegreya-sans/latin-700.css'
import './styles/app.css'
import { App } from './App'

// Deixa o app disponível offline e o atualiza sozinho quando há versão nova.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
