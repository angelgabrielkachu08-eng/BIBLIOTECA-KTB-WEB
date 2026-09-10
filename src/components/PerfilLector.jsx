import CustomSelect from './CustomSelect';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Heart, LogIn, Star, UserRound, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function PerfilLector() {
  const [open, setOpen] = useState(false), [session, setSession] = useState(null), [profile, setProfile] = useState(null), [books, setBooks] = useState([]), [items, setItems] = useState([]), [query, setQuery] = useState(''), [state, setState] = useState('Leer después'), [notice, setNotice] = useState(''), [selected, setSelected] = useState(null);
  const [currentSection, setCurrentSection] = useState(() => sessionStorage.getItem('ktb-section') || 'inicio');
  useEffect(() => {
    const handler = () => setCurrentSection(sessionStorage.getItem('ktb-section') || 'inicio');
    window.addEventListener('ktb-section-change', handler);
    return () => window.removeEventListener('ktb-section-change', handler);
  }, []);
  const load = async (current) => {
    setSession(current);
    if (!current?.user?.email) { setProfile(null); setItems([]); return; }
    const [{ data: user }, { data: allBooks }] = await Promise.all([supabase.from('usuarios').select('*').eq('email', current.user.email).maybeSingle(), supabase.from('libros').select('*')]);
    setProfile(user || null); setBooks(allBooks || []);
    if (user) { const { data } = await supabase.from('biblioteca_personal').select('*').eq('id_usuario', user.id_usuario); setItems(data || []); }
  };
  useEffect(() => { supabase.auth.getSession().then(({ data }) => load(data.session)); const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => load(current)); return () => subscription.unsubscribe(); }, []);
  useEffect(() => { if (open) supabase.auth.getSession().then(({ data }) => load(data.session)); }, [open]);
  const selectedBooks = useMemo(() => items.map((item) => ({ item, book: books.find((book) => String(book.id_libro) === String(item.id_libro)) })).filter((row) => row.book), [items, books]);
  const save = async (book) => {
    if (!profile) return setNotice('Ingresá para guardar lecturas.');
    const previous = items.find((item) => item.id_libro === book.id_libro);
    const request = previous ? supabase.from('biblioteca_personal').update({ estado: state, updated_at: new Date().toISOString() }).eq('id_biblioteca_personal', previous.id_biblioteca_personal) : supabase.from('biblioteca_personal').insert({ id_usuario: profile.id_usuario, id_libro: book.id_libro, estado: state });
    const { error } = await request; if (error) return setNotice(error.message); await load(session); setNotice(`Guardado en ${state}.`);
  };
  const login = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  const group = (name) => selectedBooks.filter(({ item }) => item.estado === name);
  return <>{!/^admin/.test(currentSection)&&<button className="reader-profile-fab" onClick={() => setOpen(true)} title="Abrir mi perfil"><UserRound /> Mi perfil</button>}{open && <div className="reader-profile-backdrop" onMouseDown={() => setOpen(false)}><section className="reader-profile" onMouseDown={(event) => event.stopPropagation()}><button className="reader-profile-close" onClick={() => setOpen(false)}><X /></button>{!session || !profile ? <div className="reader-profile-empty"><UserRound /><h2>Tu perfil lector</h2><p>Ingresá para guardar y organizar tus lecturas.</p><button className="primary-button" onClick={login}><LogIn /> Acceder</button></div> : <><header><div className="reader-avatar">{(profile.nombre || profile.email)[0].toUpperCase()}</div><div><span>PERFIL LECTOR</span><h2>{profile.nombre} {profile.apellido || ''}</h2><p>{profile.email}</p></div></header><div className="reader-add"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar título para guardar" /><CustomSelect value={state} onChange={setState} options={["Leyendo","Leer después","Finalizado"]} ariaLabel="Estado de lectura"/>{query && <div className="reader-search-results">{books.filter((book) => book.titulo?.toLowerCase().includes(query.toLowerCase())).slice(0, 5).map((book) => <button key={book.id_libro} onClick={() => save(book)}><Heart /> {book.titulo}</button>)}</div>}</div>{notice && <p className="reader-notice">{notice}</p>}<ReaderShelf title="Leyendo" rows={group('Leyendo')} onSelect={setSelected}/><ReaderShelf title="Leer después" rows={group('Leer después')} onSelect={setSelected}/><ReaderShelf title="Finalizados" rows={group('Finalizado')} onSelect={setSelected}/></>}</section></div>}{selected&&<ProfileBookModal book={selected} onClose={()=>setSelected(null)}/>}</>;
}
function ReaderShelf({ title, rows, onSelect }) { return <section className="reader-shelf"><h3>{title}</h3>{rows.length ? <div className="reader-book-grid">{rows.map(({ book }) => <button className="reader-book-card" key={book.id_libro} onClick={()=>onSelect(book)}>{book.imagen_portada||book.imagen?<img src={book.imagen_portada||book.imagen} alt=""/>:<BookOpen/>}<span>{book.titulo}<small>{book.tipo_libro||'Libro'}</small></span><Star /></button>)}</div> : <p>Aún no hay libros en esta lista.</p>}</section>; }
function ProfileBookModal({book,onClose}){const url=book.archivo_pdf||book.pdf;const virtual=/virtual|digital|pdf/i.test(String(book.tipo_libro||''));return <div className="reader-book-modal-backdrop" onMouseDown={onClose}><section className="reader-book-modal" onMouseDown={(event)=>event.stopPropagation()}><button className="reader-book-close" onClick={onClose}><X/></button>{book.imagen_portada||book.imagen?<img src={book.imagen_portada||book.imagen} alt={`Portada de ${book.titulo}`}/>:<BookOpen/>}<div><p>{book.tipo_libro||'Libro'}</p><h2>{book.titulo}</h2><p>{book.sinopsis||'Abriste este título desde tu perfil lector.'}</p>{virtual&&url&&<a className="primary-button" href={url} target="_blank" rel="noreferrer"><ExternalLink/> Leer online</a>}</div></section></div>}
