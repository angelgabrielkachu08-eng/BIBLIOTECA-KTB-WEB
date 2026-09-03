import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PerfilLector from './components/PerfilLector.jsx'
import CorazonLibro from './components/CorazonLibro.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <PerfilLector />
    <CorazonLibro />
  </React.StrictMode>,
)
