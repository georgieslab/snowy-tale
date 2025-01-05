import React from 'react'
import ReactDOM from 'react-dom/client'  // Changed from 'react-dom/root'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)