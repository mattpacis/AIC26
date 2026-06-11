import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode breaks botframework-webchat (custom elements registered twice in dev).
createRoot(document.getElementById('root')!).render(<App />)
