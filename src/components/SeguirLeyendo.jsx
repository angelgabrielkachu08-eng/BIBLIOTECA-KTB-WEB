import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import './SeguirLeyendo.css';

const isVirtual = (book) => /virtual|digital|pdf/i.test(String(book.tipo_libro || book.type || ''));

export default function SeguirLeyendo({ books = [], onSelect }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || books.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % books.length),
      5000
    );
    return () => window.clearInterval(timer);
  }, [paused, books.length]);

  const current = useMemo(() => books[index], [books, index]);
  if (!current) return null;

  const move = (step) =>
    setIndex((i) => (i + step + books.length) % books.length);

  const cover = current.cover || current.imagen_portada || current.imagen;

  return (
    <section
      className="sl-wrap"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* barra de progreso */}
      <div className="sl-progress">
        <span style={{ width: `${((index + 1) / books.length) * 100}%` }} />
      </div>

      <button className="sl-arrow sl-prev" onClick={() => move(-1)} aria-label="Anterior">
        <ChevronLeft />
      </button>

      <button className="sl-cover" onClick={() => onSelect(current)} aria-label={`Ver ${current.titulo}`}>
        {cover
          ? <img src={cover} alt={`Portada de ${current.titulo}`} />
          : <BookOpen />}
      </button>

      <div className="sl-copy">
        <p className="sl-eyebrow">SEGUIR LEYENDO</p>
        <h3 className="sl-title" onClick={() => onSelect(current)}>{current.titulo}</h3>
        <span className="sl-meta">
          {isVirtual(current) ? 'VIRTUAL' : 'FÍSICO'}
          {books.length > 1 && ` · ${index + 1} DE ${books.length}`}
        </span>
        {current.author || current.autor
          ? <p className="sl-author">{current.author || current.autor}</p>
          : null}
      </div>

      <button className="sl-arrow sl-next" onClick={() => move(1)} aria-label="Siguiente">
        <ChevronRight />
      </button>
    </section>
  );
}
