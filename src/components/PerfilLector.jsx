import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Camera, ChevronDown, ChevronUp, ExternalLink, LogIn, LogOut, UserRound, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

/* ─── Onboarding modal: primer login ─────────────────────── */
function OnboardingModal({ email, onSave }) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const name = nombre.trim();
    if (!name) return setError('Escribí tu nombre.');
    if (name.length < 2) return setError('Debe tener al menos 2 caracteres.');
    setLoading(true);
    // Verificar unicidad (case-insensitive)
    const { data: existing } = await supabase
      .from('usuarios')
      .select('id_usuario')
      .ilike('nombre', name)
      .limit(1);
    if (existing?.length) { setLoading(false); return setError('Ese nombre ya está en uso. Elegí otro.'); }
    await onSave(name);
    setLoading(false);
  };

  return (
    <div className="rp-onboarding-backdrop">
      <div className="rp-onboarding">
        <div className="rp-onboarding-icon">👋</div>
        <h2>¡Bienvenido/a a Biblioteca KTB!</h2>
        <p>¿Cómo querés que te llamemos, lector/a?</p>
        <input
          className="rp-onboarding-input"
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setError(''); }}
          placeholder="Tu nombre de usuario…"
          maxLength={40}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
        />
        {error && <p className="rp-onboarding-error">{error}</p>}
        <button className="rp-onboarding-btn" onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando…' : 'Confirmar nombre'}
        </button>
        <small className="rp-onboarding-hint">Podés cambiarlo después desde tu perfil.</small>
      </div>
    </div>
  );
}

