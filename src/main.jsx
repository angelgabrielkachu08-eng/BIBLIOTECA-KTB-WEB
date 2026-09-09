import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PerfilLector from './components/PerfilLector.jsx'
import CorazonLibro from './components/CorazonLibro.jsx'
import CarruselInicio from './components/CarruselInicio.jsx'
import ModalidadHibrida from './components/ModalidadHibrida.jsx'
import PrestamosPremium from './components/PrestamosPremium.jsx'
import './index.css'
import './ajustes-septiembre.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <PerfilLector />
    <CorazonLibro />
    <CarruselInicio />
    <ModalidadHibrida />
    <PrestamosPremium />
  </React.StrictMode>,
)
