import { describe, it, expect } from 'vitest';
import {
  clasificarRuta,
  normalizarRuta,
  decidirAcceso,
  puedeVerContenido,
  type ContextoAcceso,
} from '../../src/lib/acceso-entrenadores';

const anonimo: ContextoAcceso = {
  configurado: true,
  email: null,
  origen: '/entrenadores/panel/',
  suscripcionViva: false,
};
const conSesion = (extra: Partial<ContextoAcceso> = {}): ContextoAcceso => ({
  configurado: true,
  email: 'mister@test.com',
  origen: '/entrenadores/sesiones/x/',
  suscripcionViva: false,
  ...extra,
});

describe('normalizarRuta', () => {
  it('quita barras finales y respeta la raíz', () => {
    expect(normalizarRuta('/entrenadores/panel//')).toBe('/entrenadores/panel');
    expect(normalizarRuta('/')).toBe('/');
  });
});

describe('clasificarRuta', () => {
  it('landing y login son públicas', () => {
    expect(clasificarRuta('/entrenadores')).toBe('publica');
    expect(clasificarRuta('/entrenadores/')).toBe('publica');
    expect(clasificarRuta('/entrenadores/acceder/')).toBe('publica');
    expect(clasificarRuta('/entrenadores/auth/callback')).toBe('publica');
  });
  it('catálogo y fichas son teaser (públicas con candado por página)', () => {
    expect(clasificarRuta('/entrenadores/ejercicios')).toBe('teaser');
    expect(clasificarRuta('/entrenadores/ejercicios/rondos/')).toBe('teaser');
    expect(clasificarRuta('/entrenadores/sesiones/')).toBe('teaser');
    expect(clasificarRuta('/entrenadores/sesiones/presion-tras-perdida/')).toBe('teaser');
    expect(clasificarRuta('/entrenadores/herramientas/')).toBe('teaser');
    expect(clasificarRuta('/entrenadores/herramientas/plantilla-sesion/')).toBe('teaser');
  });
  it('panel y suscribirse solo exigen sesión', () => {
    expect(clasificarRuta('/entrenadores/panel/')).toBe('solo-sesion');
    expect(clasificarRuta('/entrenadores/suscribirse')).toBe('solo-sesion');
  });
  it('cualquier otra ruta de la zona es premium (fail-closed)', () => {
    expect(clasificarRuta('/entrenadores/metodologia/mi-dossier/')).toBe('premium');
    expect(clasificarRuta('/entrenadores/voces/pregunta-del-mes/')).toBe('premium');
    expect(clasificarRuta('/entrenadores/no-existe')).toBe('premium');
  });
  it('rutas fuera de la zona y prefijos falsos no se ven afectados', () => {
    expect(clasificarRuta('/blog/post/')).toBe('publica');
    expect(clasificarRuta('/entrenadoresdos')).toBe('publica');
    expect(clasificarRuta('/entrenadores-ejercicios')).toBe('publica');
  });
});

describe('decidirAcceso', () => {
  it('públicas y teaser pasan siempre, incluso sin Supabase configurado', () => {
    expect(decidirAcceso('publica', { ...anonimo, configurado: false })).toEqual({
      accion: 'next',
    });
    expect(decidirAcceso('teaser', { ...anonimo, configurado: false })).toEqual({
      accion: 'next',
    });
  });
  it('sin Supabase configurado, lo privado redirige con aviso (fail-closed)', () => {
    expect(decidirAcceso('premium', { ...anonimo, configurado: false })).toEqual({
      accion: 'redirect',
      destino: '/entrenadores/acceder/?aviso=config',
    });
    expect(decidirAcceso('solo-sesion', { ...anonimo, configurado: false })).toEqual({
      accion: 'redirect',
      destino: '/entrenadores/acceder/?aviso=config',
    });
  });
  it('anónimo → login con ?next= codificado', () => {
    const d = decidirAcceso('premium', {
      ...anonimo,
      origen: '/entrenadores/sesiones/mi-sesion/?x=1',
    });
    expect(d).toEqual({
      accion: 'redirect',
      destino: `/entrenadores/acceder/?next=${encodeURIComponent('/entrenadores/sesiones/mi-sesion/?x=1')}`,
    });
  });
  it('MAGIC LINK SIN PAGO: sesión → entra en panel/suscribirse pero NO en premium', () => {
    expect(decidirAcceso('solo-sesion', conSesion())).toEqual({ accion: 'next' });
    expect(decidirAcceso('premium', conSesion({ suscripcionViva: false }))).toEqual({
      accion: 'redirect',
      destino: '/entrenadores/panel/?motivo=suscripcion',
    });
  });
  it('sesión + suscripción viva → entra en todo', () => {
    expect(decidirAcceso('premium', conSesion({ suscripcionViva: true }))).toEqual({
      accion: 'next',
    });
    expect(decidirAcceso('solo-sesion', conSesion({ suscripcionViva: true }))).toEqual({
      accion: 'next',
    });
  });
});

describe('puedeVerContenido', () => {
  it('free o acceso ausente es público para cualquiera', () => {
    expect(puedeVerContenido('free', false)).toBe(true);
    expect(puedeVerContenido(undefined, false)).toBe(true);
    expect(puedeVerContenido(null, false)).toBe(true);
  });
  it('premium solo con suscripción viva (login sin pago no basta)', () => {
    expect(puedeVerContenido('premium', false)).toBe(false);
    expect(puedeVerContenido('premium', true)).toBe(true);
  });
  it('cualquier valor desconocido se comporta como free (coalesce Sanity)', () => {
    expect(puedeVerContenido('rarísimo', false)).toBe(true);
  });
});
