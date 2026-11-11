import { describe, it, expect } from 'vitest';
import { elegirDestacada } from '../../src/lib/destacada';

const entrevista = (id: string, over: Record<string, unknown> = {}) => ({
  _id: id,
  title: id,
  slug: id,
  tipo: 'entrevista',
  mainImage: { asset: { _id: `img-${id}` } },
  ...over,
});

describe('elegirDestacada', () => {
  it('sin marcadas devuelve la primera entrevista con imagen (más reciente)', () => {
    const out = elegirDestacada([entrevista('nueva'), entrevista('vieja')]);
    expect(out?._id).toBe('nueva');
  });

  it('la marcada gana aunque no sea la más reciente', () => {
    const out = elegirDestacada([
      entrevista('nueva'),
      entrevista('marcada', { destacada: true }),
      entrevista('vieja'),
    ]);
    expect(out?._id).toBe('marcada');
  });

  it('con varias marcadas gana la primera (más reciente)', () => {
    const out = elegirDestacada([
      entrevista('a', { destacada: true }),
      entrevista('b', { destacada: true }),
    ]);
    expect(out?._id).toBe('a');
  });

  it('ignora artículos, entrevistas sin imagen y marcadas sin imagen', () => {
    const out = elegirDestacada([
      entrevista('articulo', { tipo: 'articulo', destacada: true }),
      entrevista('sin-imagen', { mainImage: undefined }),
      entrevista('marcada-sin-imagen', { destacada: true, mainImage: undefined }),
      entrevista('valida'),
    ]);
    expect(out?._id).toBe('valida');
  });

  it('sin candidatas devuelve null', () => {
    expect(elegirDestacada([])).toBeNull();
    expect(elegirDestacada([entrevista('x', { tipo: 'opinion' })])).toBeNull();
  });
});
