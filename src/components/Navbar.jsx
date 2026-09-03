export const Navbar = ({ 
  usuarioActual, 
  setUsuarioActual, 
  onAbrirModalAgregar, 
  onAbrirPrestamos, 
  onAbrirUsuarios, 
  busqueda, 
  setBusqueda 
}) => {
  return (
    <header style={styles.navbar}>
      <div style={styles.brandGroup}>
        <div style={styles.logoBadge}>KTB</div>
        <div>
          <h1 style={styles.title}>Biblioteca Digital</h1>
          <span style={styles.subtext}>Sistema de Gestión e Intercambio</span>
        </div>
      </div>

      {/* Buscador Integrado */}
      <div style={styles.searchBox}>
        <input 
          type="text" 
          placeholder="🔍 Buscar por título..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Panel de Control y Simulación de Rol */}
      <div style={styles.userControls}>
        {usuarioActual?.id_rol === 1 && (
          <>
            <button onClick={onAbrirModalAgregar} style={styles.btnPrimary}>
              + Nuevo Libro
            </button>
            <button onClick={onAbrirPrestamos} style={styles.btnSecondary}>
              📋 Reservas
            </button>
            <button onClick={onAbrirUsuarios} style={styles.btnSecondary}>
              👥 Usuarios
            </button>
          </>
        )}

        <select 
          value={usuarioActual?.roleKey || ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'admin') setUsuarioActual({ id_usuario: 9, nombre: 'Gallardo', id_rol: 1, roleKey: 'admin' });
            else if (val === 'user') setUsuarioActual({ id_usuario: 10, nombre: 'Roberto', id_rol: 2, roleKey: 'user' });
            else setUsuarioActual(null);
          }}
          style={styles.selectRole}
        >
          <option value="">👤 Visitante (Invitado)</option>
          <option value="user">📗 Usuario Registrado</option>
          <option value="admin">⚡ Administrador</option>
        </select>
      </div>
    </header>
  );
};

const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 28px',
    backgroundColor: '#eeefef',
    borderBottom: '1px solid #35cd0b',
    gap: '20px',
    flexWrap: 'wrap'
  },
  brandGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoBadge: {
    backgroundColor: '#cad5e8',
    color: '#fff',
    fontWeight: '900',
    padding: '8px 12px',
    borderRadius: '10px',
    fontSize: '18px',
    letterSpacing: '1px'
  },
  title: { margin: 0, fontSize: '20px', color: '#f8fafc', fontWeight: '700' },
  subtext: { fontSize: '12px', color: '#64748b' },
  searchBox: { flex: 1, maxWidth: '400px' },
  searchInput: {
    width: '100%',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none'
  },
  userControls: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  btnPrimary: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px'
  },
  btnSecondary: {
    backgroundColor: '#334155',
    color: '#f8fafc',
    border: '1px solid #475569',
    padding: '10px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px'
  },
  selectRole: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    cursor: 'pointer',
    fontSize: '13px'
  }
};