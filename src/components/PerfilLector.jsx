import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Camera, ExternalLink, LogIn, LogOut, UserRound, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

/* ─── Onboarding ─────────────────────────────────────────── */
function OnboardingModal({ onSave }) {
  const [nombre, setNombre] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const name = nombre.trim();
    if (!name) return setError('Escribí tu nombre.');
    if (name.length < 2) return setError('Debe tener al menos 2 caracteres.');
    setLoading(true);
    const { data: existing } = await supabase.from('usuarios').select('id_usuario').ilike('nombre', name).limit(1);
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
        <input className="rp-onboarding-input" value={nombre} onChange={(e) => { setNombre(e.target.value); setError(''); }} placeholder="Tu nombre de usuario…" maxLength={40} onKeyDown={(e) => e.key === 'Enter' && handleSave()} autoFocus />
        {error && <p className="rp-onboarding-error">{error}</p>}
        <button className="rp-onboarding-btn" onClick={handleSave} disabled={loading}>{loading ? 'Guardando…' : 'Confirmar nombre'}</button>
        <small className="rp-onboarding-hint">Podés cambiarlo después desde tu perfil.</small>
      </div>
    </div>
  );
}

/* ─── Modal catálogo de lista (igual estilo que TopRated) ─── */
function ListModal({ config, rows, onClose, onSelect, onRemove }) {
  return (
    <div className="rp-modal-backdrop" onMouseDown={onClose}>
      <section className="rp-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="rp-modal-head">
          <div>
            <p className="rp-modal-eyebrow">MI BIBLIOTECA</p>
            <h2>{config.icon} {config.label}</h2>
            <p className="rp-modal-sub">{rows.length} libro{rows.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="rp-modal-close" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="rp-modal-list">
          {!rows.length && <p className="rp-modal-empty">Aún no hay libros en esta lista.</p>}
          {rows.map(({ item, book }) => {
            const src = book.imagen_portada || book.imagen;
            const isVirtual = /virtual|digital|pdf/i.test(String(book.tipo_libro || ''));
            const url = book.archivo_pdf || book.pdf;
            return (
              <div key={item.id_biblioteca_personal} className="rp-modal-item">
                <button className="rp-modal-cover" onClick={() => { onSelect(book); onClose(); }}>
                  {src ? <img src={src} alt={book.titulo} /> : <BookOpen size={18} />}
                </button>
                <div className="rp-modal-info" onClick={() => { onSelect(book); onClose(); }}>
                  <span className="rp-modal-title">{book.titulo}</span>
                  <span className="rp-modal-type">{book.tipo_libro || 'Libro'}</span>
                  {book.sinopsis && <p className="rp-modal-synopsis">{book.sinopsis.slice(0, 100)}{book.sinopsis.length > 100 ? '…' : ''}</p>}
                </div>
                <div className="rp-modal-actions">
                  {isVirtual && url && <a href={url} target="_blank" rel="noreferrer" className="rp-modal-read"><ExternalLink size={13} /></a>}
                  <button className="rp-modal-remove" onClick={() => onRemove(item)} title="Quitar">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ─── Modal detalle libro ────────────────────────────────── */
function ProfileBookModal({ book, onClose }) {
  const url     = book.archivo_pdf || book.pdf;
  const virtual = /virtual|digital|pdf/i.test(String(book.tipo_libro || ''));
  return (
    <div className="reader-book-modal-backdrop" onMouseDown={onClose}>
      <section className="reader-book-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="reader-book-close" onClick={onClose}><X /></button>
        {(book.imagen_portada || book.imagen) ? <img src={book.imagen_portada || book.imagen} alt={book.titulo} /> : <BookOpen />}
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

/* ─── Config listas ──────────────────────────────────────── */
const LIST_CONFIG = [
  { key: 'Leyendo',      icon: '📖', label: 'Leyendo',      color: '#e2bd65' },
  { key: 'Leer después', icon: '🕐', label: 'Leer después', color: '#9a7dd4' },
  { key: 'Finalizado',   icon: '✅', label: 'Finalizados',  color: '#4caf7d' },
];

/* ─── Componente principal ───────────────────────────────── */
export default function PerfilLector() {
  const [open, setOpen]                     = useState(false);
  const [session, setSession]               = useState(null);
  const [profile, setProfile]               = useState(null);
  const [books, setBooks]                   = useState([]);
  const [items, setItems]                   = useState([]);
  const [notice, setNotice]                 = useState('');
  const [selected, setSelected]             = useState(null);
  const [activeList, setActiveList]         = useState(null); // config de lista abierta
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentSection, setCurrentSection] = useState(() => sessionStorage.getItem('ktb-section') || 'inicio');
  const fileRef = useRef(null);

  useEffect(() => {
    const h = () => setCurrentSection(sessionStorage.getItem('ktb-section') || 'inicio');
    window.addEventListener('ktb-section-change', h);
    return () => window.removeEventListener('ktb-section-change', h);
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
      if (!user.nombre || user.nombre === 'Lector') setShowOnboarding(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, c) => load(c));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (open) supabase.auth.getSession().then(({ data }) => load(data.session)); }, [open]);

  const selectedBooks = useMemo(() =>
    items.map((item) => ({ item, book: books.find((b) => String(b.id_libro) === String(item.id_libro)) }))
         .filter((r) => r.book),
  [items, books]);

  const group = (key) => selectedBooks.filter(({ item }) => item.estado === key);

  const saveNombre = async (nombre) => {
    if (!profile) return;
    await supabase.from('usuarios').update({ nombre }).eq('id_usuario', profile.id_usuario);
    setProfile((p) => ({ ...p, nombre }));
    setShowOnboarding(false);
  };

  /* Subir foto — intenta primero en biblioteca-archivos, con upsert */
  const handlePhotoUpload = async (file) => {
    if (!file || !profile) return;
    setUploadingPhoto(true);
    setNotice('');

    // Limpiar nombre del archivo
    const ext  = file.name.split('.').pop().toLowerCase();
    const path = `avatars/${profile.id_usuario}.${ext}`;

    // Primero intenta remove (silencioso), luego upload
    await supabase.storage.from('biblioteca-archivos').remove([path]);

    const { error: uploadError } = await supabase.storage
      .from('biblioteca-archivos')
      .upload(path, file, { cacheControl: '0', upsert: true, contentType: file.type });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      setNotice(`Error al subir: ${uploadError.message}`);
      setUploadingPhoto(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('biblioteca-archivos').getPublicUrl(path);
    const avatar_url = `${urlData.publicUrl}?v=${Date.now()}`;
    await supabase.from('usuarios').update({ avatar_url }).eq('id_usuario', profile.id_usuario);
    setProfile((p) => ({ ...p, avatar_url }));
    setUploadingPhoto(false);
    setNotice('¡Foto actualizada!');
  };

  const removeItem = async (item) => {
    await supabase.from('biblioteca_personal').delete().eq('id_biblioteca_personal', item.id_biblioteca_personal);
    setItems((prev) => prev.filter((i) => i.id_biblioteca_personal !== item.id_biblioteca_personal));
  };

  const login  = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  const logout = () => supabase.auth.signOut();

  return (
    <>
      {!/^admin/.test(currentSection) && (
        <button className="reader-profile-fab" onClick={() => setOpen(true)} title="Mi perfil">
          <UserRound /> Mi perfil
        </button>
      )}

      {showOnboarding && session && <OnboardingModal onSave={saveNombre} />}

      {open && (
        <div className="reader-profile-backdrop" onMouseDown={() => setOpen(false)}>
          <section className="reader-profile rp-new" onMouseDown={(e) => e.stopPropagation()}>
            <button className="reader-profile-close" onClick={() => setOpen(false)}><X /></button>

            {!session || !profile ? (
              <div className="reader-profile-empty">
                <UserRound />
                <h2>Tu perfil lector</h2>
                <p>Ingresá para guardar y organizar tus lecturas.</p>
                <button className="primary-button" onClick={login}><LogIn /> Acceder con Google</button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="rp-header">
                  <button className="rp-logout" onClick={logout} title="Cerrar sesión"><LogOut size={16} /></button>

                  <div className="rp-avatar-wrap">
                    <div className="rp-avatar">
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt="Avatar" />
                        : <span>{(profile.nombre || profile.email)[0].toUpperCase()}</span>}
                      <button className="rp-avatar-edit" onClick={() => fileRef.current?.click()} title="Cambiar foto" disabled={uploadingPhoto}>
                        <Camera size={13} />
                      </button>
                    </div>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(e.target.files?.[0])} />
                    {uploadingPhoto && <small className="rp-uploading">Subiendo…</small>}
                  </div>

                  <h2 className="rp-name">{profile.nombre} {profile.apellido || ''}</h2>
                  <p className="rp-email">{profile.email}</p>

                  <div className="rp-stats">
                    <div className="rp-stat">
                      <strong>{selectedBooks.length}</strong>
                      <span>libro{selectedBooks.length !== 1 ? 's' : ''} guardado{selectedBooks.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                {notice && <p className="rp-notice-bar">{notice}</p>}

                {/* Botones de lista */}
                <div className="rp-lists">
                  {LIST_CONFIG.map((cfg) => {
                    const count = group(cfg.key).length;
                    return (
                      <button key={cfg.key} className="rp-list-btn-main" onClick={() => setActiveList(cfg)}>
                        <span className="rp-list-icon">{cfg.icon}</span>
                        <span className="rp-list-label">{cfg.label}</span>
                        <span className="rp-list-count" style={{ background: cfg.color }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* Modal de lista */}
      {activeList && (
        <ListModal
          config={activeList}
          rows={group(activeList.key)}
          onClose={() => setActiveList(null)}
          onSelect={setSelected}
          onRemove={removeItem}
        />
      )}

      {selected && <ProfileBookModal book={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
