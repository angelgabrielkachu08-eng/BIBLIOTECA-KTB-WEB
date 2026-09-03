import  { useState } from 'react';

export function Sidebar({ 
  seccionActiva, 
  setSeccionActiva, 
  esAdmin, 
  usuario,
  onAbrirModalAgregar, 
  onAbrirPrestamos, 
  onAbrirUsuarios 
}) {
  const [menuAdminAbierto, setMenuAdminAbierto] = useState(true);

  return (
    <aside style={sidebarStyle}>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '14px', fontFamily: "'Press Start 2P', monospace", color: '#dee3e5', margin: 0 }}>
          KTB LIBROS
        </h2>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={sectionHeader}>NAVEGACIÓN</span>
        
        <button 
          onClick={() => setSeccionActiva('inicio')} 
          style={seccionActiva === 'inicio' ? btnActive : btnStyle}
        >
          🏠 Inicio
        </button>

        <button 
          onClick={() => setSeccionActiva('catalogo')} 
          style={seccionActiva === 'catalogo' ? btnActive : btnStyle}
        >
          📖 Catálogo
        </button>

        {/* Mis Préstamos solo se muestra para usuarios autenticados */}
        {usuario && (
          <button 
            onClick={() => setSeccionActiva('mis_prestamos')} 
            style={seccionActiva === 'mis_prestamos' ? btnActive : btnStyle}
          >
            📋 Mis Préstamos
          </button>
        )}

        {/* Panel de Administración desplegable solo para id_rol === 1 */}
        {esAdmin && (
          <div style={{ marginTop: '16px' }}>
            <button 
              onClick={() => setMenuAdminAbierto(!menuAdminAbierto)} 
              style={{ ...btnStyle, backgroundColor: '#d6dfd9', color: '#000000', border: '1px solid #fbfbfd' }}
            >
              👑 Panel Admin {menuAdminAbierto ? '▼' : '►'}
            </button>

            {menuAdminAbierto && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '12px', marginTop: '8px' }}>
                <button onClick={onAbrirModalAgregar} style={subBtnStyle}>
                  ➕ Agregar Libro
                </button>
                <button onClick={onAbrirPrestamos} style={subBtnStyle}>
                  🔄 Gestionar Préstamos
                </button>
                <button onClick={onAbrirUsuarios} style={subBtnStyle}>
                  👥 Gestionar Usuarios
                </button>
                <button onClick={() => alert('Módulo de sanciones en desarrollo.')} style={subBtnStyle}>
                  ⚠️ Sanciones
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}

const sidebarStyle = { width: '240px', backgroundColor: '#393a3d', borderRight: '2px solid #1e293b', padding: '20px 16px', display: 'flex', flexDirection: 'column', minHeight: '100vh' };
const sectionHeader = { fontSize: '10px', color: '#eceef0', fontWeight: 'bold', marginBottom: '8px', fontFamily: "'Press Start 2P', monospace" };
const btnStyle = { width: '100%', textAlign: 'left', padding: '10px 12px', backgroundColor: 'transparent', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' };
const btnActive = { ...btnStyle, backgroundColor: '#fcfdff', color: '#ffffff' };
const subBtnStyle = { width: '100%', textAlign: 'left', padding: '8px 10px', backgroundColor: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };