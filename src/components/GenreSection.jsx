import { useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';
import './GenreSection.css';

// Iconos por género (emoji como fallback universal)
const GENRE_ICONS = {
  'Ficción': '✦',
  'Fiction': '✦',
  'Misterio': '◈',
  'Mystery': '◈',
  'Romance': '◇',
  'Aventura': '◉',
  'Adventure': '◉',
  'Historia': '◎',
  'History': '◎',
  'Ciencia': '◐',
  'Ciencia ficción': '◐',
  'Sci-Fi': '◐',
  'Poesía': '◌',
  'Poetry': '◌',
  'Fantasía': '◈',
  'Fantasy': '◈',
  'Terror': '◆',
  'Horror': '◆',
  'Clásicos': '◉',
  'Classics': '◉',
  'Colección general': '◎',
};
const defaultIcon = '◇';

export default function GenreSection({ books = [], categories = [], onSelect, onGoCategory }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(null); // categoría seleccionada para highlight

  const handleGenre = (cat) => {
    setActive(cat);
    onGoCategory(cat);
  };

  if (!books.length) return null;

  // El carrusel muestra todos los libros mezclados (sin flechas, animación CSS)
  const items = books.length >= 3 ? [...books, ...books, ...books] : books;

  return (
    <section className="gs-section">
      {/* Encabezado */}
      <div className="gs-head">
        <p className="gs-eyebrow">EXPLORÁ LA COLECCIÓN</p>
        <h2 className="gs-title">Descubrí por géneros</h2>
      </div>

      {/* Carrusel sin flechas — animación CSS pura */}
      <div className="gs-viewport">
        <div className="gs-fade-left" />
        <div className="gs-fade-right" />
        <div className="gs-track" ref={trackRef}>
          {items.map((book, i) => {
            const src = book.cover || book.imagen_portada || book.imagen;
            const isVirtual = /virtual|digital|pdf/i.test(String(book.type || book.tipo_libro || ''));
            return (
              <button
                key={`${book.id_libro}-${i}`}
                className="gs-card"
                onClick={() => onSelect(book)}
              >
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

      {/* Chips de géneros */}
      {categories.length > 0 && (
        <div className="gs-genres">
          <p className="gs-genres-label">Ir al catálogo por género:</p>
          <div className="gs-chips">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`gs-chip${active === cat ? ' active' : ''}`}
                onClick={() => handleGenre(cat)}
              >
                <span className="gs-chip-icon">{GENRE_ICONS[cat] || defaultIcon}</span>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
