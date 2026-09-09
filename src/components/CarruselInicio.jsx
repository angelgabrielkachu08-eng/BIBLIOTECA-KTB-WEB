import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './CarruselInicio.css';

const virtual = (book) => /virtual|digital|pdf/i.test(String(book.tipo_libro || book.type || ''));

export default function CarruselInicio() {
  const [host, setHost] = useState(null), [books, setBooks] = useState([]), [index, setIndex] = useState(0), [paused, setPaused] = useState(false), [isReader, setIsReader] = useState(false);
  useEffect(() => {
    let observer; let hiddenMetric = null;
    const prepare = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // El carrusel es público: sólo se oculta para administradores.
      // Por eso los visitantes sin sesión también pueden descubrir los libros.
      let user = null;
      if (session?.user?.email) {
        const response = await supabase.from('usuarios').select('id_rol').eq('email', session.user.email).maybeSingle();
        user = response.data;
      }
      if (Number(user?.id_rol) === 1) return;
      setIsReader(true);
      const { data } = await supabase.from('libros').select('*'); setBooks(data || []);
      const attach = () => {
        const metric = document.querySelector('.metric-row');
        if (!metric || metric.dataset.readerCarousel === 'true') return;
        metric.dataset.readerCarousel = 'true'; metric.style.display = 'none'; hiddenMetric = metric;
        const nextHost = document.createElement('div'); nextHost.className = 'reader-carousel-host'; metric.insertAdjacentElement('afterend', nextHost); setHost(nextHost);
      };
      attach(); observer = new MutationObserver(attach); observer.observe(document.body, { childList: true, subtree: true });
    };
    prepare();
    return () => { observer?.disconnect(); if (hiddenMetric) { hiddenMetric.style.display = ''; delete hiddenMetric.dataset.readerCarousel; } };
  }, []);
  useEffect(() => { if (paused || books.length < 2) return undefined; const timer = window.setInterval(() => setIndex((current) => (current + 1) % books.length), 6500); return () => window.clearInterval(timer); }, [paused, books.length]);
  const current = useMemo(() => books[index], [books, index]);
  if (!isReader || !host || !current) return null;
  const image = current.imagen_portada || current.imagen;
  const pdf = current.archivo_pdf || current.pdf;
  const move = (step) => setIndex((currentIndex) => (currentIndex + step + books.length) % books.length);
  return createPortal(<section className="reader-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}><div className="reader-carousel-progress"><span style={{ width: `${((index + 1) / books.length) * 100}%` }} /></div><button className="carousel-arrow carousel-prev" onClick={() => move(-1)} aria-label="Libro anterior"><ChevronLeft /></button><div className="reader-carousel-cover">{image ? <img src={image} alt={`Portada de ${current.titulo}`} /> : <BookOpen />}</div><div className="reader-carousel-copy"><p>DESCUBRÍ LA COLECCIÓN</p><h2>{current.titulo}</h2><span>{virtual(current) ? 'LIBRO VIRTUAL' : 'LIBRO FÍSICO'} · {index + 1} DE {books.length}</span><div className="reader-carousel-description">{current.sinopsis || current.descripcion || 'Un título disponible en la colección de Biblioteca KTB.'}</div><div className="reader-carousel-actions">{virtual(current) && pdf ? <a className="primary-button" href={pdf} target="_blank" rel="noreferrer"><ExternalLink /> Leer online</a> : <span><BookOpen /> Disponible en biblioteca</span>}<small>{paused ? 'Carrusel en pausa' : 'La siguiente recomendación aparece en unos segundos'}</small></div></div><button className="carousel-arrow carousel-next" onClick={() => move(1)} aria-label="Libro siguiente"><ChevronRight /></button></section>, host);
}
