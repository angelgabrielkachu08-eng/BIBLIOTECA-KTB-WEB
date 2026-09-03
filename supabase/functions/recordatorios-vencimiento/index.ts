import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('FROM_EMAIL');
  if (!resendKey || !from) return new Response('Faltan secretos de correo', { status: 500 });
  const today = new Date();
  const end = new Date(today); end.setDate(end.getDate() + 2);
  const startDate = today.toISOString().slice(0, 10), endDate = end.toISOString().slice(0, 10);
  const [{ data: loans, error }, { data: users }, { data: details }, { data: books }] = await Promise.all([
    supabase.from('prestamos').select('*').eq('estado', 'activo').gte('fecha_limite', startDate).lte('fecha_limite', endDate),
    supabase.from('usuarios').select('id_usuario,nombre,email'),
    supabase.from('detalle_prestamo').select('id_prestamo,id_libro'),
    supabase.from('libros').select('id_libro,titulo')
  ]);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  for (const loan of loans || []) {
    const user = (users || []).find((item) => item.id_usuario === loan.id_usuario);
    const detail = (details || []).find((item) => item.id_prestamo === loan.id_prestamo);
    const book = (books || []).find((item) => item.id_libro === detail?.id_libro);
    if (!user?.email) continue;
    await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [user.email], subject: 'Recordatorio de devolución - Biblioteca KTB', html: '<h2>Biblioteca KTB</h2><p>Hola ' + (user.nombre || '') + ', recordamos que ' + (book?.titulo || 'tu libro') + ' vence el ' + loan.fecha_limite + '.</p>' }) });
  }
  return Response.json({ sent: (loans || []).length });
});
