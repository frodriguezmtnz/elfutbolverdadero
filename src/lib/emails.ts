import nodemailer from 'nodemailer';
import { social } from '../config/social';

// Email de bienvenida de la Zona de Entrenadores. El constructor es puro
// (testable, sin env ni red); el envío usa el SMTP que proporciona Supabase
// (Site Settings → SMTP settings) y NUNCA lanza: devuelve false si no está
// configurado o falla, para que el webhook responda 200/204 igualmente.

export interface DatosBienvenida {
  email: string;
  origin: string;
  currentPeriodEnd?: string | null;
}

export function construirEmailBienvenida(d: DatosBienvenida): {
  subject: string;
  text: string;
  html: string;
} {
  const fin = d.currentPeriodEnd
    ? new Date(d.currentPeriodEnd).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const subject = 'Ya dentro: tu zona de entrenadores está activa';

  const enlaces = [
    ['Abrir mi panel', `${d.origin}/entrenadores/panel/`],
    ['Banco de ejercicios', `${d.origin}/entrenadores/ejercicios/`],
    ['Sesiones completas', `${d.origin}/entrenadores/sesiones/`],
    ['Herramientas descargables', `${d.origin}/entrenadores/herramientas/`],
    ['Metodología', `${d.origin}/entrenadores/metodologia/`],
    ['Voces de entrenadores', `${d.origin}/entrenadores/voces/`],
  ] as const;

  const text = [
    'Hola,',
    '',
    'Tu suscripción a Futbolverdadero Entrenadores ya está activa. Dentro tienes el banco de',
    'ejercicios con ficha imprimible, sesiones completas, plantillas y dossiers de metodología y',
    'la pregunta del mes de Voces de entrenadores.',
    '',
    ...enlaces.map(([t, u]) => `· ${t}: ${u}`),
    '',
    'No necesitas contraseña: cada vez que entres pides un enlace mágico a tu correo en',
    `${d.origin}/entrenadores/acceder/.`,
    fin ? `Tu suscripción se renueva antes del ${fin}.` : '',
    'Puedes gestionar o cancelar la renovación cuando quieras desde el panel.',
    '',
    'Cualquier cosa, escríbenos a ' + social.email + '.',
    '',
    'El Fútbol Verdadero',
    `Recibes este correo por haber contratado la suscripción: ${d.origin}/terminos-de-venta/.`,
  ]
    .filter(Boolean)
    .join('\n');

  const celdas = enlaces
    .map(
      ([t, u]) =>
        `<tr><td style="padding:6px 0;"><a href="${u}" style="color:#1b4d3e;font-weight:700;text-decoration:none;">${t} →</a></td></tr>`,
    )
    .join('');

  const html = `<div style="background:#f4f6f5;padding:28px 16px;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #d7e0db;border-radius:12px;padding:28px;">
    <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#ff5722;font-weight:bold;">Futbolverdadero Entrenadores</p>
    <h1 style="margin:10px 0 0;font-size:22px;line-height:1.2;color:#12241d;text-transform:uppercase;">Tu zona ya está abierta</h1>
    <p style="font-size:14px;line-height:1.7;color:#33413b;">Dentro tienes el banco de ejercicios con ficha imprimible, sesiones completas, plantillas y dossiers de metodología y la pregunta del mes de Voces de entrenadores.</p>
    <table role="presentation" style="font-family:Arial,sans-serif;font-size:14px;margin:14px 0;">${celdas}</table>
    <p style="font-size:13px;line-height:1.7;color:#33413b;">No necesitas contraseña: pide un <a href="${d.origin}/entrenadores/acceder/" style="color:#1b4d3e;font-weight:bold;">enlace mágico a tu correo</a> cada vez que entres${fin ? `. Tu suscripción se renueva antes del ${fin}` : ''}.</p>
    <p style="font-size:13px;color:#61706a;">¿Algo no funciona? Responde a este correo o escribe a <a href="mailto:${social.email}" style="color:#1b4d3e;">${social.email}</a>.</p>
    <p style="margin-top:22px;padding-top:14px;border-top:1px solid #e3e9e6;font-size:11px;color:#8a968f;">Te ha llegado este mensaje por contratar la suscripción. <a href="${d.origin}/terminos-de-venta/" style="color:#8a968f;">Términos de venta</a> · <a href="${d.origin}/politica-de-privacidad/" style="color:#8a968f;">Privacidad</a></p>
  </div>
</div>`;

  return { subject, text, html };
}

function envVar(nombre: string): string | undefined {
  return process.env[nombre]?.trim() || undefined;
}

export function smtpConfigurado(): boolean {
  return Boolean(envVar('SMTP_HOST') && envVar('SMTP_USER') && envVar('SMTP_PASS'));
}

/** Envía la bienvenida. Nunca lanza: el webhook debe poder responder igual. */
export async function enviarBienvenida(d: DatosBienvenida): Promise<boolean> {
  if (!smtpConfigurado()) return false;
  try {
    const port = Number(envVar('SMTP_PORT') ?? '465');
    const transport = nodemailer.createTransport({
      host: envVar('SMTP_HOST'),
      port,
      secure: port !== 587,
      auth: { user: envVar('SMTP_USER'), pass: envVar('SMTP_PASS') },
    });
    const { subject, text, html } = construirEmailBienvenida(d);
    await transport.sendMail({
      from: envVar('EMAIL_FROM') ?? `El Fútbol Verdadero <${social.email}>`,
      to: d.email,
      subject,
      text,
      html,
    });
    return true;
  } catch {
    return false;
  }
}
