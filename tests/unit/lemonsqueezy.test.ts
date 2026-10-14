import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verificarFirmaLs, normalizarEventoLs } from '../../src/lib/lemonsqueezy';

describe('verificarFirmaLs', () => {
  const secreto = 'whsec_test';
  const cuerpo = JSON.stringify({ data: { id: '1', attributes: { status: 'active' } } });
  const firmaValida = createHmac('sha256', secreto).update(cuerpo, 'utf8').digest('hex');

  it('acepta la firma correcta', () => {
    expect(verificarFirmaLs(cuerpo, firmaValida, secreto)).toBe(true);
  });

  it('rechaza firma alterada, vacía o de otra longitud', () => {
    expect(verificarFirmaLs(cuerpo, firmaValida.replace(/^./, '0'), secreto)).toBe(false);
    expect(verificarFirmaLs(cuerpo, '', secreto)).toBe(false);
    expect(verificarFirmaLs(cuerpo, 'a'.repeat(10), secreto)).toBe(false);
  });

  it('cuerpo manipulado invalida una firma válida de otro body', () => {
    expect(verificarFirmaLs(cuerpo + ' ', firmaValida, secreto)).toBe(false);
  });
});

describe('normalizarEventoLs', () => {
  it('mapea renews_at como fin del periodo vigente', () => {
    const e = normalizarEventoLs({
      data: {
        id: 'sub-1',
        attributes: {
          status: 'active',
          user_email: 'Mister@Test.COM',
          renews_at: '2027-10-06T00:00:00Z',
          ends_at: null,
        },
      },
    });
    expect(e).toEqual({
      suscripcionId: 'sub-1',
      email: 'mister@test.com',
      status: 'active',
      currentPeriodEnd: '2027-10-06T00:00:00Z',
    });
  });

  it('sin renews_at usa ends_at (cancelación/expiración)', () => {
    const e = normalizarEventoLs({
      data: {
        id: 'sub-2',
        attributes: { status: 'cancelled', user_email: 'a@b.co', ends_at: '2026-12-01T00:00:00Z' },
      },
    });
    expect(e?.currentPeriodEnd).toBe('2026-12-01T00:00:00Z');
    expect(e?.status).toBe('cancelled');
  });

  it('devuelve null sin id, sin email o con payload basura', () => {
    expect(normalizarEventoLs(null)).toBeNull();
    expect(normalizarEventoLs({ data: {} })).toBeNull();
    expect(normalizarEventoLs({ data: { id: 'x', attributes: { status: 'active' } } })).toBeNull();
  });
});
