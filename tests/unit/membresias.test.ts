import { describe, it, expect } from 'vitest';
import {
  suscripcionActiva,
  sanearNext,
  estadoParaPanel,
  RUTA_POR_DEFECTO,
  type Membresia,
} from '../../src/lib/membresias';

const ahora = new Date('2026-10-06T12:00:00Z');
const futuro = '2027-10-06T12:00:00Z';
const pasado = '2026-01-06T12:00:00Z';

function m(partial: Partial<Membresia>): Membresia {
  return { email: 'mister@test.com', status: 'active', ...partial };
}

describe('suscripcionActiva', () => {
  it('active sin fecha de fin → válida', () => {
    expect(suscripcionActiva(m({ status: 'active' }), ahora)).toBe(true);
  });

  it('active con fin futuro → válida; con fin pasado → no', () => {
    expect(suscripcionActiva(m({ status: 'active', current_period_end: futuro }), ahora)).toBe(
      true,
    );
    expect(suscripcionActiva(m({ status: 'active', current_period_end: pasado }), ahora)).toBe(
      false,
    );
  });

  it('trialing se comporta como active', () => {
    expect(suscripcionActiva(m({ status: 'trialing' }), ahora)).toBe(true);
  });

  it('past_due mantiene acceso mientras el periodo no expire', () => {
    expect(suscripcionActiva(m({ status: 'past_due', current_period_end: futuro }), ahora)).toBe(
      true,
    );
    expect(suscripcionActiva(m({ status: 'past_due', current_period_end: pasado }), ahora)).toBe(
      false,
    );
  });

  it('cancelled mantiene el periodo ya pagado', () => {
    expect(suscripcionActiva(m({ status: 'cancelled', current_period_end: futuro }), ahora)).toBe(
      true,
    );
    expect(suscripcionActiva(m({ status: 'cancelled', current_period_end: pasado }), ahora)).toBe(
      false,
    );
  });

  it('expired, unpaid, paused y desconocidos → sin acceso', () => {
    for (const status of ['expired', 'unpaid', 'paused', 'unknown', 'none']) {
      expect(suscripcionActiva(m({ status, current_period_end: futuro }), ahora)).toBe(false);
    }
  });

  it('null → sin acceso', () => {
    expect(suscripcionActiva(null, ahora)).toBe(false);
  });

  it('fecha ilegible → sin acceso en active', () => {
    expect(
      suscripcionActiva(m({ status: 'active', current_period_end: 'no-es-fecha' }), ahora),
    ).toBe(true);
    expect(
      suscripcionActiva(m({ status: 'cancelled', current_period_end: 'no-es-fecha' }), ahora),
    ).toBe(false);
  });
});

describe('sanearNext', () => {
  it('conserva rutas internas de la zona', () => {
    expect(sanearNext('/entrenadores/suscribirse/')).toBe('/entrenadores/suscribirse/');
  });

  it('rechaza absolutas, protocol-relative y ajenas a la zona', () => {
    const bad = [
      'https://evil.example/',
      '//evil.example',
      '/otro-sitio/',
      'javascript:alert(1)',
      '/entrenadores-para-otros/',
    ];
    for (const n of bad) expect(sanearNext(n)).toBe(RUTA_POR_DEFECTO);
  });

  it('vacío/null → destino por defecto', () => {
    expect(sanearNext(null)).toBe(RUTA_POR_DEFECTO);
    expect(sanearNext('')).toBe(RUTA_POR_DEFECTO);
  });
});

describe('estadoParaPanel', () => {
  it('mapea activa / caducada / sin acceso', () => {
    expect(estadoParaPanel(m({ status: 'active', current_period_end: futuro }), ahora).clase).toBe(
      'activa',
    );
    expect(estadoParaPanel(m({ status: 'expired' }), ahora).clase).toBe('caducada');
    expect(estadoParaPanel(null, ahora).clase).toBe('sin-acceso');
  });

  it('activa formatea la fecha de caducidad en es-ES', () => {
    const e = estadoParaPanel(m({ status: 'active', current_period_end: futuro }), ahora);
    expect(e.hasta).toMatch(/\/2027/);
  });
});
