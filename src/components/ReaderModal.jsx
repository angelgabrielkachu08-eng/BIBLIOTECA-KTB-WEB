import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ePub from 'epubjs';
import { BookOpen, ChevronLeft, ChevronRight, Minus, Plus, Search, Settings, Type, X } from 'lucide-react';
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

  useEffect(() => {
    if (!isEpub || !epubHost.current) return undefined;
    let disposed = false;
    const reader = ePub(url);
    epubBook.current = reader;
    const display = reader.renderTo(epubHost.current, { width: '100%', height: '100%', spread: 'none', flow: 'scrolled' });
    rendition.current = display;
    display.themes.default({
      body: { color: colors.color, background: colors.background, 'font-family': font, 'font-size': `${fontSize}px`, 'line-height': '1.65' },
      p: { 'font-family': font, 'font-size': `${fontSize}px`, 'line-height': '1.65' },
    });
    display.on('relocated', (location) => setPage(location?.start?.displayed?.page || 1));
    display.on('selected', (cfiRange, contents) => {
      const text = contents?.window?.getSelection()?.toString()?.trim() || '';
      if (text) { setSelection(text); setMenuPoint({ x: 24, y: 88 }); }
      display.annotations.highlight(cfiRange, {}, () => {});
    });
    reader.ready.catch((err) => { if (!disposed) setError(err?.message || 'No se pudo abrir el EPUB.'); });
    display.display().catch((err) => { if (!disposed) setError(err?.message || 'No se pudo mostrar el EPUB.'); });
    return () => {
      disposed = true;
      display.destroy();
      reader.destroy();
      rendition.current = null;
      epubBook.current = null;
    };
  }, [url, isEpub]);

  useEffect(() => {
    if (!isEpub || !rendition.current) return;
    rendition.current.flow(readingMode === 'vertical' ? 'scrolled' : 'paginated');
  }, [isEpub, readingMode]);

  useEffect(() => {
    if (!isEpub || !rendition.current) return;
    rendition.current.themes.override('font-family', font);
    rendition.current.themes.fontSize(`${fontSize}px`);
    rendition.current.themes.override('background', colors.background, true);
    rendition.current.themes.override('color', colors.color, true);
  }, [isEpub, font, fontSize, colors]);

  const translate = () => {
    if (!selection) return;
    window.open(`https://translate.google.com/?sl=auto&tl=es&text=${encodeURIComponent(selection)}&op=translate`, '_blank', 'noopener,noreferrer');
    setMenuPoint(null);
  };
  const copy = async () => { await navigator.clipboard?.writeText(selection); setMenuPoint(null); };
  const changePage = (direction) => {
    if (isEpub) rendition.current?.[direction > 0 ? 'next' : 'prev']();
    else setPage((current) => Math.max(1, Math.min(pages, current + direction)));
  };

  useEffect(() => {
    if (!isEpub) document.querySelector('.pdf-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, isEpub]);

  return <div className="reader-backdrop" role="dialog" aria-modal="true" aria-label={`Lector de ${book.titulo}`} onMouseDown={onClose}>
    <section className="reader-shell" onMouseDown={(event) => event.stopPropagation()}>
      <header className="reader-head">
        <div className="reader-title"><BookOpen /><div><strong>{book.titulo}</strong><small>{isEpub ? 'Libro EPUB · lectura adaptable' : 'Documento PDF · diseño original'}</small></div></div>
        <button className="reader-close" onClick={onClose} aria-label="Cerrar lector"><X /></button>
      </header>
      <nav className="reader-tools" aria-label="Herramientas de lectura">
        <button onClick={() => changePage(-1)} title="Página anterior"><ChevronLeft /></button>
        <span>{page}{pages ? ` / ${pages}` : ''}</span>
        <button onClick={() => changePage(1)} title="Página siguiente"><ChevronRight /></button>
        <label title="Fondo de lectura"><span>Fondo</span><select value={theme} onChange={(event) => setTheme(event.target.value)}>{Object.keys(themes).map((name) => <option key={name}>{name}</option>)}</select></label>
        {isEpub ? <>
          <label title="Forma de lectura"><span>Lectura</span><select value={readingMode} onChange={(event) => setReadingMode(event.target.value)}><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></label>
          <label title="Tipografía"><Type size={16} /><select value={font} onChange={(event) => setFont(event.target.value)}>{['Georgia','Arial','Roboto','Verdana','serif','sans-serif'].map((name) => <option key={name}>{name}</option>)}</select></label>
          <button onClick={() => setFontSize((value) => Math.max(14, value - 1))} title="Reducir letra"><Minus /></button><span>{fontSize}px</span><button onClick={() => setFontSize((value) => Math.min(34, value + 1))} title="Aumentar letra"><Plus /></button>
        </> : <>
          <button onClick={() => setFontSize((value) => Math.max(0.75, value - 0.1))} title="Alejar PDF"><Minus /></button><span>{Math.round(fontSize * 100 / 18)}%</span><button onClick={() => setFontSize((value) => Math.min(2.5, value + 0.1))} title="Acercar PDF"><Plus /></button>
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
        {error ? <p className="reader-error">{error}</p> : isEpub ? <div className="epub-stage" ref={epubHost} /> : <Document file={url} onLoadSuccess={({ numPages }) => setPages(numPages)} onLoadError={(err) => setError(err.message)} loading={<p className="reader-loading">Cargando libro…</p>}>
          <div className="pdf-pages" style={{ filter: colors.filter }}><div className="pdf-page"><Page pageNumber={page} scale={fontSize / 18} renderTextLayer renderAnnotationLayer /></div></div>
        </Document>}
        {menuPoint && selection && <div className="reader-selection-menu" style={{ left: Math.max(8, Math.min(menuPoint.x, window.innerWidth - 230)), top: Math.max(8, Math.min(menuPoint.y, window.innerHeight - 90)) }}>
          <button onClick={translate}><Search size={15} /> Traducir en Google</button><button onClick={copy}>Copiar texto</button><button onClick={() => setMenuPoint(null)} aria-label="Cerrar opciones"><X size={14} /></button>
        </div>}
      </main>
      <footer className="reader-foot"><Settings size={14} /> EPUB {readingMode === 'vertical' ? '· Desliza hacia arriba o abajo para leer' : '· Desliza hacia los lados para cambiar de página'} · Selecciona una palabra para traducirla.</footer>
    </section>
  </div>;
}
