import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export const PanelPrestamos = ({ isOpen, onClose }) => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarReservas = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('reservas')
          .select(`
            id_reserva,
            fecha_reserva,
            estado,
            id_libro,
            id_usuario,
            libros (titulo, stock_disponible),
            usuarios (nombre, apellido, email)
          `)
          .order('id_reserva', { ascending: false });

        if (error) throw error;
        setReservas(data || []);
      } catch (err) {
        console.error('Error al cargar reservas:', err.message);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) cargarReservas();
  }, [isOpen]);

  const handleAprobarReserva = async (reserva) => {
    try {
      const { error: errReserva } = await supabase
        .from('reservas')
        .update({ estado: 'Aprobada' })
        .eq('id_reserva', reserva.id_reserva);

      if (errReserva) throw errReserva;

      // Reemplazá estas dos líneas:
// const fechaHoy = new Date().toISOString().split('T')[0];
// const fechaLimite = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

// Por estas:
        const hoy = new Date();
        const limite = new Date();
        limite.setDate(hoy.getDate() + 7);

        const fechaHoy = hoy.toISOString().split('T')[0];
        const fechaLimite = limite.toISOString().split('T')[0];

      const { error: errPrestamo } = await supabase.from('prestamos').insert([
        {
          id_usuario: reserva.id_usuario,
          fecha_prestamo: fechaHoy,
          fecha_limite: fechaLimite,
          estado: 'activo'
        }
      ]);

      if (errPrestamo) throw errPrestamo;

      const nuevoStock = Math.max(0, (reserva.libros?.stock_disponible || 1) - 1);
      await supabase
        .from('libros')
        .update({ stock_disponible: nuevoStock })
        .eq('id_libro', reserva.id_libro);

      alert('¡Préstamo aprobado y registrado con éxito!');
      
      // Actualiza la lista en vivo
      setReservas(prev => prev.map(r => r.id_reserva === reserva.id_reserva ? { ...r, estado: 'Aprobada' } : r));
    } catch (err) {
      alert('Error al procesar préstamo: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3>📋 Gestión de Reservas y Préstamos</h3>
          <button onClick={onClose} style={styles.btnClose}>✕</button>
        </div>

        <div style={styles.body}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8' }}>Cargando solicitudes...</p>
          ) : reservas.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8' }}>No hay solicitudes de reserva registradas.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Usuario</th>
                  <th style={styles.th}>Libro</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((r) => (
                  <tr key={r.id_reserva} style={styles.tr}>
                    <td style={styles.td}>{r.usuarios?.nombre || 'Usuario'} ({r.usuarios?.email})</td>
                    <td style={styles.td}>{r.libros?.titulo || 'Libro'}</td>
                    <td style={styles.td}>{r.fecha_reserva}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                        backgroundColor: r.estado === 'Aprobada' ? '#064e3b' : '#78350f',
                        color: r.estado === 'Aprobada' ? '#6ee7b7' : '#fde047'
                      }}>
                        {r.estado || 'Pendiente'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {r.estado !== 'Aprobada' && (
                        <button 
                          onClick={() => handleAprobarReserva(r)}
                          style={styles.btnAprobar}
                        >
                          Aprobar y Prestar
                        </button>
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
  modal: { backgroundColor: '#1e293b', borderRadius: '12px', width: '90%', maxWidth: '800px', border: '1px solid #334155', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#0f172a', color: '#f8fafc', borderBottom: '1px solid #334155' },
  btnClose: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' },
  body: { padding: '20px', maxHeight: '70vh', overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' },
  th: { borderBottom: '1px solid #334155', padding: '10px', color: '#94a3b8' },
  td: { padding: '10px', borderBottom: '1px solid #1e293b', color: '#f8fafc' },
  tr: { backgroundColor: '#0f172a' },
  btnAprobar: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }
};