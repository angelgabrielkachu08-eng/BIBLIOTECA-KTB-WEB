export const ModalDetalleLibro = ({ libro, isOpen, onClose, usuarioActual, onReservar, onEliminar }) => {
  if (!isOpen || !libro) return null;

  const esAdmin = usuarioActual?.id_rol === 1;
  const disponible = (libro.stock_disponible ?? 1) > 0;

  // Detección blindada de la modalidad
  const esVirtual = 
    libro.id_tipo === 5 || 
    String(libro.id_tipo) === '5' || 
    libro.tipo === 'Virtual' || 
    libro.tipo_libro === 'Virtual' ||
    (libro.tipos_material && libro.tipos_material.nombre === 'Virtual');

  const modalidadTexto = esVirtual ? 'Virtual' : 'Físico';

  const anioMostrar = 
    (libro.anio_publicacion && libro.anio_publicacion !== 'N/A') ? libro.anio_publicacion :
    (libro.anio && libro.anio !== 'N/A') ? libro.anio : 'N/A';

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>Ficha del Libro</h3>
          <button onClick={onClose} style={styles.btnClose}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.leftCol}>
            <img 
              src={libro.imagen_portada || libro.imagen_url || libro.imagen || 'https://via.placeholder.com/200x280'} 
              alt={libro.titulo} 
              style={styles.image} 
            />
            <span style={disponible ? styles.badgeDisponible : styles.badgeAgotado}>
              {disponible ? `Stock: ${libro.stock_disponible ?? 1} unid.` : 'Agotado'}
            </span>
          </div>

          <div style={styles.rightCol}>
            <h2 style={styles.titulo}>{libro.titulo}</h2>
            <h4 style={styles.autor}>Por: {libro.autor || 'Autor no especificado'}</h4>

            {/* Metadatos en Grid Limpio */}
            <div style={styles.gridMeta}>
              <div><span style={styles.metaLabel}>Categoría:</span> <span style={styles.metaVal}>{libro.categoria || 'N/A'}</span></div>
              <div><span style={styles.metaLabel}>Año:</span> <span style={styles.metaVal}>{anioMostrar}</span></div>
              <div><span style={styles.metaLabel}>Modalidad:</span> <span style={styles.metaVal}>{modalidadTexto}</span></div>
              <div><span style={styles.metaLabel}>ISBN:</span> <span style={styles.metaVal}>{libro.isbn || 'N/A'}</span></div>
              <div><span style={styles.metaLabel}>Stock Total:</span> <span style={styles.metaVal}>{libro.stock ?? 'N/A'}</span></div>
            </div>

            {/* Sinopsis con Scrollbar Limpio */}
            <div style={styles.sinopsisContainer}>
              <span style={styles.sinopsisHeader}>Sinopsis:</span>
              <div style={styles.sinopsisScroll}>
                <p style={styles.sinopsisText}>
                  {libro.sinopsis || libro.descripcion || 'Este libro no posee una descripción cargada en el sistema.'}
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div style={styles.actions}>
              {usuarioActual && onReservar && (
                <button 
                  onClick={() => { onReservar(libro); onClose(); }}
                  disabled={!disponible}
                  style={disponible ? styles.btnReservar : styles.btnDisabled}
                >
                  ⚡ {disponible ? 'Reservar Libro' : 'Sin Stock'}
                </button>
              )}

              {esAdmin && onEliminar && (
                <button 
                  onClick={() => { onEliminar(libro.id_libro); onClose(); }}
                  style={styles.btnEliminar}
                >
                  🗑️ Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 1000, 
    padding: '16px', 
    backdropFilter: 'blur(6px)',
    animation: 'fadeIn 0.25s ease-out forwards'
  },
  modal: { 
    backgroundColor: '#ffffff', 
    border: '1px solid #e2e8f0', 
    borderRadius: '16px', 
    width: '100%', 
    maxWidth: '750px', 
    color: '#0f172a', 
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '18px 24px', 
    backgroundColor: '#f8fafc', 
    borderBottom: '1px solid #e2e8f0' 
  },
  headerTitle: { 
    margin: 0, 
    fontSize: '16px', 
    color: '#1e3a8a', 
    fontWeight: '700' 
  },
  btnClose: { 
    background: 'none', 
    border: 'none', 
    color: '#64748b', 
    fontSize: '18px', 
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  body: { 
    padding: '24px', 
    display: 'flex', 
    gap: '24px', 
    flexWrap: 'wrap' 
  },
  leftCol: { 
    flex: '0 0 180px', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    gap: '12px' 
  },
  image: { 
    width: '100%', 
    height: '240px', 
    objectFit: 'cover', 
    borderRadius: '10px', 
    border: '1px solid #e2e8f0' 
  },
  badgeDisponible: { 
    backgroundColor: '#dcfce7', 
    color: '#166534', 
    padding: '4px 10px', 
    borderRadius: '6px', 
    fontSize: '11px', 
    fontWeight: '700' 
  },
  badgeAgotado: { 
    backgroundColor: '#fee2e2', 
    color: '#991b1b', 
    padding: '4px 10px', 
    borderRadius: '6px', 
    fontSize: '11px', 
    fontWeight: '700' 
  },
  rightCol: { 
    flex: '1 1 320px', 
    display: 'flex', 
    flexDirection: 'column' 
  },
  titulo: { 
    margin: '0 0 4px 0', 
    fontSize: '20px', 
    fontWeight: '700', 
    color: '#0f172a' 
  },
  autor: { 
    margin: '0 0 16px 0', 
    fontSize: '13px', 
    color: '#0284c7', 
    fontWeight: '600'
  },
  gridMeta: { 
    display: 'grid', 
    gridTemplateColumns: '1fr 1fr', 
    gap: '8px 12px', 
    backgroundColor: '#f8fafc', 
    padding: '12px', 
    borderRadius: '8px', 
    border: '1px solid #e2e8f0', 
    marginBottom: '16px', 
    fontSize: '12px' 
  },
  metaLabel: { 
    color: '#64748b', 
    fontWeight: '600' 
  },
  metaVal: { 
    color: '#0f172a',
    fontWeight: '500'
  },
  sinopsisContainer: { 
    marginBottom: '20px' 
  },
  sinopsisHeader: { 
    fontSize: '12px', 
    color: '#475569', 
    fontWeight: '600', 
    display: 'block', 
    marginBottom: '6px' 
  },
  sinopsisScroll: { 
    maxHeight: '110px', 
    overflowY: 'auto', 
    backgroundColor: '#f8fafc', 
    padding: '12px', 
    borderRadius: '8px', 
    border: '1px solid #e2e8f0' 
  },
  sinopsisText: { 
    margin: 0, 
    fontSize: '13px', 
    color: '#334155', 
    lineHeight: '1.5' 
  },
  actions: { 
    marginTop: 'auto', 
    display: 'flex', 
    gap: '10px' 
  },
  btnReservar: { 
    flex: 1, 
    backgroundColor: '#1e3a8a', 
    color: '#fff', 
    border: 'none', 
    padding: '10px 16px', 
    borderRadius: '8px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    fontSize: '13px' 
  },
  btnDisabled: { 
    flex: 1, 
    backgroundColor: '#e2e8f0', 
    color: '#94a3b8', 
    border: 'none', 
    padding: '10px 16px', 
    borderRadius: '8px', 
    fontWeight: '600', 
    cursor: 'not-allowed', 
    fontSize: '13px' 
  },
  btnEliminar: { 
    backgroundColor: '#dc2626', 
    color: '#fff', 
    border: 'none', 
    padding: '10px 16px', 
    borderRadius: '8px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    fontSize: '13px' 
  }
};