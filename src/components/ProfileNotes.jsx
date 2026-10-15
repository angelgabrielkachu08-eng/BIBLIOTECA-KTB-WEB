import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Quote, Search, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function ProfileNotes({ session }) {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.user?.id) return setNotes([]);
    const { data, error: loadError } = await supabase.from('lector_notas').select('*').eq('owner_uid', session.user.id).order('created_at', { ascending: false });
    if (loadError) setError('No se pudieron cargar tus notas.');
    else { setError(''); setNotes(data || []); }
  }, [session?.user?.id]);
  useEffect(() => { load(); }, [load]);
  const remove = async (note) => {
    const { error: removeError } = await supabase.from('lector_notas').delete().eq('id', note.id);
    if (removeError) { setError('No se pudo eliminar la nota.'); return; }
    setNotes((current) => current.filter((item) => item.id !== note.id));
  };
  const dictionary = notes.filter((note) => note.tipo === 'diccionario');
  const quotes = notes.filter((note) => note.tipo === 'cita');
  const lookup = (word) => window.open(`https://www.google.com/search?q=${encodeURIComponent(`significado de ${word}`)}`, '_blank', 'noopener,noreferrer');
  return <section className="reader-notes-page">
    <div className="section-head"><div><p className="overline">TU ESPACIO DE LECTURA</p><h2>Diccionario y citados</h2></div><BookOpen /></div>
    {error && <p className="reader-note-error">{error}</p>}
    <section className="reader-note-group"><h3><Search /> Diccionario <span>{dictionary.length}</span></h3>{dictionary.length ? <div className="reader-note-grid">{dictionary.map((note) => <article className="dictionary-note" key={note.id}><strong>{note.palabra || note.contenido}</strong><small>{note.libro_titulo || 'Consulta guardada'}</small><div><button className="outline-button" onClick={() => lookup(note.palabra || note.contenido)}><ExternalLink /> Consultar otra vez</button><button className="icon-button" onClick={() => remove(note)} aria-label="Eliminar palabra"><Trash2 /></button></div></article>)}</div> : <p className="reader-note-empty">Cuando consultes una palabra desde el lector, aparecerá aquí.</p>}</section>
    <section className="reader-note-group"><h3><Quote /> Citados <span>{quotes.length}</span></h3>{quotes.length ? <div className="reader-note-grid">{quotes.map((note) => <article className="quote-note" key={note.id}><div className="quote-note-book">{note.libro_portada ? <img src={note.libro_portada} alt={`Portada de ${note.libro_titulo}`} /> : <BookOpen />}</div><div className="quote-note-content"><blockquote>“{note.contenido}”</blockquote><strong>{note.libro_titulo || 'Libro'}</strong><small>{note.libro_autor || 'Autor no especificado'}</small></div><button className="icon-button" onClick={() => remove(note)} aria-label="Eliminar cita"><Trash2 /></button></article>)}</div> : <p className="reader-note-empty">Seleccioná una frase en un libro y tocá “Citar” para guardarla.</p>}</section>
  </section>;
}
