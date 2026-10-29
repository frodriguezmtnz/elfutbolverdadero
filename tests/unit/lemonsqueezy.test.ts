import { describe, it, expect, afterEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  verificarFirmaLs,
  normalizarEventoLs,
  esVarianteEsperada,
  crearCheckoutLs,
} from '../../src/lib/lemonsqueezy';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

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
      variantId: null,
    });
  });

  it('prefiere el email de meta.custom_data (el que pidió el magic link)', () => {
    const e = normalizarEventoLs({
      meta: { custom_data: { email: 'Cuenta@Test.COM', desistimiento: 'aceptado' } },
      data: {
        id: 'sub-3',
        attributes: {
          status: 'active',
          user_email: 'otro@test.com',
          variant_id: 104,
          renews_at: '2027-10-06T00:00:00Z',
        },
      },
    });
    expect(e?.email).toBe('cuenta@test.com');
    expect(e?.variantId).toBe('104');
  });

  it('usa user_email cuando custom_data no trae email', () => {
    const e = normalizarEventoLs({
      meta: { custom_data: { desistimiento: 'aceptado' } },
      data: { id: 'sub-4', attributes: { status: 'active', user_email: 'a@b.co' } },
    });
    expect(e?.email).toBe('a@b.co');
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

describe('esVarianteEsperada', () => {
  const evento = {
    suscripcionId: 'sub',
    email: 'a@b.co',
    status: 'active',
    currentPeriodEnd: null,
    variantId: '104',
  };

  it('acepta la variante suscrita y no bloquea si el payload no la trae', () => {
    expect(esVarianteEsperada(evento, '104')).toBe(true);
    expect(esVarianteEsperada({ ...evento, variantId: null }, '104')).toBe(true);
    expect(esVarianteEsperada(evento, null)).toBe(true);
  });

  it('rechaza eventos de otra variante de la tienda', () => {
    expect(esVarianteEsperada(evento, '999')).toBe(false);
  });
});

describe('crearCheckoutLs', () => {
  it('prellena el email y coloca el redirect de vuelta en product_options', async () => {
    vi.stubEnv('LS_API_KEY', 'test-key');
    vi.stubEnv('LS_STORE_ID', 'test-store');
    vi.stubEnv('LS_VARIANT_ID', 'test-variant');
    const fetchMock = vi.fn<
      (input: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(
      async () =>
        new Response(
          JSON.stringify({ data: { attributes: { url: 'https://ls.test/checkout' } } }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const url = await crearCheckoutLs('socio@test.com', 'https://www.test.com');
    expect(url).toBe('https://ls.test/checkout');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.data.attributes.checkout_data.email).toBe('socio@test.com');
    expect(body.data.attributes.checkout_data.custom.email).toBe('socio@test.com');
    expect(body.data.attributes.checkout_data.pre_filled).toBeUndefined();
    expect(body.data.attributes.product_options.redirect_url).toBe(
      'https://www.test.com/entrenadores/auth/suscrito/?origen=checkout',
    );
    expect(body.data.attributes.checkout_options).toBeUndefined();
  });

  it('devuelve null si falta configuración o la API falla', async () => {
    expect(await crearCheckoutLs('a@b.co', 'https://www.test.com')).toBeNull();

    vi.stubEnv('LS_API_KEY', 'test-key');
    vi.stubEnv('LS_STORE_ID', 'test-store');
    vi.stubEnv('LS_VARIANT_ID', 'test-variant');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    );
    expect(await crearCheckoutLs('a@b.co', 'https://www.test.com')).toBeNull();
  });
});
