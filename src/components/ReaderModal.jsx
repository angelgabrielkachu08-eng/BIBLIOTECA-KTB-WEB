import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ePub from 'epubjs';
import { BookOpen, ChevronLeft, ChevronRight, Minus, Plus, Search, Settings, Type, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './ReaderModal.css';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const themes = {
  Día: { background: '#f5ebd8', color: '#2b2020', filter: 'none' },
  Noche: { background: '#171416', color: '#f4eadc', filter: 'invert(1) hue-rotate(180deg)' },
  Sepia: { background: '#e7d2a8', color: '#36281b', filter: 'sepia(.42)' },
  Vino: { background: '#35101b', color: '#f6e9d4', filter: 'sepia(.22) saturate(.78)' },
};

export default function ReaderModal({ book, onClose }) {
  const url = book.archivo_pdf || book.pdf || '';
  const isEpub = useMemo(() => {
    try { return new URL(url, window.location.href).pathname.toLowerCase().endsWith('.epub'); }
    catch { return false; }
  }, [url]);
  const epubHost = useRef(null);
  const epubBook = useRef(null);
  const rendition = useRef(null);
  const readingModeRef = useRef(readingMode);
  const [theme, setTheme] = useState('Día');
  const [font, setFont] = useState('Georgia');
  const [fontSize, setFontSize] = useState(18);
  const [readingMode, setReadingMode] = useState('vertical');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [selection, setSelection] = useState('');
  const [menuPoint, setMenuPoint] = useState(null);
  const [error, setError] = useState('');
  const colors = themes[theme];
  const pdfPageWidth = readingMode === 'horizontal'
    ? Math.max(280, Math.min(760, window.innerHeight * .68 * .707, window.innerWidth - 20))
    : Math.max(280, Math.min(860, window.innerWidth - (window.innerWidth < 700 ? 20 : 84)));

  useEffect(() => { readingModeRef.current = readingMode; }, [readingMode]);

  useEffect(() => {
    if (!isEpub || !epubHost.current) return undefined;
    let disposed = false;
    const reader = ePub(url);
    epubBook.current = reader;
    const display = reader.renderTo(epubHost.current, { width: '100%', height: '100%', spread: 'none', flow: 'scrolled' });
    rendition.current = display;
    const gestureCleanup = [];
    display.themes.default({
      body: { color: colors.color, background: colors.background, 'font-family': `${font} !important`, 'font-size': `${fontSize}px`, 'line-height': '1.65' },
      '*': { 'font-family': `${font} !important` },
      p: { 'font-family': `${font} !important`, 'font-size': `${fontSize}px`, 'line-height': '1.65' },
    });
    display.on('relocated', (location) => setPage(location?.start?.displayed?.page || 1));
    display.on('selected', (cfiRange, contents) => {
      const text = contents?.window?.getSelection()?.toString()?.trim() || '';
      if (text) { setSelection(text); setMenuPoint({ x: 24, y: 88 }); }
      display.annotations.highlight(cfiRange, {}, () => {});
    });
    display.on('rendered', (_section, view) => {
      const doc = view?.contents?.document || view?.document;
      if (!doc) return;
      const touchAction = readingModeRef.current === 'horizontal' ? 'pan-x' : 'pan-y';
      if (doc.documentElement) doc.documentElement.style.touchAction = touchAction;
      if (doc.body) doc.body.style.touchAction = touchAction;
      let startX = null;
      const onTouchStart = (event) => { startX = event.changedTouches?.[0]?.clientX ?? null; };
      const onTouchEnd = (event) => {
        const endX = event.changedTouches?.[0]?.clientX;
        if (startX == null || endX == null || readingModeRef.current !== 'horizontal' || doc.getSelection()?.toString()) return;
        const delta = endX - startX;
        if (Math.abs(delta) > 32) display[delta < 0 ? 'next' : 'prev']();
        startX = null;
      };
      doc.addEventListener('touchstart', onTouchStart, { passive: true });
      doc.addEventListener('touchend', onTouchEnd, { passive: true });
      gestureCleanup.push(() => {
        doc.removeEventListener('touchstart', onTouchStart);
        doc.removeEventListener('touchend', onTouchEnd);
      });
    });
    reader.ready.catch((err) => { if (!disposed) setError(err?.message || 'No se pudo abrir el EPUB.'); });
    display.display().catch((err) => { if (!disposed) setError(err?.message || 'No se pudo mostrar el EPUB.'); });
    return () => {
      disposed = true;
      gestureCleanup.forEach((remove) => remove());
      display.destroy();
      reader.destroy();
      rendition.current = null;
      epubBook.current = null;
    };
  }, [url, isEpub]);

  useEffect(() => {
    if (!isEpub || !rendition.current) return;
    rendition.current.flow(readingMode === 'vertical' ? 'scrolled' : 'paginated');
    const touchAction = readingMode === 'horizontal' ? 'pan-x' : 'pan-y';
    rendition.current.getContents().forEach((contents) => {
      if (contents.document?.documentElement) contents.document.documentElement.style.touchAction = touchAction;
      if (contents.document?.body) contents.document.body.style.touchAction = touchAction;
    });
  }, [isEpub, readingMode]);

  useEffect(() => {
    if (!isEpub || !rendition.current) return;
    rendition.current.themes.default({
      body: { color: colors.color, background: colors.background, 'font-family': `${font} !important`, 'font-size': `${fontSize}px`, 'line-height': '1.65' },
      '*': { 'font-family': `${font} !important` },
      p: { 'font-family': `${font} !important`, 'font-size': `${fontSize}px`, 'line-height': '1.65' },
    });
    rendition.current.themes.fontSize(`${fontSize}px`);
    rendition.current.themes.override('background', colors.background, true);
    rendition.current.themes.override('color', colors.color, true);
  }, [isEpub, font, fontSize, colors]);

  const saveReaderNote = async (type) => {
    const content = selection.trim();
    if (!content) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Iniciá sesión para guardar palabras y citas.'); return; }
    const { error: saveError } = await supabase.from('lector_notas').insert({
      owner_uid: user.id,
      tipo: type,
      contenido: content,
      palabra: type === 'diccionario' ? content : null,
      id_libro: book.id_libro == null ? null : String(book.id_libro),
      libro_titulo: book.titulo || 'Libro',
      libro_autor: book.author || book.autor || null,
      libro_portada: book.cover || book.imagen_portada || book.imagen || null,
    });
    if (saveError) { setError(`No se pudo guardar: ${saveError.message}`); return; }
    setMenuPoint(null);
    if (type === 'diccionario') {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(`significado de ${content}`)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    setSelection('');
    window.getSelection()?.removeAllRanges();
  };
  const copy = async () => { await navigator.clipboard?.writeText(selection); setMenuPoint(null); };
  const changePage = (direction) => rendition.current?.[direction > 0 ? 'next' : 'prev']();
  const handlePdfScroll = (event) => {
    const container = event.currentTarget;
    const horizontal = readingMode === 'horizontal';
    const center = horizontal ? container.scrollLeft + container.clientWidth / 2 : container.scrollTop + container.clientHeight / 2;
    const pageNodes = [...container.querySelectorAll('[data-pdf-page]')];
    let closest = 1;
    let distance = Infinity;
    pageNodes.forEach((node, index) => {
      const start = horizontal ? node.offsetLeft : node.offsetTop;
      const extent = horizontal ? node.offsetWidth : node.offsetHeight;
      const delta = Math.abs(start + extent / 2 - center);
      if (delta < distance) { closest = index + 1; distance = delta; }
    });
    setPage((current) => current === closest ? current : closest);
  };

  return <div className="reader-backdrop" role="dialog" aria-modal="true" aria-label={`Lector de ${book.titulo}`} onMouseDown={onClose}>
    <section className="reader-shell" onMouseDown={(event) => event.stopPropagation()}>
      <header className="reader-head">
        <div className="reader-title"><BookOpen /><div><strong>{book.titulo}</strong><small>{isEpub ? 'Libro EPUB · lectura adaptable' : 'Documento PDF · diseño original'}</small></div></div>
        <button className="reader-close" onClick={onClose} aria-label="Cerrar lector"><X /></button>
      </header>
      <nav className="reader-tools" aria-label="Herramientas de lectura">
        {isEpub && <button onClick={() => changePage(-1)} title="Página anterior"><ChevronLeft /></button>}
        <span>{isEpub ? page : `${page}${pages ? ` / ${pages}` : ''}`}</span>
        {isEpub && <button onClick={() => changePage(1)} title="Página siguiente"><ChevronRight /></button>}
        <label title="Fondo de lectura"><span>Fondo</span><select value={theme} onChange={(event) => setTheme(event.target.value)}>{Object.keys(themes).map((name) => <option key={name}>{name}</option>)}</select></label>
        <label title="Forma de lectura"><span>Desplazamiento</span><select value={readingMode} onChange={(event) => setReadingMode(event.target.value)}><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></label>
        {isEpub ? <>
          <label title="Tipografía"><Type size={16} /><select value={font} onChange={(event) => setFont(event.target.value)}>{['Georgia','Arial','Roboto','Verdana','serif','sans-serif'].map((name) => <option key={name}>{name}</option>)}</select></label>
          <button onClick={() => setFontSize((value) => Math.max(14, value - 1))} title="Reducir letra"><Minus /></button><span>{fontSize}px</span><button onClick={() => setFontSize((value) => Math.min(34, value + 1))} title="Aumentar letra"><Plus /></button>
        </> : <>
          <span className="reader-fixed-font">El PDF conserva su tipografía</span>
        </>}
      </nav>
      <main className={`reader-content ${isEpub ? `epub-content epub-${readingMode}` : 'pdf-content'}`} style={{ '--reader-background': colors.background, '--reader-color': colors.color }} onContextMenu={(event) => {
        const text = window.getSelection()?.toString()?.trim();
        if (text) { event.preventDefault(); setSelection(text); setMenuPoint({ x: event.clientX, y: event.clientY }); }
      }} onMouseUp={(event) => {
        window.setTimeout(() => {
          const text = window.getSelection()?.toString()?.trim();
          if (text) { setSelection(text); setMenuPoint({ x: event.clientX, y: event.clientY }); }
        }, 0);
      }}>
        {error ? <p className="reader-error">{error}</p> : isEpub ? <div className="epub-stage" ref={epubHost} /> : <Document file={url} onLoadSuccess={({ numPages }) => { setPages(numPages); setPage(1); }} onLoadError={(err) => setError(err.message)} loading={<p className="reader-loading">Cargando libro…</p>}>
          <div className={`pdf-pages ${readingMode === 'horizontal' ? 'pdf-horizontal' : 'pdf-vertical'}`} style={{ filter: colors.filter }} onScroll={handlePdfScroll}>
            {Array.from({ length: pages }, (_, index) => <LazyPdfPage key={index + 1} pageNumber={index + 1} width={pdfPageWidth} />)}
          </div>
        </Document>}
        {menuPoint && selection && <div className="reader-selection-menu" style={{ left: Math.max(8, Math.min(menuPoint.x, window.innerWidth - 436)), top: Math.max(8, Math.min(menuPoint.y, window.innerHeight - 130)) }}>
          <button onClick={() => saveReaderNote('diccionario')}><Search size={15} /> Diccionario</button><button onClick={() => saveReaderNote('cita')}>Citar</button><button onClick={copy}>Copiar texto</button><button onClick={() => setMenuPoint(null)} aria-label="Cerrar opciones"><X size={14} /></button>
        </div>}
      </main>
      <footer className="reader-foot"><Settings size={14} /> {isEpub ? 'EPUB' : 'PDF'} · Desliza {readingMode === 'vertical' ? 'hacia arriba o abajo' : 'hacia los lados'} para leer · Selecciona una palabra para consultar su significado o una frase para citar.</footer>
    </section>
  </div>;
}

function LazyPdfPage({ pageNumber, width }) {
  const pageRef = useRef(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  useEffect(() => {
    const node = pageRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '900px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={pageRef} className="pdf-page" data-pdf-page><div className="pdf-page-placeholder" style={{ width, height: width * 1.42 }}>{visible && <Page pageNumber={pageNumber} width={width} renderTextLayer renderAnnotationLayer />}</div></div>;
}
