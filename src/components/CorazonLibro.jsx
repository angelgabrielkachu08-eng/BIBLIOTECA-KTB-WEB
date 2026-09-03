import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './CorazonLibro.css';

export default function CorazonLibro() {
  const loaded = useRef(new WeakSet());
  useEffect(() => {
    let active = true;
    const addControl = async (modal) => {
      if (!active || loaded.current.has(modal) || modal.querySelector('.book-heart-save')) return;
      const title = modal.querySelector('.modal-content h2')?.textContent?.trim();
      if (!title) return;
      loaded.current.add(modal);
      const [{ data: sessionData }, { data: matchedBooks }] = await Promise.all([supabase.auth.getSession(), supabase.from('libros').select('id_libro,titulo').eq('titulo', title).limit(1)]);
      if (!active || !matchedBooks?.[0]) return;
      let profile = null; let previous = null;
      if (sessionData.session?.user?.email) {
        const { data: user } = await supabase.from('usuarios').select('id_usuario').eq('email', sessionData.session.user.email).maybeSingle(); profile = user;
        if (user) { const { data } = await supabase.from('biblioteca_personal').select('*').eq('id_usuario', user.id_usuario).eq('id_libro', matchedBooks[0].id_libro).maybeSingle(); previous = data; }
      }
      if (!active) return;
      const wrap = document.createElement('div'); wrap.className = 'book-heart-save';
      const button = document.createElement('button'); button.type = 'button'; button.className = previous ? 'heart-active' : ''; button.innerHTML = `<span aria-hidden="true">${previous ? '♥' : '♡'}</span> ${previous ? 'Guardado en mi perfil' : 'Guardar en mi perfil'}`;
      const select = document.createElement('select'); select.innerHTML = '<option value="">Elegir sección…</option><option>Leyendo</option><option>Leer después</option><option>Finalizado</option>'; select.value = previous?.estado || '';
      const message = document.createElement('small');
      const save = async (estado) => { if (!profile) { message.textContent = 'Ingresá con tu cuenta para guardar libros.'; return; } const request = previous ? supabase.from('biblioteca_personal').update({ estado, updated_at: new Date().toISOString() }).eq('id_biblioteca_personal', previous.id_biblioteca_personal).select().single() : supabase.from('biblioteca_personal').insert({ id_usuario: profile.id_usuario, id_libro: matchedBooks[0].id_libro, estado }).select().single(); const { data, error } = await request; if (error) { message.textContent = error.message; return; } previous = data || previous; button.className = 'heart-active'; button.innerHTML = '<span aria-hidden="true">♥</span> Guardado en mi perfil'; message.textContent = `Guardado en “${estado}”.`; };
      button.addEventListener('click', () => save(select.value || 'Leer después')); select.addEventListener('change', () => { if (select.value) save(select.value); });
      wrap.append(button, select, message); const actions = modal.querySelector('.modal-actions'); (actions?.parentElement || modal.querySelector('.modal-content'))?.insertBefore(wrap, actions || null);
    };
    const scan = () => document.querySelectorAll('.book-modal').forEach(addControl); const observer = new MutationObserver(scan); observer.observe(document.body, { childList: true, subtree: true }); scan(); return () => { active = false; observer.disconnect(); };
  }, []);
  return null;
}
