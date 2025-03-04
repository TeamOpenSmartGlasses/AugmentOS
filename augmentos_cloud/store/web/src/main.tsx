import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
// import AppStoreDesign from './pages/AppStoreDesign'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* <AppStoreDesign /> */}
  </StrictMode>,
)
