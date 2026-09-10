import { useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import './BookCarousel.css';

function Cover({ book }) {
  const isVirtual = /virtual|digital|pdf/i.test(String(book.type || book.tipo_libro || ''));
  const src = book.cover || book.imagen_portada || book.imagen;
  return (
    <div className="bc-cover">
      {src ? <img src={src} alt={`Portada de ${book.titulo}`} /> : <BookOpen />}
      <b>{isVirtual ? 'Virtual' : 'Físico'}</b>
    </div>
  );
}

export default function BookCarousel({
  eyebrow, title, books = [], onSelect,
  showRating = false, countByBook = {},
  onVerTodo = null,
  empty = 'No hay títulos disponibles.'
}) {
  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);

  const scrollBy = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector('.bc-card');
    const cardW = card ? card.offsetWidth + 14 : 200;
    track.scrollBy({ left: dir * cardW * 3, behavior: 'smooth' });
  };

  if (!books.length) {
    return (
      <section className="bc-section">
        <div className="bc-head">
          {eyebrow && <p className="bc-eyebrow">{eyebrow}</p>}
          <h2 className="bc-title">{title}</h2>
        </div>
        <p className="bc-empty">{empty}</p>
      </section>
    );
  }

  const items = books.length >= 3 ? [...books, ...books, ...books] : books;

  return (
    <section className="bc-section">
      <div className="bc-head">
        <div>
          {eyebrow && <p className="bc-eyebrow">{eyebrow}</p>}
          <h2 className="bc-title">{title}</h2>
        </div>
        {onVerTodo
          ? <button className="bc-ver-todo" onClick={onVerTodo}>
              Ver catálogo completo →
            </button>
          : <div className="bc-arrows">
              <button className="bc-arrow" onClick={() => scrollBy(-1)} aria-label="Anterior">
                <ChevronLeft size={18} />
              </button>
              <button className="bc-arrow" onClick={() => scrollBy(1)} aria-label="Siguiente">
                <ChevronRight size={18} />
              </button>
            </div>
        }
      </div>

      <div className="bc-viewport">
        <div className="bc-fade-left" />
        <div className="bc-fade-right" />
        <div
          className={`bc-track${paused ? ' bc-paused' : ''}`}
          ref={trackRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {items.map((book, i) => (
            <button
              key={`${book.id_libro}-${i}`}
              className="bc-card"
              onClick={() => onSelect(book)}
              tabIndex={0}
            >
              <Cover book={book} />
              <div className="bc-info">
                <span className="bc-category">{book.category || book.categoria || ''}</span>
                <h3 className="bc-titulo">{book.titulo}</h3>
                <p className="bc-author">{book.author || book.autor || ''}</p>
                {showRating && book.ratingCount > 0
                  ? <small className="bc-meta bc-rating">
                      <Star size={10} fill="currentColor" />
                      {book.average?.toFixed(1)} · {book.ratingCount}
                    </small>
                  : !showRating
                    ? <small className="bc-meta">{countByBook[book.id_libro] || 0} préstamos</small>
                    : null}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
