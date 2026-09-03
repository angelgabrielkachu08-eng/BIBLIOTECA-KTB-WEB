import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await request.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('FROM_EMAIL');
    if (!resendKey || !from) throw new Error('Faltan RESEND_API_KEY o FROM_EMAIL.');
    let recipients: string[] = [];
    let subject = '';
    let message = '';
    if (body.type === 'nueva_reserva') {
      const { data: admins, error } = await supabase.from('usuarios').select('email').eq('id_rol', 1);
      if (error) throw error;
      recipients = (admins || []).map((admin) => admin.email).filter(Boolean);
      subject = 'Nueva reserva: ' + body.bookTitle;
      message = (body.userName || 'Un lector') + ' solicitó ' + body.bookTitle + ' hasta ' + body.dueDate + '.';
    } else {
      recipients = body.userEmail ? [body.userEmail] : [];
      const approved = body.type === 'reserva_aprobada';
      subject = approved ? 'Tu reserva fue aprobada: ' + body.bookTitle : 'Actualización de tu reserva: ' + body.bookTitle;
      message = approved ? 'Hola ' + (body.userName || '') + ', tu reserva de ' + body.bookTitle + ' fue aprobada. Ya podés pasar a buscar el libro físico. Devolución: ' + body.dueDate + '.' : 'Hola ' + (body.userName || '') + ', no pudimos aprobar tu reserva de ' + body.bookTitle + '.';
    }
    if (!recipients.length) return Response.json({ sent: false }, { headers: corsHeaders });
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: recipients, subject, html: '<h2>Biblioteca KTB</h2><p>' + message + '</p>' }) });
    if (!response.ok) throw new Error(await response.text());
    return Response.json({ sent: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
});
