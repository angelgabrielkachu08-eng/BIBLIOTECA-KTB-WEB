import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './ModalidadHibrida.css';

const HYBRID = 'Físico y virtual';

export default function ModalidadHibrida() {
  useEffect(() => {
    const installForm = (form) => {
      const modality = [...form.querySelectorAll('select')].find((select) => [...select.options].some((option) => option.value === 'Físico') && [...select.options].some((option) => option.value === 'Virtual'));
      if (!modality) return;
      if (![...modality.options].some((option) => option.value === HYBRID)) { const option = document.createElement('option'); option.value = HYBRID; option.textContent = HYBRID; modality.append(option); }
      if (!modality.dataset.hybridListener) { modality.dataset.hybridListener = 'true'; modality.addEventListener('change', () => { if (modality.value === HYBRID) { form.dataset.hybridMode = 'true'; installForm(form); } else { delete form.dataset.hybridMode; form.querySelector('.hybrid-book-fields')?.remove(); } }); }
      if (form.dataset.hybridMode === 'true') modality.value = HYBRID;
      if ((modality.value !== HYBRID && form.dataset.hybridMode !== 'true') || form.querySelector('.hybrid-book-fields')) return;
      const titleInput = [...form.querySelectorAll('input')].find((input) => input.required); if (!titleInput) return;
      const fields = document.createElement('div'); fields.className = 'hybrid-book-fields wide';
      fields.innerHTML = '<strong>Formato físico y virtual</strong><p>Este ejemplar podrá prestarse físicamente y también leerse online.</p><label><span>Ejemplares disponibles</span><input class="hybrid-stock" type="number" min="1" value="1"/></label><label><span>URL pública del PDF</span><input class="hybrid-pdf-url" type="url" placeholder="URL del PDF en Supabase Storage"/></label><label><span>o subir PDF a Supabase Storage</span><input class="hybrid-pdf-upload" type="file" accept="application/pdf"/><small class="hybrid-status">PDF opcional; al cargarlo aparecerá “Leer online”.</small></label>';
      const urlInput = fields.querySelector('.hybrid-pdf-url'); const fileInput = fields.querySelector('.hybrid-pdf-upload'); const stockInput = fields.querySelector('.hybrid-stock'); const status = fields.querySelector('.hybrid-status'); let pdfUrl = '';
      fileInput.addEventListener('change', async () => { const file = fileInput.files?.[0]; if (!file) return; status.textContent = 'Subiendo PDF…'; fileInput.disabled = true; const path = `pdfs/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`; const { error } = await supabase.storage.from('biblioteca-archivos').upload(path, file, { upsert: false, contentType: file.type }); if (error) { status.textContent = `No se pudo subir: ${error.message}`; fileInput.disabled = false; return; } const { data } = supabase.storage.from('biblioteca-archivos').getPublicUrl(path); pdfUrl = data.publicUrl; urlInput.value = pdfUrl; status.textContent = 'PDF conectado a Supabase Storage.'; fileInput.disabled = false; });
      form.addEventListener('submit', () => { const title = titleInput.value.trim(); const stock = Math.max(1, Number(stockInput.value) || 1); const url = pdfUrl || urlInput.value.trim(); if (!title) return; const persist = async (attempt = 0) => { const { data: found } = await supabase.from('libros').select('id_libro').eq('titulo', title).order('id_libro', { ascending: false }).limit(1); const book = found?.[0]; if (!book && attempt < 9) return window.setTimeout(() => persist(attempt + 1), 450); if (book) { const { error } = await supabase.from('libros').update({ stock, stock_disponible: stock, archivo_pdf: url || null, tipo_libro: HYBRID }).eq('id_libro', book.id_libro); status.textContent = error ? `No se pudo completar el formato: ${error.message}` : 'Libro físico y virtual guardado correctamente.'; } }; window.setTimeout(persist, 500); }, { once: true });
      const textarea = form.querySelector('textarea'); textarea?.closest('label')?.insertAdjacentElement('beforebegin', fields);
    };
    const fixModal = async (modal) => { if (modal.dataset.hybridChecked) return; modal.dataset.hybridChecked = 'true'; const title = modal.querySelector('.modal-content h2')?.textContent?.trim(); if (!title) return; const { data: found } = await supabase.from('libros').select('tipo_libro').eq('titulo', title).limit(1); if (found?.[0]?.tipo_libro !== HYBRID) return; const modality = modal.querySelector('.metadata span'); if (modality) { const text = [...modality.childNodes].find((node) => node.nodeType === Node.TEXT_NODE); if (text) text.nodeValue = HYBRID; } };
    const scan = () => { document.querySelectorAll('.book-form').forEach(installForm); document.querySelectorAll('.book-modal').forEach(fixModal); };
    const observer = new MutationObserver(scan); observer.observe(document.body, { childList: true, subtree: true }); scan(); return () => observer.disconnect();
  }, []);
  return null;
}
