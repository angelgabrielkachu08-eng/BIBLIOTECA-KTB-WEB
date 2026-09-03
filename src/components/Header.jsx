import { supabase } from '../supabaseClient';

export function Header({ busqueda, setBusqueda, usuario, perfilBD }) {
  const handleLoginGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    if (error) console.error('Error al iniciar sesión:', error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header style={headerStyle}>
      {/* Buscador Estilizado */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Buscar libro..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Nombre de la Biblioteca Centrado */}
      <div style={{ flex: 2, textAlign: 'center' }}>
        <h1 style={titleStyle}>
          📖 BIBLIOTECA VIRTUAL
        </h1>
      </div>

      {/* Perfil / Botón Login */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px' }}>
        {usuario ? (
          <>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', display: 'block' }}>
                {usuario.user_metadata?.full_name || usuario.email}
              </span>
              <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>
                {perfilBD?.id_rol === 1 ? '👑 ADMIN' : '🎓 USER'}
              </span>
            </div>
            <button onClick={handleLogout} style={btnLogoutStyle}>
              SALIR
            </button>
          </>
        ) : (
          <button onClick={handleLoginGoogle} style={btnLoginStyle}>
            🌐 LOGIN GOOGLE
          </button>
        )}
      </div>
    </header>
  );
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 28px',
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
};

const titleStyle = {
  margin: 0,
  fontSize: '18px',
  fontWeight: '700',
  color: '#1e3a8a',
  letterSpacing: '0.5px'
};

const inputStyle = {
  width: '240px',
  padding: '9px 14px',
  backgroundColor: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  color: '#0f172a',
  fontSize: '13px',
  outline: 'none',
  transition: 'border-color 0.2s'
};

const btnLoginStyle = {
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  padding: '9px 14px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '600',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  transition: 'background-color 0.2s'
};

const btnLogoutStyle = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
  border: 'none',
  padding: '9px 14px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '600',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  transition: 'background-color 0.2s'
};