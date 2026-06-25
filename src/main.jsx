import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

const savedName = localStorage.getItem("appName");
if (savedName) document.title = savedName;

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
