import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './CorazonLibro.css';

const ESTADOS = ['Leyendo', 'Leer después', 'Finalizado'];

function createCustomSelect(currentValue) {
  const wrap = document.createElement('div');
  wrap.className = 'csl-wrap';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'csl-trigger';

  const triggerText = document.createElement('span');
  triggerText.textContent = currentValue || 'Elegir sección…';
  if (!currentValue) triggerText.className = 'csl-placeholder';

  const chevron = document.createElement('span');
  chevron.className = 'csl-chevron';
  chevron.textContent = '⌄';

  trigger.append(triggerText, chevron);

  const dropdown = document.createElement('ul');
  dropdown.className = 'csl-dropdown';
  dropdown.style.display = 'none';
  dropdown.style.position = 'absolute';

  ESTADOS.forEach((estado) => {
    const li = document.createElement('li');
    li.className = 'csl-option' + (estado === currentValue ? ' selected' : '');
    li.textContent = estado;
    li.dataset.value = estado;
    dropdown.appendChild(li);
  });

  wrap.append(trigger, dropdown);

  let open = false;
  let selectedValue = currentValue || '';
  const listeners = [];

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    open = !open;
    dropdown.style.display = open ? 'block' : 'none';
    wrap.classList.toggle('csl-open', open);
  });

  document.addEventListener('click', () => {
    if (open) { open = false; dropdown.style.display = 'none'; wrap.classList.remove('csl-open'); }
  });

  dropdown.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const li = e.target.closest('.csl-option');
    if (!li) return;
    selectedValue = li.dataset.value;
    triggerText.textContent = selectedValue;
    triggerText.className = '';
    dropdown.querySelectorAll('.csl-option').forEach((o) => o.classList.toggle('selected', o.dataset.value === selectedValue));
    open = false;
    dropdown.style.display = 'none';
    wrap.classList.remove('csl-open');
    listeners.forEach((fn) => fn(selectedValue));
  });

  wrap.getValue = () => selectedValue;
  wrap.onChange = (fn) => listeners.push(fn);

  return wrap;
}

export default function CorazonLibro() {
  const loaded = useRef(new WeakSet());

  useEffect(() => {
    let active = true;

    const addControl = async (modal) => {
      if (!active || loaded.current.has(modal) || modal.querySelector('.book-heart-save')) return;
      const title = modal.querySelector('.modal-content h2')?.textContent?.trim();
      if (!title) return;
      loaded.current.add(modal);

      const [{ data: sessionData }, { data: matchedBooks }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from('libros').select('id_libro,titulo').eq('titulo', title).limit(1),
      ]);
      if (!active || !matchedBooks?.[0]) return;

      let profile = null;
      let previous = null;
      if (sessionData.session?.user?.email) {
        const { data: user } = await supabase.from('usuarios').select('id_usuario').eq('email', sessionData.session.user.email).maybeSingle();
        profile = user;
        if (user) {
          const { data } = await supabase.from('biblioteca_personal').select('*').eq('id_usuario', user.id_usuario).eq('id_libro', matchedBooks[0].id_libro).maybeSingle();
          previous = data;
        }
      }
      if (!active) return;

      const wrap = document.createElement('div');
      wrap.className = 'book-heart-save';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = previous ? 'heart-active' : '';
      button.innerHTML = `<span aria-hidden="true">${previous ? '♥' : '♡'}</span> ${previous ? 'Guardado en mi perfil' : 'Guardar en mi perfil'}`;

      const customSel = createCustomSelect(previous?.estado || '');
      const message = document.createElement('small');

      const save = async (estado) => {
        if (!profile) { message.textContent = 'Ingresá con tu cuenta para guardar libros.'; return; }
        const request = previous
          ? supabase.from('biblioteca_personal').update({ estado, updated_at: new Date().toISOString() }).eq('id_biblioteca_personal', previous.id_biblioteca_personal).select().single()
          : supabase.from('biblioteca_personal').insert({ id_usuario: profile.id_usuario, id_libro: matchedBooks[0].id_libro, estado }).select().single();
        const { data, error } = await request;
        if (error) { message.textContent = error.message; return; }
        previous = data || previous;
        button.className = 'heart-active';
        button.innerHTML = '<span aria-hidden="true">♥</span> Guardado en mi perfil';
        message.textContent = `Guardado en "${estado}".`;
      };

      button.addEventListener('click', () => save(customSel.getValue() || 'Leer después'));
      customSel.onChange((val) => { if (val) save(val); });

      wrap.append(button, customSel, message);
      const actions = modal.querySelector('.modal-actions');
      (actions?.parentElement || modal.querySelector('.modal-content'))?.insertBefore(wrap, actions || null);
    };

    const scan = () => document.querySelectorAll('.book-modal').forEach(addControl);
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => { active = false; observer.disconnect(); };
  }, []);

  return null;
}
