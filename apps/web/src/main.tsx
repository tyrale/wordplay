import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { requestPersistentStorage } from './utils/persistentStorage'

// Ask the browser to exempt this origin's IndexedDB/localStorage (unlocks,
// player stats, active game) from automatic eviction under storage pressure.
requestPersistentStorage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
