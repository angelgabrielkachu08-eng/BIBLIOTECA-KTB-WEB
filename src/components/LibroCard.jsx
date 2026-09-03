export function LibroCard({ libro, onVerDetalle, esCompacto = false }) {
  // Detectar si es virtual según el texto o el id_tipo de la base de datos
  const esVirtual = 
    libro.tipo === 'Virtual' || 
    libro.tipo_libro === 'Virtual' || 
    libro.id_tipo === 5 || 
    libro.id_tipo === '5';

  // Buscar la imagen en los diferentes campos posibles
  const imagen = libro.imagen_portada || libro.imagen_url || libro.imagen || libro.portada || libro.portada_url;

  // Manejar el autor si viene como objeto o texto
  const nombreAutor = 
    typeof libro.autor === 'object' && libro.autor !== null 
      ? (libro.autor.nombre || 'Autor Desconocido') 
      : (libro.autor || libro.nombre_autor || 'Autor Desconocido');

  return (
    <div 
      style={esCompacto ? cardCompactaStyle : cardStyle} 
      onClick={() => onVerDetalle(libro)}
    >
      <div style={esCompacto ? containerImagenCompacta : containerImagen}>
        {imagen ? (
          <img src={imagen} alt={libro.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: esCompacto ? '24px' : '36px' }}>
            📚
          </div>
        )}
        <span style={esVirtual ? badgeVirtual : badgeFisico}>
          {esVirtual ? 'VIRTUAL' : 'FÍSICO'}
        </span>
      </div>

      <h4 style={esCompacto ? tituloCompacto : tituloStyle} title={libro.titulo}>
        {libro.titulo}
      </h4>
      <p style={autorStyle}>{nombreAutor}</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>STOCK:</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: esVirtual ? '#0284c7' : (libro.stock_disponible ?? libro.stock ?? 1) > 0 ? '#166534' : '#991b1b' }}>
          {esVirtual ? '∞ PDF' : (libro.stock_disponible ?? libro.stock ?? 0)}
        </span>
      </div>
    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  padding: '12px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  height: '100%'
};

const cardCompactaStyle = {
  ...cardStyle,
  padding: '10px',
};

const containerImagen = {
  position: 'relative',
  height: '160px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  marginBottom: '10px',
  overflow: 'hidden'
};

const containerImagenCompacta = {
  ...containerImagen,
  height: '120px',
};

const tituloStyle = {
  margin: '0 0 4px 0',
  fontSize: '13px',
  fontWeight: '700',
  color: '#0f172a',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const tituloCompacto = {
  ...tituloStyle,
  fontSize: '12px',
};

const autorStyle = {
  margin: '0 0 8px 0',
  fontSize: '11px',
  color: '#0284c7',
  fontWeight: '600',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const badgeFisico = {
  position: 'absolute',
  top: '6px',
  right: '6px',
  backgroundColor: '#f1f5f9',
  color: '#475569',
  fontSize: '9px',
  fontWeight: '700',
  padding: '3px 6px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1'
};

const badgeVirtual = {
  position: 'absolute',
  top: '6px',
  right: '6px',
  backgroundColor: '#d8b4fe',
  color: '#581c87',
  fontSize: '9px',
  fontWeight: '700',
  padding: '3px 6px',
  borderRadius: '6px',
  border: '1px solid #c084fc'
};