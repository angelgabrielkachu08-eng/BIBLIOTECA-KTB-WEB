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
  const pdfFrame = useRef(0);
  const pdfScrollTimer = useRef(0);
  const pdfRatioRef = useRef(1.414);
  const pdfContainer = useRef(null);
  const [theme, setTheme] = useState('Día');
  const [font, setFont] = useState('Georgia');
  const [fontSize, setFontSize] = useState(18);
  const [readingMode, setReadingMode] = useState('vertical');
  const readingModeRef = useRef(readingMode);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [pdfPageRatio, setPdfPageRatio] = useState(1.414);
  const [selection, setSelection] = useState('');
  const [menuPoint, setMenuPoint] = useState(null);
  const [error, setError] = useState('');
  const [epubLoading, setEpubLoading] = useState(true);
  const colors = themes[theme];
  const pdfPageWidth = readingMode === 'horizontal'
    ? Math.max(280, Math.min(760, window.innerHeight * .68 * .707, window.innerWidth - 20))
    : Math.max(280, Math.min(860, window.innerWidth - (window.innerWidth < 700 ? 20 : 84)));

  useEffect(() => { readingModeRef.current = readingMode; }, [readingMode]);

  useEffect(() => {
    if (!isEpub || !epubHost.current) return undefined;
    let disposed = false;
    setEpubLoading(true);
    setError('');
    const controller = new AbortController();
    let reader;
    let display;
    const loadTimeout = window.setTimeout(() => controller.abort(), 20000);
    const initialize = async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Supabase respondió con HTTP ${response.status} al descargar el EPUB.`);
        const archive = await response.arrayBuffer();
        if (disposed) return;
        reader = ePub(archive);
        epubBook.current = reader;
        display = reader.renderTo(epubHost.current, { width: '100%', height: '100%', spread: 'none', flow: readingMode === 'vertical' ? 'scrolled' : 'paginated', manager: 'continuous' });
        rendition.current = display;
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
        display.on('rendered', () => { if (!disposed) setEpubLoading(false); });
        reader.ready.catch((err) => { if (!disposed) { setError(err?.message || 'El archivo descargado no tiene una estructura EPUB válida.'); setEpubLoading(false); } });
        await display.display();
        if (!disposed) setEpubLoading(false);
      } catch (err) {
        if (!disposed) {
          const timedOut = err?.name === 'AbortError';
          setError(timedOut ? 'La descarga del EPUB tardó más de 20 segundos. Revisá la conexión o el archivo en Supabase.' : err?.message || 'No se pudo inicializar el lector EPUB.');
          setEpubLoading(false);
        }
      } finally {
        window.clearTimeout(loadTimeout);
      }
    };
    initialize();
    return () => {
      disposed = true;
      controller.abort();
      window.clearTimeout(loadTimeout);
      display?.destroy();
      reader?.destroy();
      rendition.current = null;
      epubBook.current = null;
    };
  }, [url, isEpub]);

  const changeReadingMode = (mode) => {
    if (isEpub && rendition.current) {
      // Change the EPUB.js manager only in response to an explicit user action.
      // Reapplying flow on initial mount can race with the first display() and
      // leave the iframe with a zero-sized viewport in some browsers.
      rendition.current.flow(mode === 'vertical' ? 'scrolled' : 'paginated');
    }
    setReadingMode(mode);
  };

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
    window.clearTimeout(pdfScrollTimer.current);
    if (pdfFrame.current) window.cancelAnimationFrame(pdfFrame.current);
    pdfFrame.current = window.requestAnimationFrame(() => {
      pdfFrame.current = 0;
      pdfScrollTimer.current = window.setTimeout(() => {
      const horizontal = readingModeRef.current === 'horizontal';
      const gap = window.innerWidth < 700 ? 8 : 12;
      const pageExtent = horizontal ? pdfPageWidth + gap : pdfPageWidth * pdfRatioRef.current + gap;
      const offset = horizontal
        ? container.scrollLeft + container.clientWidth / 2
        : container.scrollTop + container.clientHeight / 2;
      const closest = Math.max(1, Math.min(pages || 1, Math.floor(offset / pageExtent) + 1));
      setPage((current) => current === closest ? current : closest);
      }, 100);
    });
  };

  useEffect(() => () => { window.cancelAnimationFrame(pdfFrame.current); window.clearTimeout(pdfScrollTimer.current); }, []);
  useEffect(() => {
    if (isEpub || !pdfContainer.current) return;
    pdfContainer.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setPage(1);
  }, [isEpub, readingMode]);

  const loadPdf = async (pdf) => {
    try {
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      const ratio = viewport.height / viewport.width;
      if (Number.isFinite(ratio) && ratio > 0) {
        pdfRatioRef.current = ratio;
        setPdfPageRatio(ratio);
      }
    } catch { /* Keep the standard page ratio when metadata cannot be read. */ }
    setPages(pdf.numPages);
    setPage(1);
  };

  const pdfPageRange = useMemo(() => {
    if (!pages) return [];
    const first = Math.max(1, page - 2);
    const last = Math.min(pages, page + 2);
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  }, [page, pages]);

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
        <label title="Forma de lectura"><span>Desplazamiento</span><select value={readingMode} onChange={(event) => changeReadingMode(event.target.value)}><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></label>
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
        {error ? <div className="reader-error"><strong>No se pudo abrir el libro</strong><p>{error}</p><a href={url} target="_blank" rel="noreferrer">Intentar abrir el archivo</a></div> : isEpub ? <><div className="epub-stage" ref={epubHost} />{epubLoading && <p className="reader-loading epub-loading">Cargando EPUB…</p>}</> : <Document file={url} onLoadSuccess={loadPdf} onLoadError={(err) => setError(err.message)} loading={<p className="reader-loading">Cargando libro…</p>}>
          <div ref={pdfContainer} className={`pdf-pages ${readingMode === 'horizontal' ? 'pdf-horizontal' : 'pdf-vertical'}`} style={{ filter: colors.filter }} onScroll={handlePdfScroll}>
            {Array.from({ length: pages }, (_, index) => {
              const pageNumber = index + 1;
              const isNearViewport = pdfPageRange.includes(pageNumber);
              return <div key={pageNumber} className="pdf-page" data-pdf-page style={{ width: pdfPageWidth, height: pdfPageWidth * pdfPageRatio }}>
                {isNearViewport && <Page pageNumber={pageNumber} width={pdfPageWidth} renderTextLayer renderAnnotationLayer onRenderError={(err) => setError(err?.message || `No se pudo dibujar la página ${pageNumber}.`)} />}
              </div>;
            })}
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

