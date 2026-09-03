import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export const PanelUsuarios = ({ isOpen, onClose }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarUsuarios = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('usuarios').select('*, roles(nombre)').order('id_usuario');
        if (error) throw error;
        setUsuarios(data || []);
      } catch (err) {
        console.error('Error al cargar usuarios:', err.message);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) cargarUsuarios();
  }, [isOpen]);

  const cambiarRol = async (id_usuario, nuevoRol) => {
    try {
      const { error } = await supabase.from('usuarios').update({ id_rol: nuevoRol }).eq('id_usuario', id_usuario);
      if (error) throw error;
      alert('Rol actualizado correctamente');
      setUsuarios(prev => prev.map(u => u.id_usuario === id_usuario ? { ...u, id_rol: nuevoRol } : u));
    } catch (err) {
      alert('Error al cambiar rol: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3>👥 Administración de Usuarios</h3>
          <button onClick={onClose} style={styles.btnClose}>✕</button>
        </div>

        <div style={styles.body}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8' }}>Cargando lista...</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Rol Actual</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id_usuario}>
                    <td style={styles.td}>{u.id_usuario}</td>
                    <td style={styles.td}>{u.nombre} {u.apellido}</td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      <strong style={{ color: u.id_rol === 1 ? '#ef4444' : '#10b981' }}>
                        {u.id_rol === 1 ? 'Admin' : 'Usuario'}
                      </strong>
                    </td>
                    <td style={styles.td}>
                      {u.id_rol === 1 ? (
                        <button onClick={() => cambiarRol(u.id_usuario, 2)} style={styles.btnSecundary}>Hacer Usuario</button>
                      ) : (
                        <button onClick={() => cambiarRol(u.id_usuario, 1)} style={styles.btnPrimary}>Hacer Admin</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#1e293b', borderRadius: '12px', width: '90%', maxWidth: '750px', border: '1px solid #334155', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#0f172a', color: '#f8fafc', borderBottom: '1px solid #334155' },
  btnClose: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' },
  body: { padding: '20px', maxHeight: '70vh', overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' },
  th: { borderBottom: '1px solid #334155', padding: '10px', color: '#94a3b8' },
  td: { padding: '10px', borderBottom: '1px solid #1e293b', color: '#f8fafc' },
  btnPrimary: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  btnSecundary: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }
};