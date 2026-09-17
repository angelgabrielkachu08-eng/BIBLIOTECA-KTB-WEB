import { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, CalendarClock, CheckCircle2, ClipboardPlus, FileText, Gavel, RefreshCw, Settings2, UserRound, X } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { supabase } from '../supabaseClient';
import './PrestamosPremium.css';
import { useModalLock } from '../useModalLock';

const EMAILJS_SERVICE  = 'service_zc0ntpc';
const EMAILJS_KEY      = 'PNsVufWyg73IVaqKF';
const TEMPLATE_APROBADA = 'template_8wiizfz';
const TEMPLATE_DENEGADA = 'template_69comxq';
/* eslint-disable no-useless-escape */

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date, days) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + Number(days)); return value.toISOString().slice(0, 10); };
const labelDate = (date) => date ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(`${date}T12:00:00`)) : '—';
const physical = (book) => /fisico|físico/i.test(String(book.tipo_libro || ''));

export default function PrestamosPremium() {
  const [profile, setProfile] = useState(null), [open, setOpen] = useState(false), [data, setData] = useState({ books: [], users: [], loans: [], details: [], reservations: [], penalties: [], renewals: [], policy: null }), [tab, setTab] = useState('panel'), [filter, setFilter] = useState('activos'), [notice, setNotice] = useState('');
  const [lend, setLend] = useState({ user: '', book: '', days: 7 }), [historyUser, setHistoryUser] = useState(''), [policyDraft, setPolicyDraft] = useState(null), [sanctionAlert, setSanctionAlert] = useState(null);
  const [currentSection, setCurrentSection] = useState(() => sessionStorage.getItem('ktb-section') || 'inicio');
  // Bloquear scroll cuando el panel o modal de sanción está abierto
  useModalLock(open || !!sanctionAlert);
  useEffect(() => {
    const handler = () => setCurrentSection(sessionStorage.getItem('ktb-section') || 'inicio');
    window.addEventListener('ktb-section-change', handler);
    return () => window.removeEventListener('ktb-section-change', handler);
  }, []);
  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession(); if (!session?.user?.email) return setProfile(null);
    const { data: current } = await supabase.from('usuarios').select('*').eq('email', session.user.email).maybeSingle(); setProfile(current || null); if (Number(current?.id_rol) !== 1) return;
    const tables = ['libros', 'usuarios', 'prestamos', 'detalle_prestamo', 'reservas', 'sanciones', 'renovaciones_prestamo', 'politicas_prestamo']; const result = await Promise.all(tables.map((table) => supabase.from(table).select('*')));
    const next = { books: result[0].data || [], users: result[1].data || [], loans: result[2].data || [], details: result[3].data || [], reservations: result[4].data || [], penalties: result[5].data || [], renewals: result[6].data || [], policy: result[7].data?.[0] || { id: 1, dias_prestamo: 7, max_renovaciones: 2, dias_tolerancia: 0, max_libros_por_usuario: 3, horas_retiro_reserva: 48 } };
    setData(next); setPolicyDraft(next.policy); setLend((old) => ({ ...old, days: next.policy.dias_prestamo }));
  };
  useEffect(() => { const timer = window.setTimeout(load, 0); const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load()); return () => { window.clearTimeout(timer); subscription.unsubscribe(); }; }, []);
  const flash = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 4200); };
  const bookFor = (loan) => data.books.find((book) => String(book.id_libro) === String(data.details.find((detail) => String(detail.id_prestamo) === String(loan.id_prestamo))?.id_libro));
  const active = data.loans.filter((loan) => String(loan.estado).toLowerCase() === 'activo').map((loan) => ({ loan, book: bookFor(loan) })).filter((row) => row.book);
  const overdue = active.filter(({ loan }) => loan.fecha_limite < today()); const soon = active.filter(({ loan }) => loan.fecha_limite >= today() && loan.fecha_limite <= addDays(today(), 2));
  const pending = data.reservations.filter((item) => !/aprobada|cancelada|rechazada/i.test(item.estado || ''));
  const visible = filter === 'vencidos' ? overdue : filter === 'proximos' ? soon : active;
  const loanable = data.books.filter((book) => physical(book) && Number(book.stock_disponible ?? book.stock ?? 0) > 0);
  const person = (id) => data.users.find((user) => String(user.id_usuario) === String(id));
  const registerLoan = async (event) => { event.preventDefault(); const book = data.books.find((item) => String(item.id_libro) === lend.book); if (!book || !lend.user) return flash('Seleccioná lector y libro.'); const activeForUser = active.filter(({ loan }) => String(loan.id_usuario) === lend.user).length; if (activeForUser >= Number(data.policy.max_libros_por_usuario)) return flash(`Este lector alcanzó el máximo de ${data.policy.max_libros_por_usuario} préstamos.`); const stock = Number(book.stock_disponible ?? book.stock ?? 0); if (stock < 1) return flash('El libro ya no tiene ejemplares disponibles.'); const deadline = addDays(today(), lend.days); const { data: newLoan, error } = await supabase.from('prestamos').insert({ id_usuario: Number(lend.user), fecha_prestamo: today(), fecha_limite: deadline, estado: 'activo' }).select().single(); if (error) return flash(error.message); const detail = await supabase.from('detalle_prestamo').insert({ id_prestamo: newLoan.id_prestamo, id_libro: book.id_libro, cantidad: 1 }); if (detail.error) return flash(detail.error.message); const stockResult = await supabase.from('libros').update({ stock_disponible: stock - 1 }).eq('id_libro', book.id_libro); if (stockResult.error) return flash(stockResult.error.message); setLend({ user: '', book: '', days: data.policy.dias_prestamo }); await load(); flash('Préstamo registrado.'); };
  const returnLoan = async (loan, book) => { const { error } = await supabase.from('prestamos').update({ estado: 'devuelto', fecha_devolucion: today() }).eq('id_prestamo', loan.id_prestamo); if (error) return flash(error.message); await supabase.from('libros').update({ stock_disponible: Number(book.stock_disponible ?? book.stock ?? 0) + 1 }).eq('id_libro', book.id_libro); await load(); flash('Devolución registrada y stock actualizado.'); };
  const renew = async (loan, book) => { const waiting = pending.some((item) => String(item.id_libro) === String(book.id_libro)); if (waiting) return flash('No se puede renovar: existe una reserva pendiente para este libro.'); const used = data.renewals.filter((item) => String(item.id_prestamo) === String(loan.id_prestamo)).length; if (used >= Number(data.policy.max_renovaciones)) return flash(`Este préstamo ya alcanzó ${data.policy.max_renovaciones} renovaciones.`); const base = loan.fecha_limite > today() ? loan.fecha_limite : today(); const newDate = addDays(base, data.policy.dias_prestamo); const { error } = await supabase.from('prestamos').update({ fecha_limite: newDate }).eq('id_prestamo', loan.id_prestamo); if (error) return flash(error.message); await supabase.from('renovaciones_prestamo').insert({ id_prestamo: loan.id_prestamo, fecha_limite_anterior: loan.fecha_limite, fecha_limite_nueva: newDate }); await load(); flash(`Renovado hasta ${labelDate(newDate)}.`); };
  const notifyEmail = async (templateId, params) => {
    try {
      console.log('[notifyEmail] template:', templateId, '| to:', params.to_email, '| book:', params.book_title);
      await emailjs.send(EMAILJS_SERVICE, templateId, params, EMAILJS_KEY);
      console.log('[notifyEmail] enviado OK a:', params.to_email);
    } catch (err) {
      console.error('[notifyEmail] error:', err);
    }
  };
  const approveReservation = async (reservation) => {
    const book = data.books.find((item) => String(item.id_libro) === String(reservation.id_libro));
    const user = person(reservation.id_usuario);
    try {
      const { error: errReserva } = await supabase.from('reservas').update({ estado: 'Aprobada' }).eq('id_reserva', reservation.id_reserva);
      if (errReserva) throw errReserva;
      const deadline = addDays(today(), Number(data.policy?.dias_prestamo ?? 7));
      const { data: newLoan, error: errPrestamo } = await supabase.from('prestamos').insert({ id_usuario: reservation.id_usuario, fecha_prestamo: today(), fecha_limite: deadline, estado: 'activo' }).select().single();
      if (errPrestamo) throw errPrestamo;
      const { error: errDetalle } = await supabase.from('detalle_prestamo').insert({ id_prestamo: newLoan.id_prestamo, id_libro: reservation.id_libro, cantidad: 1 });
      if (errDetalle) throw errDetalle;
      const stock = Number(book?.stock_disponible ?? book?.stock ?? 1);
      await supabase.from('libros').update({ stock_disponible: Math.max(0, stock - 1) }).eq('id_libro', reservation.id_libro);
      await notifyEmail(TEMPLATE_APROBADA, {
        to_email:   user?.email || '',
        user_name:  `${user?.nombre || ''} ${user?.apellido || ''}`.trim(),
        book_title: book?.titulo || 'tu libro',
        due_date:   labelDate(deadline),
        subject:    `Tu reserva fue aprobada — ${book?.titulo || 'tu libro'}`,
        message:    `Hola ${user?.nombre || 'lector/a'}, ¡tu reserva de "${book?.titulo || 'tu libro'}" fue aprobada! Ya podés pasar a retirarlo por la biblioteca. Tenés 24 horas para hacerlo, pasado ese plazo el pedido se cancela automáticamente. Fecha límite de devolución: ${labelDate(deadline)}.`,
      });
      await load();
      flash(`Reserva aprobada. Se notificó a ${user?.email || 'el lector'}.`);
    } catch (err) { flash('Error al aprobar la reserva: ' + err.message); }
  };
  const denyReservation = async (reservation) => {
    const book = data.books.find((item) => String(item.id_libro) === String(reservation.id_libro));
    const user = person(reservation.id_usuario);
    try {
      const { error } = await supabase.from('reservas').update({ estado: 'Rechazada' }).eq('id_reserva', reservation.id_reserva);
      if (error) throw error;
      await notifyEmail(TEMPLATE_DENEGADA, {
        to_email:   user?.email || '',
        user_name:  `${user?.nombre || ''} ${user?.apellido || ''}`.trim(),
        book_title: book?.titulo || 'tu libro',
        subject:    `Sobre tu reserva — ${book?.titulo || 'tu libro'}`,
        message:    `Hola ${user?.nombre || 'lector/a'}, en este momento tenemos inconvenientes para procesar tu reserva de "${book?.titulo || 'tu libro'}" por este medio. Te pedimos disculpas. Podés acercarte a la biblioteca para consultas, préstamos o más información.`,
      });
      await load();
      flash(`Reserva denegada. Se notificó a ${user?.email || 'el lector'}.`);
    } catch (err) { flash('Error al denegar la reserva: ' + err.message); }
  };
  const sanctionUser = async (loan, user) => {
    if (!user) return flash('No se encontró el usuario.');
    const fechaFin = addDays(today(), 30);
    const { error } = await supabase.from('sanciones').insert({
      id_prestamo: loan.id_prestamo,
      id_usuario:  loan.id_usuario,
      motivo:      'Devolución fuera de término',
      estado:      'Pendiente',
      fecha_sancion:       today(),
      fecha_fin_suspension: fechaFin,
    });
    if (error) return flash('Error al registrar sanción: ' + error.message);
    setSanctionAlert(null);
    await load();
    flash(`${user.nombre} ${user.apellido} suspendido/a hasta ${labelDate(fechaFin)}.`);
  };

  // Detectar préstamos vencidos sin sanción activa y mostrar alerta una por una
  const checkOverdueForSanction = () => {
    if (overdue.length === 0) return;
    for (const { loan, book } of overdue) {
      const user = person(loan.id_usuario);
      const alreadySanctioned = data.penalties.some(
        (p) => String(p.id_prestamo) === String(loan.id_prestamo) &&
               !/resuelta|anulada/i.test(p.estado || '')
      );
      if (!alreadySanctioned) {
        setSanctionAlert({ loan, book, user });
        return; // muestra una alerta a la vez
      }
    }
  };

  const savePolicy = async (event) => { event.preventDefault(); const payload = { ...policyDraft, id: 1, updated_at: new Date().toISOString() }; const { error } = await supabase.from('politicas_prestamo').upsert(payload); if (error) return flash(`Primero ejecutá el SQL de préstamos premium. ${error.message}`); await load(); flash('Políticas actualizadas.'); };
  const receipt = (loan, book) => { const user = person(loan.id_usuario); const escape = (value) => String(value || '').replace(/[&<>\"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char])); const content = `<!doctype html><html><head><meta charset="utf-8"><title>Comprobante Biblioteca KTB</title><style>body{font-family:Arial;color:#46121d;margin:42px}header{border-bottom:3px solid #a07932;padding-bottom:16px}h1{font-family:Georgia;margin:0}table{margin-top:24px;border-collapse:collapse;width:100%}td{padding:11px;border-bottom:1px solid #ddd}td:first-child{font-weight:bold;width:35%}footer{margin-top:25px;color:#8d2639;font-size:12px}</style></head><body><header><h1>Biblioteca KTB</h1><p>Comprobante de préstamo</p></header><table><tr><td>Libro</td><td>${escape(book.titulo)}</td></tr><tr><td>Lector</td><td>${escape(`${user?.nombre || ''} ${user?.apellido || ''}`)}</td></tr><tr><td>Correo</td><td>${escape(user?.email)}</td></tr><tr><td>Prestado</td><td>${escape(labelDate(loan.fecha_prestamo))}</td></tr><tr><td>Devolver antes de</td><td>${escape(labelDate(loan.fecha_limite))}</td></tr></table><footer>Biblioteca KTB · Presentar este comprobante al retirar o devolver el ejemplar.</footer></body></html>`; const blob = new Blob(['\ufeff', content], { type: 'application/msword;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `Biblioteca-KTB-Comprobante-${loan.id_prestamo}.doc`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); flash('Comprobante descargado.'); };
  if (Number(profile?.id_rol) !== 1) return null;
  const hideFloating = /^admin/.test(currentSection);
  const selectedHistory = data.users.find((user) => String(user.id_usuario) === historyUser); const history = data.loans.filter((loan) => String(loan.id_usuario) === historyUser);
  return <>
    {/* Modal de confirmación de sanción */}
    {sanctionAlert && (
      <div className="sanction-backdrop">
        <div className="sanction-modal">
          <AlertTriangle size={28} className="sanction-icon" />
          <h4>Préstamo vencido</h4>
          <p>
            <strong>{sanctionAlert.user?.nombre} {sanctionAlert.user?.apellido}</strong> no devolvió
            <em> {sanctionAlert.book?.titulo}</em> (venció el {labelDate(sanctionAlert.loan.fecha_limite)}).
          </p>
          <p className="sanction-sub">¿Querés aplicar una suspensión de 30 días? El usuario no podrá hacer reservas físicas durante ese período.</p>
          <div className="sanction-actions">
            <button className="btn-accept" onClick={() => sanctionUser(sanctionAlert.loan, sanctionAlert.user)}>
              <CheckCircle2 size={14} /> Sancionar
            </button>
            <button className="btn-deny" onClick={() => setSanctionAlert(null)}>
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    {!hideFloating && overdue.length > 0 && (
      <button className="loan-fab-alert danger" onClick={() => { setOpen(true); setTab('panel'); setFilter('vencidos'); load(); }}>
        <AlertTriangle size={15} />
        {overdue.length} préstamo{overdue.length > 1 ? 's' : ''} vencido{overdue.length > 1 ? 's' : ''} sin devolver
      </button>
    )}
    {!hideFloating && soon.length > 0 && (
      <button className="loan-fab-alert warning" onClick={() => { setOpen(true); setTab('panel'); setFilter('proximos'); load(); }}>
        <AlertTriangle size={15} />
        {soon.length} préstamo{soon.length > 1 ? 's' : ''} vence{soon.length > 1 ? 'n' : ''} en menos de 2 días
      </button>
    )}
    {!hideFloating && <button className="loan-premium-fab" onClick={() => { setOpen(true); load().then(checkOverdueForSanction); }}><ClipboardPlus /> Gestión rápida</button>}{open && <div className="loan-premium-backdrop" onMouseDown={() => setOpen(false)}><section className="loan-premium" onMouseDown={(event) => event.stopPropagation()}><button className="loan-premium-close" onClick={() => setOpen(false)}><X /></button><header><div><span>ADMINISTRACIÓN</span><h2>Préstamos físicos</h2><p>Control de ejemplares, lectores, vencimientos y reglas.</p></div><div className="loan-tabs">{[['panel','Panel'],['nuevo','Nuevo préstamo'],['historial','Lectores'],['sanciones','Sanciones'],['politicas','Políticas']].map(([id,label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{id === 'panel' ? <CalendarClock /> : id === 'nuevo' ? <ClipboardPlus /> : id === 'historial' ? <UserRound /> : id === 'sanciones' ? <Gavel /> : <Settings2 />}{label}</button>)}</div></header>{notice && <div className="loan-notice">{notice}</div>}{tab === 'panel' && <><div className="loan-alerts"><Alert title="Vencidos" value={overdue.length} tone="danger" /><Alert title="Vencen en 2 días" value={soon.length} tone="warning" /><Alert title="Reservas en espera" value={pending.length} tone="gold" /><Alert title="Préstamos activos" value={active.length} tone="plain" /></div><div className="loan-filter"><button className={filter === 'activos' ? 'active' : ''} onClick={() => setFilter('activos')}>Activos</button><button className={filter === 'proximos' ? 'active' : ''} onClick={() => setFilter('proximos')}>Próximos</button><button className={filter === 'vencidos' ? 'active' : ''} onClick={() => setFilter('vencidos')}>Vencidos</button></div><section className="loan-list">{visible.map(({ loan, book }) => { const user = person(loan.id_usuario); const late = loan.fecha_limite < today(); const renewals = data.renewals.filter((item) => String(item.id_prestamo) === String(loan.id_prestamo)).length; return <article key={loan.id_prestamo} className={late ? 'late' : ''}><BookOpen /><div><strong>{book.titulo}</strong><span>{user?.nombre} {user?.apellido} · {user?.email}</span><small>{late ? 'VENCIDO · ' : 'Vence: '}{labelDate(loan.fecha_limite)} · {renewals}/{data.policy.max_renovaciones} renovaciones</small></div><div className="loan-row-actions"><button onClick={() => renew(loan, book)}><RefreshCw /> Renovar</button><button onClick={() => receipt(loan, book)}><FileText /> Comprobante</button><button className="return" onClick={() => returnLoan(loan, book)}><CheckCircle2 /> Devolver</button></div></article>; })}{!visible.length && <p className="loan-empty">No hay préstamos en este estado.</p>}</section><section className="reservation-queue"><h3>Cola de reservas</h3>{pending.map((reservation) => { const book = data.books.find((item) => String(item.id_libro) === String(reservation.id_libro)); const queue = pending.filter((item) => String(item.id_libro) === String(reservation.id_libro)).sort((a,b) => String(a.fecha_reserva).localeCompare(String(b.fecha_reserva))); const place = queue.findIndex((item) => String(item.id_reserva) === String(reservation.id_reserva)) + 1; const user = person(reservation.id_usuario); return <article key={reservation.id_reserva} className="reservation-queue-item"><div className="reservation-queue-info"><b>#{place}</b><span className="reservation-queue-book">{book?.titulo || '—'}</span><span className="reservation-queue-user">{user?.nombre} {user?.apellido} · <a href={`mailto:${user?.email}`}>{user?.email}</a></span><span className="reservation-queue-date">solicitada {labelDate(reservation.fecha_reserva)}</span></div><div className="reservation-queue-actions"><button className="btn-accept" onClick={() => approveReservation(reservation)}><CheckCircle2 size={14}/> Aceptar</button><button className="btn-deny" onClick={() => denyReservation(reservation)}><X size={14}/> Denegar</button></div></article>; })}{!pending.length && <p>No hay reservas pendientes.</p>}</section></>}{tab === 'nuevo' && <form className="quick-loan-form" onSubmit={registerLoan}><h3><ClipboardPlus /> Registrar préstamo</h3><label>Lector<select required value={lend.user} onChange={(event) => setLend({ ...lend, user: event.target.value })}><option value="">Buscar o seleccionar lector…</option>{data.users.map((user) => <option key={user.id_usuario} value={user.id_usuario}>{user.nombre} {user.apellido} · {user.email}</option>)}</select></label><label>Libro físico disponible<select required value={lend.book} onChange={(event) => setLend({ ...lend, book: event.target.value })}><option value="">Seleccionar libro…</option>{loanable.map((book) => <option key={book.id_libro} value={book.id_libro}>{book.titulo} · {book.stock_disponible ?? book.stock} disponibles</option>)}</select></label><label>Días de préstamo<input type="number" min="1" max="60" value={lend.days} onChange={(event) => setLend({ ...lend, days: event.target.value })}/></label><p>La devolución se registrará para el <b>{labelDate(addDays(today(), lend.days))}</b>.</p><button className="primary-button"><CheckCircle2 /> Confirmar préstamo</button></form>}{tab === 'historial' && <section className="reader-history"><h3><UserRound /> Historial del lector</h3><select value={historyUser} onChange={(event) => setHistoryUser(event.target.value)}><option value="">Seleccionar lector…</option>{data.users.map((user) => <option key={user.id_usuario} value={user.id_usuario}>{user.nombre} {user.apellido} · {user.email}</option>)}</select>{selectedHistory && <div className="history-summary"><strong>{selectedHistory.nombre} {selectedHistory.apellido}</strong><span>{history.filter((loan) => String(loan.estado).toLowerCase() === 'activo').length} activos · {history.filter((loan) => String(loan.estado).toLowerCase() === 'devuelto').length} devueltos · {data.penalties.filter((item) => String(item.id_usuario) === historyUser && !/resuelta|anulada/i.test(item.estado || '')).length} sanciones pendientes</span>{history.map((loan) => <p key={loan.id_prestamo}>{bookFor(loan)?.titulo || 'Libro'} · {String(loan.estado).toUpperCase()} · {labelDate(loan.fecha_prestamo)} → {labelDate(loan.fecha_limite)}</p>)}</div>}</section>}{tab === 'sanciones' && (() => {
  const activeSanctions = data.penalties.filter((p) => !/resuelta|anulada/i.test(p.estado || ''));
  const liftSanction = async (penalty) => {
    const { error } = await supabase.from('sanciones').update({ estado: 'Resuelta' }).eq('id_sancion', penalty.id_sancion);
    if (error) return flash('Error al levantar sanción: ' + error.message);
    await load();
    flash('Sanción levantada. El usuario puede volver a reservar.');
  };
  return <section className="sanctions-panel">
    <h3><Gavel /> Sanciones activas</h3>
    {activeSanctions.length === 0 && <p className="loan-empty">No hay usuarios sancionados actualmente.</p>}
    {activeSanctions.map((penalty) => {
      const user = person(penalty.id_usuario);
      const suspended = penalty.fecha_fin_suspension && penalty.fecha_fin_suspension >= today();
      const daysLeft = penalty.fecha_fin_suspension
        ? Math.max(0, Math.ceil((new Date(`${penalty.fecha_fin_suspension}T12:00:00`) - new Date()) / 86400000))
        : null;
      return <article key={penalty.id_sancion} className="sanction-row">
        <div className="sanction-row-info">
          <strong>{user?.nombre} {user?.apellido}</strong>
          <span>{user?.email}</span>
          <span className="sanction-motivo">{penalty.motivo || 'Sin motivo'} · {labelDate(penalty.fecha_sancion)}</span>
          {suspended
            ? <small className="sanction-active">🔴 Suspendido hasta {labelDate(penalty.fecha_fin_suspension)} ({daysLeft} día{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''})</small>
            : <small className="sanction-expired">🟡 Suspensión vencida · pendiente de resolución</small>}
        </div>
        <button className="btn-deny" onClick={() => liftSanction(penalty)}>
          <CheckCircle2 size={13} /> Levantar
        </button>
      </article>;
    })}
    <div className="sanctions-summary">
      <span>{data.penalties.filter((p) => /resuelta/i.test(p.estado || '')).length} sanciones resueltas en el historial</span>
    </div>
  </section>;
})()}{tab === 'politicas' && <form className="policy-form" onSubmit={savePolicy}><h3><Settings2 /> Políticas editables</h3><p>Estas reglas se aplican al nuevo panel de préstamos físicos.</p>{[['dias_prestamo','Días por defecto'],['max_renovaciones','Máximo de renovaciones'],['dias_tolerancia','Días de tolerancia'],['max_libros_por_usuario','Máximo de libros por lector'],['horas_retiro_reserva','Horas para retirar reserva']].map(([field,label]) => <label key={field}>{label}<input type="number" min="0" value={policyDraft?.[field] ?? ''} onChange={(event) => setPolicyDraft({ ...policyDraft, [field]: Number(event.target.value) })}/></label>)}<button className="primary-button">Guardar políticas</button></form>}</section></div>}</>;
}
function Alert({ title, value, tone }) { return <article className={`loan-alert ${tone}`}><AlertTriangle /><div><span>{title}</span><strong>{value}</strong></div></article>; }
