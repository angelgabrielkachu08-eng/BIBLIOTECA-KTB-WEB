import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './CustomSelect.css';

/**
 * CustomSelect — dropdown estilizado que reemplaza los <select> nativos.
 * Props:
 *   value      — valor seleccionado actualmente
 *   onChange   — callback (newValue) => void
 *   options    — array de strings o { value, label }
 *   placeholder — texto cuando no hay selección
 *   className  — clases extra para el trigger
 */
export default function CustomSelect({ value, onChange, options = [], placeholder = 'Seleccioná...', className = '', ariaLabel = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Normalizar opciones a { value, label }
  const normalized = options.map((o) => typeof o === 'string' ? { value: o, label: o } : o);
  const selected = normalized.find((o) => o.value === value);

  return (
    <div className={`csel-wrap${open ? ' csel-open' : ''}`} ref={ref} role="combobox" aria-expanded={open} aria-label={ariaLabel}>
      <button
        type="button"
        className={`csel-trigger ${className}`}
        onClick={() => setOpen((p) => !p)}
      >
        <span className={selected ? '' : 'csel-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className="csel-chevron" />
      </button>

      {open && (
        <ul className="csel-dropdown" role="listbox">
          {normalized.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`csel-option${o.value === value ? ' selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
