import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import JSZip from 'jszip';
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

const resolveZipPath = (baseFile, href) => {
  const cleanHref = decodeURIComponent(String(href || '').split('#')[0].split('?')[0]);
  const parts = (cleanHref.startsWith('/') ? [] : baseFile.split('/').slice(0, -1));
  for (const part of cleanHref.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
};

const readEpub = async (url, signal) => {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`No se pudo descargar el EPUB (${response.status}).`);
  const archive = await JSZip.loadAsync(await response.arrayBuffer());
  const containerFile = archive.file('META-INF/container.xml');
  if (!containerFile) throw new Error('El archivo no contiene META-INF/container.xml.');
  const parser = new DOMParser();
  const container = parser.parseFromString(await containerFile.async('string'), 'application/xml');
  const opfPath = container.getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
  if (!opfPath) throw new Error('No se encontró el paquete OPF del EPUB.');
  const opfFile = archive.file(opfPath);
  if (!opfFile) throw new Error('No se pudo encontrar el archivo OPF del EPUB.');
  const opf = parser.parseFromString(await opfFile.async('string'), 'application/xml');
  const manifest = new Map([...opf.getElementsByTagName('item')].map((item) => [item.getAttribute('id'), item]));
  const spine = [...opf.getElementsByTagName('itemref')];
  const chapters = [];
  for (const itemref of spine) {
    const item = manifest.get(itemref.getAttribute('idref'));
    const href = item?.getAttribute('href');
    if (!href || itemref.getAttribute('linear') === 'no') continue;
    const path = resolveZipPath(opfPath, href);
    const file = archive.file(path);
    if (!file) continue;
    const document = parser.parseFromString(await file.async('string'), 'text/html');
    document.querySelectorAll('script, iframe, frame, object, embed, form, link[rel="stylesheet"]').forEach((node) => node.remove());
    document.querySelectorAll('[style]').forEach((node) => node.removeAttribute('style'));
    document.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        if (/^on/i.test(attribute.name) || /^(?:javascript|vbscript):/i.test(attribute.value.trim())) {
          node.removeAttribute(attribute.name);
        }
      });
    });
    for (const image of document.querySelectorAll('img[src], image[href]')) {
      const attr = image.hasAttribute('src') ? 'src' : 'href';
      const imagePath = resolveZipPath(path, image.getAttribute(attr));
      const imageFile = archive.file(imagePath);
      if (!imageFile) { image.remove(); continue; }
      const type = imageFile.name.toLowerCase().endsWith('.png') ? 'image/png'
        : imageFile.name.toLowerCase().endsWith('.webp') ? 'image/webp'
          : imageFile.name.toLowerCase().endsWith('.gif') ? 'image/gif' : 'image/jpeg';
      image.setAttribute(attr, `data:${type};base64,${await imageFile.async('base64')}`);
    }
    document.querySelectorAll('a[href]').forEach((anchor) => {
      anchor.removeAttribute('href');
      anchor.removeAttribute('target');
    });
    const body = document.body;
    const title = body.querySelector('h1,h2,h3')?.textContent?.trim()
      || document.title?.trim() || `Capítulo ${chapters.length + 1}`;
    if (body.innerHTML.trim()) chapters.push({ title, html: body.innerHTML });
  }
  if (!chapters.length) throw new Error('El EPUB no contiene capítulos de lectura.');
  return chapters;
};

