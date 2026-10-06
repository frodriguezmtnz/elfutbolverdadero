import { defineConfig } from 'vitest/config';

// Fase 1: solo tests unitarios de lógica pura (sin navegador ni E2E).
// El alcance de cobertura se limita a los módulos testeables; los dependientes
// de `sanity:client`/red se dejan fuera adrede (Fase 2).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,mjs}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      include: [
        'src/lib/entidades.ts',
        'src/lib/limpieza.ts',
        'src/lib/texto.ts',
        'src/lib/entrenadores-textos.ts',
        'src/lib/colores-categoria.ts',
        'scripts/lib/entidades.mjs',
        'scripts/lib/portable-text.mjs',
        'scripts/lib/checkpoint.mjs',
        'scripts/legacy-redirects.mjs',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
