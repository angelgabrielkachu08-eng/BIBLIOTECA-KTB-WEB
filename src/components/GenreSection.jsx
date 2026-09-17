import { useRef, useState } from 'react';
import { BookOpen, Star, X } from 'lucide-react';
import './GenreSection.css';

const GENRE_ICONS = {
  'Ficción': '✦', 'Fiction': '✦',
  'Misterio': '◈', 'Mystery': '◈',
  'Romance': '◇', 'Aventura': '◉', 'Adventure': '◉',
  'Historia': '◎', 'History': '◎',
  'Ciencia': '◐', 'Ciencia ficción': '◐', 'Sci-Fi': '◐',
  'Poesía': '◌', 'Poetry': '◌',
  'Fantasía': '◈', 'Fantasy': '◈',
  'Terror': '◆', 'Horror': '◆',
  'Clásicos': '◉', 'Classics': '◉',
  'Colección general': '◎',
  'Aventuras': '◉',
  'Novela corta': '◇',
  'Histórico': '◎',
  'Romance gótico': '◇',
  'Poema épico': '◌',
  'Fábula Filosófica': '◐',
};
const defaultIcon = '◇';

/* ── Modal de libros por género ─────────────────────────── */
function GenreModal({ cat, books, onClose, onSelect }) {
  const genreBooks = books.filter((b) => b.category === cat);
  return (
    <div className="gs-modal-backdrop" onMouseDown={onClose}>
      <section className="gs-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="gs-modal-head">
          <div>
            <p className="gs-modal-eyebrow">GÉNERO</p>
            <h2 className="gs-modal-title">
              <span className="gs-modal-icon">{GENRE_ICONS[cat] || defaultIcon}</span>
              {cat}
            </h2>
            <p className="gs-modal-sub">{genreBooks.length} título{genreBooks.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="gs-modal-close" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="gs-modal-list">
          {genreBooks.length === 0 && <p className="gs-modal-empty">No hay libros en este género.</p>}
          {genreBooks.map((book) => {
            const src = book.cover || book.imagen_portada || book.imagen;
            const isVirtual = /virtual|digital|pdf/i.test(String(book.type || book.tipo_libro || ''));
            return (
              <button key={book.id_libro} className="gs-modal-item" onClick={() => { onSelect(book); onClose(); }}>
                <div className="gs-modal-cover">
                  {src ? <img src={src} alt={book.titulo} /> : <BookOpen size={18} />}
                  <b>{isVirtual ? 'V' : 'F'}</b>
                </div>
                <div className="gs-modal-info">
                  <h3 className="gs-modal-book-title">{book.titulo}</h3>
                  <p className="gs-modal-author">{book.author || ''}</p>
                  {book.ratingCount > 0 && (
                    <span className="gs-modal-rating">
                      <Star size={10} fill="currentColor" /> {book.average?.toFixed(1)} · {book.ratingCount}
                    </span>
                  )}
                  {book.sinopsis && <p className="gs-modal-synopsis">{book.sinopsis.slice(0, 100)}{book.sinopsis.length > 100 ? '…' : ''}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function GenreSection({ books = [], categories = [], onSelect }) {
  const trackRef = useRef(null);
  const [activeModal, setActiveModal] = useState(null);

  if (!books.length) return null;

  const items = books.length >= 3 ? [...books, ...books, ...books] : books;

  return (
    <section className="gs-section">
      <div className="gs-head">
        <p className="gs-eyebrow">EXPLORÁ LA COLECCIÓN</p>
        <h2 className="gs-title">Descubrí por géneros</h2>
      </div>

      {/* Carrusel animado */}
      <div className="gs-viewport">
        <div className="gs-fade-left" />
        <div className="gs-fade-right" />
        <div className="gs-track" ref={trackRef}>
          {items.map((book, i) => {
            const src = book.cover || book.imagen_portada || book.imagen;
            const isVirtual = /virtual|digital|pdf/i.test(String(book.type || book.tipo_libro || ''));
            return (
              <button key={`${book.id_libro}-${i}`} className="gs-card" onClick={() => onSelect(book)}>
                <div className="gs-cover">
                  {src ? <img src={src} alt={book.titulo} /> : <BookOpen />}
                  <b>{isVirtual ? 'Virtual' : 'Físico'}</b>
                </div>
                <div className="gs-info">
                  <span className="gs-cat">{book.category || ''}</span>
                  <h3 className="gs-titulo">{book.titulo}</h3>
                  <p className="gs-author">{book.author || ''}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chips de géneros — abren modal */}
      {categories.length > 0 && (
        <div className="gs-genres">
          <p className="gs-genres-label">Explorá por género:</p>
          <div className="gs-chips">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`gs-chip${activeModal === cat ? ' active' : ''}`}
                onClick={() => setActiveModal(cat)}
              >
                <span className="gs-chip-icon">{GENRE_ICONS[cat] || defaultIcon}</span>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal del género */}
      {activeModal && (
        <GenreModal
          cat={activeModal}
          books={books}
          onClose={() => setActiveModal(null)}
          onSelect={onSelect}
        />
      )}
    </section>
  );
}