export default function ReaderModal({ book, onClose }) {
  const url = book.archivo_pdf || book.pdf || '';
  const isEpub = useMemo(() => {
    try { return new URL(url, window.location.href).pathname.toLowerCase().endsWith('.epub'); }
    catch { return false; }
  }, [url]);
  const epubContent = useRef(null);
  const pdfFrame = useRef(0);
  const pdfScrollTimer = useRef(0);
  const pdfPruneTimer = useRef(0);
  const pdfLastPageUpdate = useRef(0);
  const pdfRatioRef = useRef(1.414);
  const pdfContainer = useRef(null);
  const [theme, setTheme] = useState('Día');
  const [font, setFont] = useState('Georgia');
  const [fontSize, setFontSize] = useState(18);
  const [readingMode, setReadingMode] = useState('vertical');
  const readingModeRef = useRef(readingMode);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [renderedPages, setRenderedPages] = useState(() => new Set([1, 2, 3, 4, 5, 6]));
  const [pdfPageRatio, setPdfPageRatio] = useState(1.414);
  const [selection, setSelection] = useState('');
  const [menuPoint, setMenuPoint] = useState(null);
  const [error, setError] = useState('');
  const [epubLoading, setEpubLoading] = useState(true);
  const [epubChapters, setEpubChapters] = useState([]);
  const colors = themes[theme];
  const pdfPageWidth = readingMode === 'horizontal'
    ? Math.max(280, Math.min(760, window.innerHeight * .68 * .707, window.innerWidth - 20))
    : Math.max(280, Math.min(860, window.innerWidth - (window.innerWidth < 700 ? 20 : 84)));

  useEffect(() => { readingModeRef.current = readingMode; }, [readingMode]);

  useEffect(() => {
    if (!isEpub || epubLoading || !epubContent.current) return undefined;
    const container = epubContent.current;
    let frame = 0;
    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const horizontal = readingMode === 'horizontal';
        const extent = horizontal ? container.clientWidth : container.clientHeight;
        const length = horizontal ? container.scrollWidth : container.scrollHeight;
        const total = Math.max(1, Math.ceil(length / Math.max(extent, 1)));
        setPages(total);
        setPage(Math.min(total, Math.max(1, Math.floor((horizontal ? container.scrollLeft : container.scrollTop) / Math.max(extent, 1)) + 1)));
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame); };
  }, [isEpub, epubLoading, epubChapters, readingMode, font, fontSize]);

  useEffect(() => {
    if (!isEpub || !epubContent.current) return undefined;
    let disposed = false;
    setEpubLoading(true);
    setError('');
    const controller = new AbortController();
    const initialize = async () => {
      try {
        const chapters = await readEpub(url, controller.signal);
        if (disposed) return;
        setEpubChapters(chapters);
        setPages(chapters.length);
        setPage(1);
        setEpubLoading(false);
      } catch (err) {
        if (!disposed && err.name !== 'AbortError') {
          setError(err?.message || 'No se pudo inicializar el lector EPUB.');
          setEpubLoading(false);
        }
      }
    };
    initialize();
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [url, isEpub]);

  const changeReadingMode = (mode) => setReadingMode(mode);

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
  const changePage = (direction) => {
    const container = epubContent.current;
    if (!container) return;
    const horizontal = readingModeRef.current === 'horizontal';
    container.scrollBy({ [horizontal ? 'left' : 'top']: direction * (horizontal ? container.clientWidth : container.clientHeight) * .88, behavior: 'smooth' });
  };
  const handlePdfScroll = (event) => {
    const container = event.currentTarget;
    if (pdfFrame.current) return;
    pdfFrame.current = window.requestAnimationFrame(() => {
      pdfFrame.current = 0;
      const updatePage = () => {
        pdfScrollTimer.current = 0;
        pdfLastPageUpdate.current = performance.now();
        const horizontal = readingModeRef.current === 'horizontal';
        const gap = window.innerWidth < 700 ? 8 : 12;
        const pageExtent = horizontal ? pdfPageWidth + gap : pdfPageWidth * pdfRatioRef.current + gap;
        const offset = horizontal
          ? container.scrollLeft + container.clientWidth / 2
          : container.scrollTop + container.clientHeight / 2;
        const closest = Math.max(1, Math.min(pages || 1, Math.floor(offset / pageExtent) + 1));
        setPage((current) => current === closest ? current : closest);
        setRenderedPages((current) => {
          const next = new Set(current);
          for (let number = Math.max(1, closest - 4); number <= Math.min(pages || 1, closest + 9); number += 1) next.add(number);
          return next.size === current.size ? current : next;
        });
        window.clearTimeout(pdfPruneTimer.current);
        pdfPruneTimer.current = window.setTimeout(() => {
          setRenderedPages((current) => {
            const next = new Set([...current].filter((number) => number >= Math.max(1, closest - 4) && number <= Math.min(pages || 1, closest + 9)));
            return next.size === current.size ? current : next;
          });
        }, 1000);
      };
      const wait = 100 - (performance.now() - pdfLastPageUpdate.current);
      if (wait <= 0) updatePage();
      else if (!pdfScrollTimer.current) pdfScrollTimer.current = window.setTimeout(updatePage, wait);
    });
  };

  useEffect(() => () => { window.cancelAnimationFrame(pdfFrame.current); window.clearTimeout(pdfScrollTimer.current); window.clearTimeout(pdfPruneTimer.current); }, []);
  useEffect(() => {
    if (isEpub || !pdfContainer.current) return;
    pdfContainer.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setPage(1);
    setRenderedPages(new Set([1, 2, 3, 4, 5, 6]));
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
    setRenderedPages(new Set(Array.from({ length: Math.min(pdf.numPages, 6) }, (_, index) => index + 1)));
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
        {error ? <div className="reader-error"><strong>No se pudo abrir el libro</strong><p>{error}</p><a href={url} target="_blank" rel="noreferrer">Intentar abrir el archivo</a></div> : isEpub ? <><div
          className={`epub-stage epub-flow epub-flow-${readingMode}`}
          ref={epubContent}
          style={{ '--epub-font': font, '--epub-font-size': `${fontSize}px` }}
          onScroll={(event) => {
            const node = event.currentTarget;
            const horizontal = readingMode === 'horizontal';
            const extent = horizontal ? node.clientWidth : node.clientHeight;
            const offset = horizontal ? node.scrollLeft : node.scrollTop;
            const length = horizontal ? node.scrollWidth : node.scrollHeight;
            const total = Math.max(1, Math.ceil(length / Math.max(extent, 1)));
            setPages(total);
            setPage(Math.min(total, Math.max(1, Math.floor(offset / Math.max(extent, 1)) + 1)));
          }}
        >{epubChapters.map((chapter, index) => <article className="epub-chapter" key={`${chapter.title}-${index}`} dangerouslySetInnerHTML={{ __html: chapter.html }} />)}</div>{epubLoading && <p className="reader-loading epub-loading">Cargando EPUB…</p>}</> : <Document file={url} onLoadSuccess={loadPdf} onLoadError={(err) => setError(err.message)} loading={<p className="reader-loading">Cargando libro…</p>}>
          <div ref={pdfContainer} className={`pdf-pages ${readingMode === 'horizontal' ? 'pdf-horizontal' : 'pdf-vertical'}`} style={{ filter: colors.filter }} onScroll={handlePdfScroll}>
            {Array.from({ length: pages }, (_, index) => {
              const pageNumber = index + 1;
              const isNearViewport = renderedPages.has(pageNumber);
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