/* ─── Mini catálogo de libros de la lista ─────────────────── */
function ListCatalog({ rows, onSelect, onRemove }) {
  if (!rows.length) return <p className="rp-list-empty">Aún no hay libros en esta lista.</p>;
  return (
    <div className="rp-list-grid">
      {rows.map(({ item, book }) => {
        const src = book.imagen_portada || book.imagen;
        const isVirtual = /virtual|digital|pdf/i.test(String(book.tipo_libro || ''));
        const url = book.archivo_pdf || book.pdf;
        return (
          <div key={item.id_biblioteca_personal} className="rp-list-card">
            <button className="rp-list-cover" onClick={() => onSelect(book)}>
              {src ? <img src={src} alt={book.titulo} /> : <BookOpen size={22} />}
            </button>
            <div className="rp-list-info">
              <span className="rp-list-title" onClick={() => onSelect(book)}>{book.titulo}</span>
              <span className="rp-list-type">{isVirtual ? 'Virtual' : 'Físico'}</span>
            </div>
            <div className="rp-list-actions">
              {isVirtual && url && (
                <a href={url} target="_blank" rel="noreferrer" className="rp-list-btn rp-list-read">
                  <ExternalLink size={13} /> Leer
                </a>
              )}
              <button className="rp-list-btn rp-list-remove" onClick={() => onRemove(item)}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Modal de detalle de libro desde perfil ─────────────── */
function ProfileBookModal({ book, onClose }) {
  const url = book.archivo_pdf || book.pdf;
  const virtual = /virtual|digital|pdf/i.test(String(book.tipo_libro || ''));
  return (
    <div className="reader-book-modal-backdrop" onMouseDown={onClose}>
      <section className="reader-book-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="reader-book-close" onClick={onClose}><X /></button>
        {(book.imagen_portada || book.imagen)
          ? <img src={book.imagen_portada || book.imagen} alt={`Portada de ${book.titulo}`} />
          : <BookOpen />}
        <div>
          <p>{book.tipo_libro || 'Libro'}</p>
          <h2>{book.titulo}</h2>
          <p>{book.sinopsis || 'Abriste este título desde tu perfil lector.'}</p>
          {virtual && url && <a className="primary-button" href={url} target="_blank" rel="noreferrer"><ExternalLink /> Leer online</a>}
        </div>
      </section>
    </div>
  );
}

/* ─── Sección de lista (botón + catálogo desplegable) ─────── */
const LIST_CONFIG = [
  { key: 'Leyendo',      icon: '📖', label: 'Leyendo',       color: '#e2bd65' },
  { key: 'Leer después', icon: '🕐', label: 'Leer después',  color: '#9a7dd4' },
  { key: 'Finalizado',   icon: '✅', label: 'Finalizados',   color: '#4caf7d' },
];

function ListSection({ config, rows, onSelect, onRemove }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rp-list-section">
      <button className="rp-list-btn-main" onClick={() => setOpen((p) => !p)}>
        <span className="rp-list-icon">{config.icon}</span>
        <span className="rp-list-label">{config.label}</span>
        <span className="rp-list-count" style={{ background: config.color }}>{rows.length}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <ListCatalog rows={rows} onSelect={onSelect} onRemove={onRemove} />}
    </div>
  );
}

/* ─── Componente principal ────────────────────────────────── */
export default function PerfilLector() {
  const [open, setOpen]           = useState(false);
  const [session, setSession]     = useState(null);
  const [profile, setProfile]     = useState(null);
  const [books, setBooks]         = useState([]);
  const [items, setItems]         = useState([]);
  const [notice, setNotice]       = useState('');
  const [selected, setSelected]   = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentSection, setCurrentSection] = useState(() => sessionStorage.getItem('ktb-section') || 'inicio');
  const fileRef = useRef(null);

  useEffect(() => {
    const handler = () => setCurrentSection(sessionStorage.getItem('ktb-section') || 'inicio');
    window.addEventListener('ktb-section-change', handler);
    return () => window.removeEventListener('ktb-section-change', handler);
  }, []);

  const load = async (current) => {
    setSession(current);
    if (!current?.user?.email) { setProfile(null); setItems([]); return; }
    const [{ data: user }, { data: allBooks }] = await Promise.all([
      supabase.from('usuarios').select('*').eq('email', current.user.email).maybeSingle(),
      supabase.from('libros').select('*'),
    ]);
    setProfile(user || null);
    setBooks(allBooks || []);
    if (user) {
      const { data } = await supabase.from('biblioteca_personal').select('*').eq('id_usuario', user.id_usuario);
      setItems(data || []);
      // Primer login: si no tiene apellido ni nombre personalizado (viene del google metadata)
      const needsOnboarding = user && (!user.nombre || user.nombre === 'Lector');
      if (needsOnboarding) setShowOnboarding(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, current) => load(current));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (open) supabase.auth.getSession().then(({ data }) => load(data.session)); }, [open]);

  const selectedBooks = useMemo(() =>
    items.map((item) => ({ item, book: books.find((b) => String(b.id_libro) === String(item.id_libro)) }))
      .filter((row) => row.book),
  [items, books]);

  const group = (name) => selectedBooks.filter(({ item }) => item.estado === name);

  /* Guardar nombre desde onboarding */
  const saveNombre = async (nombre) => {
    if (!profile) return;
    const { error } = await supabase.from('usuarios').update({ nombre }).eq('id_usuario', profile.id_usuario);
    if (error) return;
    setProfile((p) => ({ ...p, nombre }));
    setShowOnboarding(false);
  };

  /* Subir foto de perfil */
  const handlePhotoUpload = async (file) => {
    if (!file || !profile) return;
    setUploadingPhoto(true);
    const ext = file.name.split('.').pop();
    const path = `avatars/${profile.id_usuario}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('biblioteca-archivos')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setNotice('No se pudo subir la foto.'); setUploadingPhoto(false); return; }
    const { data: urlData } = supabase.storage.from('biblioteca-archivos').getPublicUrl(path);
    const avatar_url = urlData.publicUrl + '?t=' + Date.now();
    await supabase.from('usuarios').update({ avatar_url }).eq('id_usuario', profile.id_usuario);
    setProfile((p) => ({ ...p, avatar_url }));
    setUploadingPhoto(false);
    setNotice('Foto actualizada.');
  };

  /* Eliminar libro de la lista */
  const removeItem = async (item) => {
    await supabase.from('biblioteca_personal').delete().eq('id_biblioteca_personal', item.id_biblioteca_personal);
    setItems((prev) => prev.filter((i) => i.id_biblioteca_personal !== item.id_biblioteca_personal));
  };

  const login  = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  const logout = () => supabase.auth.signOut();

  const totalLibros = selectedBooks.length;

  return (
    <>
      {!/^admin/.test(currentSection) && (
        <button className="reader-profile-fab" onClick={() => setOpen(true)} title="Abrir mi perfil">
          <UserRound /> Mi perfil
        </button>
      )}

      {showOnboarding && session && (
        <OnboardingModal email={session.user.email} onSave={saveNombre} />
      )}

      {open && (
        <div className="reader-profile-backdrop" onMouseDown={() => setOpen(false)}>
          <section className="reader-profile rp-new" onMouseDown={(e) => e.stopPropagation()}>
            <button className="reader-profile-close" onClick={() => setOpen(false)}><X /></button>

            {!session || !profile ? (
              /* ── Sin sesión ── */
              <div className="reader-profile-empty">
                <UserRound />
                <h2>Tu perfil lector</h2>
                <p>Ingresá para guardar y organizar tus lecturas.</p>
                <button className="primary-button" onClick={login}><LogIn /> Acceder con Google</button>
              </div>
            ) : (
              <>
                {/* ── Header ── */}
                <div className="rp-header">
                  <button className="rp-logout" onClick={logout} title="Cerrar sesión"><LogOut size={16} /></button>

                  {/* Avatar */}
                  <div className="rp-avatar-wrap">
                    <div className="rp-avatar">
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt="Avatar" />
                        : <span>{(profile.nombre || profile.email)[0].toUpperCase()}</span>}
                      <button
                        className="rp-avatar-edit"
                        onClick={() => fileRef.current?.click()}
                        title="Cambiar foto"
                        disabled={uploadingPhoto}
                      >
                        <Camera size={13} />
                      </button>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                    />
                    {uploadingPhoto && <small className="rp-uploading">Subiendo…</small>}
                  </div>

                  <h2 className="rp-name">{profile.nombre} {profile.apellido || ''}</h2>
                  <p className="rp-email">{profile.email}</p>

                  {/* Contador total */}
                  <div className="rp-stats">
                    <div className="rp-stat">
                      <strong>{totalLibros}</strong>
                      <span>libro{totalLibros !== 1 ? 's' : ''} guardado{totalLibros !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                {notice && <p className="reader-notice rp-notice">{notice}</p>}

                {/* ── Listas con botones ── */}
                <div className="rp-lists">
                  {LIST_CONFIG.map((cfg) => (
                    <ListSection
                      key={cfg.key}
                      config={cfg}
                      rows={group(cfg.key)}
                      onSelect={(book) => { setSelected(book); }}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {selected && <ProfileBookModal book={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
