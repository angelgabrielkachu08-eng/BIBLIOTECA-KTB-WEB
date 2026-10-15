import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Quote, Search, Trash2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

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
  const openSection = (type) => setOpenType(type);
  return <section className="reader-notes-page">
    <div className="section-head"><div><p className="overline">TU ESPACIO DE LECTURA</p><h2>Diccionario y citados</h2></div><BookOpen /></div>
    {error && <p className="reader-note-error">{error}</p>}
    <div className="reader-note-sections">
      <button className="reader-note-section-card" onClick={() => openSection('diccionario')}><span className="reader-note-section-icon"><Search /></span><span className="reader-note-section-copy"><strong>Diccionario</strong><small>{dictionary.length ? `${dictionary.length} ${dictionary.length === 1 ? 'palabra guardada' : 'palabras guardadas'} · Volvé a consultar su significado` : 'Tus palabras guardadas aparecerán acá'}</small></span><b>{dictionary.length}</b></button>
      <button className="reader-note-section-card" onClick={() => openSection('cita')}><span className="reader-note-section-icon"><Quote /></span><span className="reader-note-section-copy"><strong>Citados</strong><small>{quotes.length ? `${quotes.length} ${quotes.length === 1 ? 'frase guardada' : 'frases guardadas'} · Con la portada de su libro` : 'Las frases que cites aparecerán acá'}</small></span><b>{quotes.length}</b></button>
    </div>
    {openType && <div className="reader-notes-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenType(null); }}>
      <section className="reader-notes-dialog" role="dialog" aria-modal="true" aria-label={isQuote ? 'Citados' : 'Diccionario'}>
        <header><div><p className="overline">TU ESPACIO DE LECTURA</p><h2>{isQuote ? <><Quote /> Citados</> : <><Search /> Diccionario</>}</h2></div><button className="icon-button" onClick={() => setOpenType(null)} aria-label="Cerrar"><X /></button></header>
        {activeNotes.length ? <div className="reader-notes-list">{activeNotes.map((note) => <article className={isQuote ? 'quote-note' : 'dictionary-note'} key={note.id}>
          {isQuote && <div className="quote-note-book">{note.libro_portada ? <img src={note.libro_portada} alt={`Portada de ${note.libro_titulo || 'libro'}`} /> : <BookOpen />}</div>}
          <div className="reader-note-item-content">{isQuote ? <><blockquote>“{note.contenido}”</blockquote><strong>{note.libro_titulo || 'Libro'}</strong><small>{note.libro_autor || 'Autor no especificado'}</small></> : <><strong>{note.palabra || note.contenido}</strong><small>{note.libro_titulo || 'Consulta guardada'}</small></>}</div>
          {!isQuote && <button className="outline-button" onClick={() => lookup(note.palabra || note.contenido)}><ExternalLink /> Consultar</button>}
          <button className="icon-button note-delete" onClick={() => remove(note)} aria-label={isQuote ? 'Eliminar cita' : 'Eliminar palabra'} title="Eliminar"><Trash2 /></button>
        </article>)}</div> : <p className="reader-note-empty">{isQuote ? 'Todavía no guardaste citas. Seleccioná una frase en el lector y tocá “Citar”.' : 'Todavía no guardaste palabras. Seleccioná una palabra y elegí “Diccionario”.'}</p>}
        <footer><span>{activeNotes.length} {isQuote ? (activeNotes.length === 1 ? 'cita' : 'citas') : (activeNotes.length === 1 ? 'palabra' : 'palabras')}</span><button className="outline-button" onClick={() => setOpenType(null)}>Cerrar</button></footer>
      </section>
    </div>}
  </section>;
}
