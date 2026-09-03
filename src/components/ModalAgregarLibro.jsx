import { useState } from 'react';

export const ModalAgregarLibro = ({ isOpen, onClose, onGuardar, categorias }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    autor: '',
    isbn: '',
    anio: '',
    id_categoria: '',
    id_tipo: '1', // Por defecto Físico (1) o el primero disponible
    stock: '1',
    imagen_portada: '',
    enlace_pdf: '',
    descripcion: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Empaquetamos los datos convirtiendo los IDs y números a formato numérico correcto
    const libroNuevo = {
      titulo: formData.titulo.trim(),
      autor: formData.autor.trim(),
      isbn: formData.isbn ? formData.isbn.trim() : null,
      anio_publicacion: formData.anio ? Number(formData.anio) : null,
      id_categoria: formData.id_categoria ? Number(formData.id_categoria) : null,
      id_tipo: Number(formData.id_tipo), // <-- Se envía como número limpio (1 o 5)
      stock: Number(formData.stock) || 0,
      imagen_portada: formData.imagen_portada.trim(),
      enlace_pdf: formData.enlace_pdf.trim(),
      descripcion: formData.descripcion.trim()
    };

    onGuardar(libroNuevo);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>Agregar Nuevo Libro</h3>
          <button onClick={onClose} style={styles.btnClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={{ ...styles.fieldGroup, flex: 2 }}>
              <label style={styles.label}>Título *</label>
              <input 
                type="text" 
                name="titulo" 
                required 
                value={formData.titulo} 
                onChange={handleChange} 
                style={styles.input} 
                placeholder="Título del libro"
              />
            </div>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Autor *</label>
              <input 
                type="text" 
                name="autor" 
                required 
                value={formData.autor} 
                onChange={handleChange} 
                style={styles.input} 
                placeholder="Nombre del autor"
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Categoría</label>
              <select 
                name="id_categoria" 
                value={formData.id_categoria} 
                onChange={handleChange} 
                style={styles.input}
              >
                <option value="">Seleccione una categoría</option>
                {categorias?.map(cat => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Modalidad (Tipo) *</label>
              <select 
                name="id_tipo" 
                value={formData.id_tipo} 
                onChange={handleChange} 
                style={styles.input}
              >
                <option value="1">Físico</option>
                <option value="5">Virtual (PDF)</option>
              </select>
            </div>
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>ISBN</label>
              <input 
                type="text" 
                name="isbn" 
                value={formData.isbn} 
                onChange={handleChange} 
                style={styles.input} 
                placeholder="Ej: 978-3-16-148410-0"
              />
            </div>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Año de Publicación</label>
              <input 
                type="number" 
                name="anio" 
                value={formData.anio} 
                onChange={handleChange} 
                style={styles.input} 
                placeholder="Ej: 2023"
              />
            </div>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Stock Inicial</label>
              <input 
                type="number" 
                name="stock" 
                min="0" 
                value={formData.stock} 
                onChange={handleChange} 
                style={styles.input} 
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>URL de la Imagen de Portada</label>
            <input 
              type="url" 
              name="imagen_portada" 
              value={formData.imagen_portada} 
              onChange={handleChange} 
              style={styles.input} 
              placeholder="https://ejemplo.com/portada.jpg"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Enlace PDF (Opcional)</label>
            <input 
              type="url" 
              name="enlace_pdf" 
              value={formData.enlace_pdf} 
              onChange={handleChange} 
              style={styles.input} 
              placeholder="https://ejemplo.com/libro.pdf"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Descripción / Sinopsis</label>
            <textarea 
              name="descripcion" 
              rows="3" 
              value={formData.descripcion} 
              onChange={handleChange} 
              style={{ ...styles.input, resize: 'vertical' }} 
              placeholder="Escribe una breve sinopsis..."
            />
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.btnCancelar}>
              Cancelar
            </button>
            <button type="submit" style={styles.btnGuardar}>
              Guardar Libro
            </button>
          </div>
        </form>
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
    maxWidth: '650px', 
    color: '#0f172a', 
    overflow: 'hidden', 
    maxHeight: '90vh', 
    display: 'flex', 
    flexDirection: 'column',
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
  form: { 
    padding: '24px', 
    overflowY: 'auto', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '16px' 
  },
  row: { 
    display: 'flex', 
    gap: '16px', 
    flexWrap: 'wrap' 
  },
  fieldGroup: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '6px' 
  },
  label: { 
    fontSize: '12px', 
    fontWeight: '600', 
    color: '#475569' 
  },
  input: { 
    backgroundColor: '#ffffff', 
    border: '1px solid #cbd5e1', 
    borderRadius: '8px', 
    padding: '10px 12px', 
    color: '#0f172a', 
    fontSize: '13px', 
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  actions: { 
    display: 'flex', 
    justifyContent: 'flex-end', 
    gap: '10px', 
    marginTop: '10px' 
  },
  btnCancelar: { 
    backgroundColor: 'transparent', 
    color: '#475569', 
    border: '1px solid #cbd5e1', 
    padding: '10px 16px', 
    borderRadius: '8px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    fontSize: '13px' 
  },
  btnGuardar: { 
    backgroundColor: '#1e3a8a', 
    color: '#fff', 
    border: 'none', 
    padding: '10px 16px', 
    borderRadius: '8px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    fontSize: '13px' 
  }
};