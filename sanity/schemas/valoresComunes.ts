// Opciones compartidas por los esquemas de Futbolverdadero Entrenadores.

export const opcionesAcceso = [
  { title: 'Gratis', value: 'free' },
  { title: 'Premium', value: 'premium' },
] as const;

export const opcionesCategoriaEdad = [
  { title: 'Prebenjamín', value: 'prebenjamin' },
  { title: 'Benjamín', value: 'benjamin' },
  { title: 'Alevín', value: 'alevin' },
  { title: 'Infantil', value: 'infantil' },
  { title: 'Cadete', value: 'cadete' },
  { title: 'Juvenil', value: 'juvenil' },
  { title: 'Aficionado / Sénior', value: 'aficionado' },
  { title: 'Amateur', value: 'amateur' },
] as const;

export const opcionesEspacio = [
  { title: 'Reducido (4v4–6v6)', value: 'reducido' },
  { title: 'Medio (8v8 aprox.)', value: 'medio' },
  { title: 'Completo (11v11 aprox.)', value: 'completo' },
] as const;

export const opcionesMaterial = [
  'Conos',
  'Petos / chalecos',
  'Porterías portátiles',
  'Picas',
  'Escalera de coordinación',
  'Aros',
  'Balones',
] as const;

export const opcionesTipoTarea = [
  { title: 'Técnica', value: 'tecnica' },
  { title: 'Táctica', value: 'tactica' },
  { title: 'Física (condicional integrada)', value: 'fisica' },
  { title: 'Cognitiva / toma de decisiones', value: 'cognitiva' },
  { title: 'Actitudinal / valores', value: 'actitudinal' },
] as const;

export const fasesSesion = [
  { title: 'Calentamiento', value: 'calentamiento' },
  { title: 'Tarea principal', value: 'tarea' },
  { title: 'Juego condicionado', value: 'juegoCondicionado' },
  { title: 'Partido / juego final', value: 'partido' },
  { title: 'Vuelta a la calma', value: 'vueltaCalma' },
] as const;
