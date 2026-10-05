import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import {
  withRetry,
  makeReport,
  loadRegistry,
  saveRegistry,
} from '../../scripts/lib/checkpoint.mjs';

afterEach(() => vi.restoreAllMocks());

describe('withRetry', () => {
  it('devuelve en el primer intento', async () => {
    const fn = vi.fn(async () => 42);
    expect(await withRetry(fn, { retries: 3, backoffMs: 0 })).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('reintenta hasta lograrlo', async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n += 1;
      if (n < 3) throw new Error('boom');
      return 'ok';
    });
    expect(await withRetry(fn, { retries: 4, backoffMs: 0 })).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('lanza tras agotar los reintentos', async () => {
    const fn = vi.fn(async () => {
      throw new Error('siempre');
    });
    await expect(withRetry(fn, { retries: 2, backoffMs: 0, label: 'x' })).rejects.toThrow(
      /failed after 2 retries/,
    );
  });
});

describe('makeReport', () => {
  it('agrega documentos por tipo y totaliza', () => {
    const r = makeReport({
      docs: [{ _type: 'publicacion' }, { _type: 'publicacion' }, { _type: 'autor' }],
      images: [{}, {}],
      errors: [{ m: 1 }],
      totalPosts: 5,
    });
    expect(r.documents).toBe(3);
    expect(r.byType).toEqual({ publicacion: 2, autor: 1 });
    expect(r.imagesUploaded).toBe(2);
    expect(r.errors).toBe(1);
    expect(r.totalWordPressPosts).toBe(5);
    expect(typeof r.generatedAt).toBe('string');
  });
});

describe('registry', () => {
  it('loadRegistry devuelve el default si no existe el fichero', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(loadRegistry()).toEqual({ byTitle: {}, bySlug: {}, images: {} });
  });

  it('loadRegistry parsea el JSON guardado', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{"byTitle":{"a":"b"},"bySlug":{},"images":{}}');
    expect(loadRegistry().byTitle).toEqual({ a: 'b' });
  });

  it('saveRegistry crea el directorio y escribe el fichero', () => {
    const mkdir = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    const write = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    saveRegistry({ byTitle: {}, bySlug: {}, images: { k: 'v' } });
    expect(mkdir).toHaveBeenCalled();
    expect(write).toHaveBeenCalled();
  });
});
