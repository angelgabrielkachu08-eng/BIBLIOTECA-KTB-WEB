import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Quote, Search, Trash2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './ProfileNotes.css';

export default function ProfileNotes({ session }) {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');
  const [openType, setOpenType] = useState(null);
  const load = useCallback(async () => {
    if (!session?.user?.id) return setNotes([]);
    const { data, error: loadError } = await supabase.from('lector_notas').select('*').eq('owner_uid', session.user.id).order('created_at', { ascending: false });
    if (loadError) setError('No se pudieron cargar tus notas.');
    else { setError(''); setNotes(data || []); }
  }, [session?.user?.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!openType) return undefined;
    const close = (event) => { if (event.key === 'Escape') setOpenType(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [openType]);
  const remove = async (note) => {
    const { error: removeError } = await supabase.from('lector_notas').delete().eq('id', note.id);
    if (removeError) { setError('No se pudo eliminar la nota.'); return; }
    setNotes((current) => current.filter((item) => item.id !== note.id));
  };
  const dictionary = notes.filter((note) => note.tipo === 'diccionario');
  const quotes = notes.filter((note) => note.tipo === 'cita');
  const activeNotes = openType === 'diccionario' ? dictionary : quotes;
  const isQuote = openType === 'cita';
  const lookup = (word) => window.open(`https://www.google.com/search?q=${encodeURIComponent(`significado de ${word}`)}`, '_blank', 'noopener,noreferrer');
  return <section className="reader-notes-page">
    <div className="reader-notes-heading">
      <span className="reader-notes-heading-icon"><BookOpen size={18} /></span>
      <div><p className="reader-notes-eyebrow">TU ESPACIO DE LECTURA</p><h2>Diccionario y citados</h2><p className="reader-notes-intro">Tus palabras y frases favoritas, reunidas en un mismo lugar.</p></div>
    </div>
    {error && <p className="reader-note-error">{error}</p>}
    <div className="reader-note-sections">
      <button className="reader-note-section-card dictionary-card" onClick={() => setOpenType('diccionario')}>
        <span className="reader-note-section-icon"><Search size={19} /></span>
        <span className="reader-note-section-copy"><strong>Diccionario</strong><small>{dictionary.length ? `${dictionary.length} ${dictionary.length === 1 ? 'palabra guardada' : 'palabras guardadas'} · Volvé a consultar su significado` : 'Las palabras que consultes aparecerán acá'}</small></span>
        <span className="reader-note-count">{dictionary.length}</span><span className="reader-note-arrow" aria-hidden="true">›</span>
      </button>
      <button className="reader-note-section-card quotes-card" onClick={() => setOpenType('cita')}>
        <span className="reader-note-section-icon"><Quote size={19} /></span>
        <span className="reader-note-section-copy"><strong>Citados</strong><small>{quotes.length ? `${quotes.length} ${quotes.length === 1 ? 'frase guardada' : 'frases guardadas'} · Con la portada de su libro` : 'Las frases que cites aparecerán acá'}</small></span>
        <span className="reader-note-count">{quotes.length}</span><span className="reader-note-arrow" aria-hidden="true">›</span>
      </button>
    </div>
    {openType && <div className="reader-notes-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenType(null); }}>
      <section className="reader-notes-dialog" role="dialog" aria-modal="true" aria-label={isQuote ? 'Citados' : 'Diccionario'}>
        <header className="reader-notes-dialog-head"><div><p className="reader-notes-eyebrow">TU ESPACIO DE LECTURA</p><h2>{isQuote ? <><Quote size={20} /> Citados</> : <><Search size={20} /> Diccionario</>}</h2><p>{isQuote ? 'Frases que guardaste durante la lectura' : 'Palabras consultadas en tus libros'}</p></div><button className="reader-notes-close" onClick={() => setOpenType(null)} aria-label="Cerrar"><X size={19} /></button></header>
        {activeNotes.length ? <div className="reader-notes-list">{activeNotes.map((note) => <article className={isQuote ? 'quote-note' : 'dictionary-note'} key={note.id}>
          {isQuote && <div className="quote-note-book">{note.libro_portada ? <img src={note.libro_portada} alt={`Portada de ${note.libro_titulo || 'libro'}`} /> : <BookOpen />}</div>}
          <div className="reader-note-item-content">{isQuote ? <><blockquote>“{note.contenido}”</blockquote><strong>{note.libro_titulo || 'Libro'}</strong><small>{note.libro_autor || 'Autor no especificado'}</small></> : <><strong>{note.palabra || note.contenido}</strong><small>{note.libro_titulo || 'Consulta guardada'}</small></>}</div>
          {!isQuote && <button className="outline-button" onClick={() => lookup(note.palabra || note.contenido)}><ExternalLink /> Consultar</button>}
          <button className="reader-note-delete" onClick={() => remove(note)} aria-label={isQuote ? 'Eliminar cita' : 'Eliminar palabra'} title="Eliminar"><Trash2 size={16} /></button>
        </article>)}</div> : <p className="reader-note-empty">{isQuote ? 'Todavía no guardaste citas. Seleccioná una frase en el lector y tocá “Citar”.' : 'Todavía no guardaste palabras. Seleccioná una palabra y elegí “Diccionario”.'}</p>}
        <footer className="reader-notes-dialog-footer"><span>{activeNotes.length} {isQuote ? (activeNotes.length === 1 ? 'cita' : 'citas') : (activeNotes.length === 1 ? 'palabra' : 'palabras')}</span><button className="reader-note-done" onClick={() => setOpenType(null)}>Listo</button></footer>
      </section>
    </div>}
  </section>;
}
