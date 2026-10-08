import { describe, it, expect } from 'vitest';
import { construirEmailBienvenida, smtpConfigurado, enviarBienvenida } from '../../src/lib/emails';

const origin = 'https://www.elfutbolverdadero.com';

describe('construirEmailBienvenida', () => {
  const base = { email: 'xabi@ejemplo.com', origin, currentPeriodEnd: '2027-10-15T00:00:00Z' };

  it('tiene asunto y texto con los enlaces clave', () => {
    const { subject, text } = construirEmailBienvenida(base);
    expect(subject.length).toBeGreaterThan(10);
    expect(text).toContain(`${origin}/entrenadores/panel/`);
    expect(text).toContain(`${origin}/entrenadores/acceder/`);
    expect(text).toContain(`${origin}/terminos-de-venta/`);
  });

  it('enlaza las secciones de la zona en el HTML', () => {
    const { html } = construirEmailBienvenida(base);
    for (const seccion of ['ejercicios', 'sesiones', 'herramientas', 'voces']) {
      expect(html).toContain(`${origin}/entrenadores/${seccion}/`);
    }
    expect(html).toContain(`${origin}/entrenadores/panel/`);
  });

  it('muestra la fecha de renovación legible en español', () => {
    const { text } = construirEmailBienvenida(base);
    expect(text).toMatch(/renueva antes del 1[56] de octubre de 2027/);
  });

  it('sin fecha de renovación no la menciona y no salen undefined', () => {
    const { text, html } = construirEmailBienvenida({ ...base, currentPeriodEnd: null });
    expect(text).not.toContain('renueva');
    expect(text).not.toContain('undefined');
    expect(html).not.toContain('undefined');
  });
});

describe('envío por SMTP', () => {
  it('sin credenciales SMTP no está configurado y no lanza', async () => {
    expect(smtpConfigurado()).toBe(false);
    await expect(enviarBienvenida({ email: 'a@b.c', origin })).resolves.toBe(false);
  });
});
