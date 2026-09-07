export interface ColorChip {
  bg: string;
  fg: string;
}

const TINTA = '#1a1a1a';

// Mapa curado: clave = nombre normalizado (minúsculas, sin tildes).
// Tonos pastel claros con texto oscuro para mantener contraste AA.
const COLORES: Record<string, ColorChip> = {
  entrevistas: { bg: '#ffc107', fg: TINTA },
  opinion: { bg: '#fcd9c4', fg: TINTA },
  clubs: { bg: '#cfe6d4', fg: TINTA },
  'entrenadores/entrenadoras': { bg: '#cfe0f5', fg: TINTA },
  'futbol femenino': { bg: '#f6d7e8', fg: TINTA },
  'futbol regional': { bg: '#cdeee8', fg: TINTA },
  'directores deportivos': { bg: '#dcdcf2', fg: TINTA },
  'futbol sala': { bg: '#e6f0c4', fg: TINTA },
  arbitros: { bg: '#cfeef5', fg: TINTA },
  metodologia: { bg: '#efe2c8', fg: TINTA },
  'preparador fisico': { bg: '#f6d4d4', fg: TINTA },
  psicologos: { bg: '#e6dcf6', fg: TINTA },
  entrenamientos: { bg: '#d4e8f6', fg: TINTA },
  analista: { bg: '#dfe8d0', fg: TINTA },
  'secretario tecnico': { bg: '#dde6ec', fg: TINTA },
  'audio entrevistas': { bg: '#f0d9f2', fg: TINTA },
  cronicas: { bg: '#f2e3ce', fg: TINTA },
  'futbol mundial': { bg: '#d6e2f6', fg: TINTA },
  'segunda b': { bg: '#d8f0dc', fg: TINTA },
  'athletic club': { bg: '#f8d8d0', fg: TINTA },
  'sin categoria': { bg: '#e5e7eb', fg: TINTA },
};

function normalizar(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Fallback determinista: hash (djb2) del nombre → tono pastel HSL.
function colorPorHash(nombre: string): ColorChip {
  let h = 5381;
  for (let i = 0; i < nombre.length; i++) {
    h = ((h << 5) + h + nombre.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(h) % 360;
  return { bg: `hsl(${hue} 60% 87%)`, fg: TINTA };
}

export function colorCategoria(nombre?: string | null): ColorChip | null {
  if (!nombre) return null;
  const clave = normalizar(nombre);
  if (!clave) return null;
  return COLORES[clave] ?? colorPorHash(clave);
}

export function estiloChipCategoria(nombre?: string | null): Record<string, string> | undefined {
  const color = colorCategoria(nombre);
  return color ? { 'background-color': color.bg, color: color.fg } : undefined;
}
