import { useEffect, useRef, useState } from 'react';
import { BookOpen, Star, X } from 'lucide-react';
import './TopRatedSection.css';

function Stars({ value, count }) {
  return (
    <span className="trs-stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={14} fill={s <= Math.round(value) ? 'currentColor' : 'none'} strokeWidth={1.8} />
      ))}
      <b>{(Math.round(value * 10) / 10).toFixed(1)}</b>
      {count > 0 && <small>· {count} reseña{count !== 1 ? 's' : ''}</small>}
    </span>
  );
}

function CatalogModal({ books, onClose, onSelect }) {
  return (
    <div className="trs-modal-backdrop" onMouseDown={onClose}>
      <section className="trs-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="trs-modal-head">
          <div>
            <p className="trs-eyebrow">SELECCIÓN DE LECTORES</p>
            <h2>Mejor calificados</h2>
            <p className="trs-modal-sub">Ordenados de mayor a menor valoración</p>
          </div>
          <button className="trs-close" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="trs-modal-list">
          {books.map((book, i) => {
            const src = book.cover || book.imagen_portada || book.imagen;
            return (
              <button key={book.id_libro} className="trs-modal-item" onClick={() => { onSelect(book); onClose(); }}>
                <span className="trs-rank">#{i + 1}</span>
                <div className="trs-modal-cover">
                  {src ? <img src={src} alt={book.titulo} /> : <BookOpen size={20} />}
                </div>
                <div className="trs-modal-info">
                  <span className="trs-category">{book.category}</span>
                  <h3>{book.titulo}</h3>
                  <p className="trs-author-sm">{book.author}</p>
                  <Stars value={book.average} count={book.ratingCount} />
                  {(book.sinopsis || book.descripcion) && (
                    <p className="trs-synopsis-short">
                      {(book.sinopsis || book.descripcion).slice(0, 130)}
                      {(book.sinopsis || book.descripcion).length > 130 ? '…' : ''}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
          {!books.length && <p className="trs-empty">Todavía no hay libros con valoraciones.</p>}
        </div>
      </section>
    </div>
  );
}

export default function TopRatedSection({ books = [], topRated = [], onSelect }) {
  const [index, setIndex] = useState(0);
  const [animClass, setAnimClass] = useState('trs-in');
  const [showAll, setShowAll] = useState(false);
  const prevIndex = useRef(0);

  const allRated = [...books]
    .filter((b) => b.ratingCount > 0)
    .sort((a, b) => b.average - a.average || b.ratingCount - a.ratingCount);

  // Usa los top calificados con valoración ≥ 1 (máximo 8)
  const deck = allRated.slice(0, 8);

  const goTo = (next) => {
    if (next === index || deck.length < 2) return;
    prevIndex.current = index;
    setAnimClass('trs-out');
    setTimeout(() => {
      setIndex(next);
      setAnimClass('trs-in');
    }, 260);
  };

  const next = () => goTo((index + 1) % deck.length);
  const prev = () => goTo((index - 1 + deck.length) % deck.length);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (deck.length === 0) return null;

  const book = deck[index];
  const src = book.cover || book.imagen_portada || book.imagen;
  const synopsis = book.sinopsis || book.descripcion || '';

  return (
    <section className="trs-section">
      {/* Encabezado */}
      <div className="trs-head">
        <div>
          <p className="trs-eyebrow">SELECCIÓN DE LECTORES</p>
          <h2 className="trs-title">Mejor calificados</h2>
        </div>
        <button className="trs-ver-todo" onClick={() => setShowAll(true)}>
          Ver todo <Star size={11} fill="currentColor" />
        </button>
      </div>

      {/* Stage */}
      <div className="trs-stage">

        {/* Cartas apiladas decorativas detrás */}
        <div className="trs-stack-bg trs-stack-2" />
        <div className="trs-stack-bg trs-stack-1" />

        {/* Carta principal */}
        <div className={`trs-card ${animClass}`} onClick={next} title="Click para ver el siguiente">
          {/* Portada */}
          <div className="trs-card-cover">
            {src
              ? <img src={src} alt={`Portada de ${book.titulo}`} />
              : <BookOpen size={40} />}
            <div className="trs-card-cover-overlay" />
          </div>

          {/* Info */}
          <div className="trs-card-content">
            {/* Badge ranking */}
            <span className="trs-badge">#{index + 1} · {book.type === 'Virtual' ? 'Virtual' : 'Físico'}</span>

            <span className="trs-category">{book.category}</span>
            <h3 className="trs-book-title">{book.titulo}</h3>
            <p className="trs-author">{book.author}</p>
            <Stars value={book.average} count={book.ratingCount} />

            {synopsis && (
              <p className="trs-synopsis">
                {synopsis.slice(0, 220)}{synopsis.length > 220 ? '…' : ''}
              </p>
            )}

            <button
              className="trs-ficha-btn"
              onClick={(e) => { e.stopPropagation(); onSelect(book); }}
            >
              Ver ficha completa
            </button>
          </div>

          {/* Hint de click */}
          <span className="trs-hint">click para siguiente</span>
        </div>

        {/* Flechas laterales */}
        {deck.length > 1 && (
          <>
            <button className="trs-arrow trs-arrow-left" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Anterior">‹</button>
            <button className="trs-arrow trs-arrow-right" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Siguiente">›</button>
          </>
        )}
      </div>

      {/* Puntos de navegación */}
      {deck.length > 1 && (
        <div className="trs-dots">
          {deck.map((_, i) => (
            <button
              key={i}
              className={`trs-dot${i === index ? ' active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Libro ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Contador */}
      <p className="trs-counter">{index + 1} / {deck.length}</p>

      {/* Modal ver todo */}
      {showAll && (
        <CatalogModal
          books={allRated}
          onClose={() => setShowAll(false)}
          onSelect={onSelect}
        />
      )}
    </section>
  );
}
