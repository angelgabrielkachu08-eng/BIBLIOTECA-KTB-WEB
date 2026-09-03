# Notificaciones por correo - Biblioteca KTB

La web invoca la función segura `notificar-reserva` cuando se crea o se aprueba
una reserva. Para activar los correos:

1. Creá una cuenta y un remitente verificado en Resend.
2. Desde la raíz del proyecto ejecutá:

```bash
supabase secrets set RESEND_API_KEY=tu_clave
supabase secrets set FROM_EMAIL="Biblioteca KTB <biblioteca@tu-dominio.com>"
supabase functions deploy notificar-reserva
supabase functions deploy recordatorios-vencimiento
```

3. Ejecutá `supabase_reservas_resenas_notificaciones.sql` en el SQL Editor de
   Supabase antes de usar la duración de las reservas.

La función busca los correos de usuarios con `id_rol = 1` y les avisa de nuevas
solicitudes. Al aprobarse, avisa al lector que puede retirar el ejemplar y detalla
su fecha límite de devolución.

Las claves de Resend no se incluyen en el frontend ni deben subirse a Git.

Para recordatorios automáticos, configurá un Cron Job diario en Supabase que
invoque la función recordatorios-vencimiento. Esta función avisa a los lectores
cuyos préstamos vencen hoy o dentro de los próximos dos días.
