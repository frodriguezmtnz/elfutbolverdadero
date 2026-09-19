# Plan: Cursos Premium — El Fútbol Verdadero

> **Fecha de análisis:** 19 septiembre 2026
> **Estado:** Exploración (no implementado)
> **Objetivo:** Monetizar contenido premium sobre fútbol base mediante cursos estructurados.

---

## 1. Contexto del proyecto actual

### Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Astro 7 (SSG) + TypeScript strict |
| CMS | Sanity.io (headless, con caché en build) |
| Estilos | Tailwind CSS 4 (vía Vite plugin) |
| Hosting | Vercel (static output) |
| CI/CD | GitHub Actions (lint, format, types, build) |

### Contenido actual (100% gratuito)

- **Entrevistas** a entrenadores de fútbol base
- **Artículos** de opinión / cuaderno de entrenador
- **Búsqueda** client-side con dos índices JSON (meta + cuerpo)
- **Newsletter** con formulario (sin backend aún)
- **Directorio de entrenadores** (enlaza a Google Forms)

### Modelos de datos en Sanity

- `publicacion` — entrevistas, artículos, opiniones
- `autor` — nombre, slug, rol, bio, imagen
- `categoria` — nombre, slug, descripción
- `etiqueta` — nombre, slug
- `embed` — URL iframe (YouTube, audio)
- `webAmiga` — nombre, URL, logo, descripción

### Lo que NO existe (aún)

- Sistema de autenticación / usuarios
- Pagos / suscripciones
- Contenido video bajo demanda
- Dashboard de usuario
- LMS o estructura de cursos

---

## 2. Espacio de decisión: 4 dimensiones clave

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CURSOS PREMIUM: ESPACIO DE DECISIÓN              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐  │
│  │   MODELO     │  │  ENTREGA     │  │   ACCESO     │  │ PAGOS  │  │
│  │  DE NEGOCIO  │  │  CONTENIDO   │  │  CONTROL     │  │        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬───┘  │
│         │                 │                 │                 │     │
│    ┌────┴────┐       ┌────┴────┐       ┌────┴────┐       ┌────┴────┐ │
│    │Compra   │       │Video    │       │Magic    │       │Stripe   │ │
│    │única    │       │(Mux/    │       │link/    │       │Checkout │ │
│    │(curso)  │       │Cloudfl) │       │pass     │       │/Portal  │ │
│    ├─────────┤       ├─────────┤       ├─────────┤       ├─────────┤ │
│    │Suscrip- │       │PDF/     │       │Cuentas  │       │Lemon    │ │
│    │ción     │       │descarga │       │propias  │       │Squeezy  │ │
│    │(acceso  │       │         │       │(Clerk/  │       │/Paddle  │ │
│    │ total)  │       │         │       │Auth.js) │       │         │ │
│    ├─────────┤       ├─────────┤       ├─────────┤       ├─────────┤ │
│    │Freemium │       │Texto +  │       │Token    │       │Manual   │ │
│    │(módulo  │       │diagramas│       │JWT en   │       │(factura │ │
│    │gratis)  │       │interac. │       │cookie   │       │/transfer)│ │
│    └─────────┘       └─────────┘       └─────────┘       └─────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Preguntas clave para definir el alcance

| Pregunta | Impacto en arquitectura |
|----------|------------------------|
| ¿Cuántos cursos prevés al lanzamiento? (1-3 vs 10+) | Define si necesitas catálogo dinámico o páginas estáticas |
| ¿Vídeo, PDF, texto interactivo, o mixto? | Determina hosting (Mux/Cloudflare Stream vs Sanity assets vs R2/S3) |
| ¿Compra única, suscripción, o ambas? | Define modelo de datos (licencia por curso vs suscripción activa) |
| ¿Quién crea los cursos? (tú solo, autores invitados, mixto) | Afecta workflow editorial y revenue share |
| ¿Quieres comunidad/foro por curso? | Añade capa social (Discord, Circle, o custom) |
| ¿Certificados / badges? | Requiere tracking de progreso + generación PDF |
| ¿Facturación B2B (clubes/escuelas)? | Necesita facturas, equipos, licencias múltiples |

---

## 3. Opciones de arquitectura

### Opción A: Todo en Astro + Stripe Checkout (MVP rápido)

```
┌────────────────────────────────────────────────────────────────┐
│                        ASTRO (SSG)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────┐  │
│  │ Páginas     │  │ Stripe      │  │ Sanity CMS             │  │
│  │ curso/[slug]│──▶│ Checkout    │──▶│ curso (documento)     │  │
│  │ (públicas)  │  │ (session)   │  │ - módulos (array)      │  │
│  └─────────────┘  └──────┬──────┘  │ - vídeo (asset ref)    │  │
│         │                │         │ - PDF (asset ref)      │  │
│         ▼                ▼         └────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Middleware / Server Function (Vercel Edge)              │   │
│  │ - Valida sesión Stripe (customer portal / webhook)      │   │
│  │ - Seta cookie JWT con { courseIds: string[] }           │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Página de curso (SSR o ISR)                             │   │
│  │ - Lee cookie → verifica acceso → renderiza módulos      │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

**Pros:** Simple, barato, aprovecha stack actual.
**Contras:** SSR en Vercel (coste), cookies JWT manuales, sin dashboard usuario.

---

### Opción B: Auth.js (NextAuth) + Stripe + Sanity (Estándar moderno)

```
┌────────────────────────────────────────────────────────────────┐
│                        ASTRO (SSR/Híbrido)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────┐  │
│  │ Auth.js     │  │ Stripe      │  │ Sanity                 │  │
│  │ (GitHub,    │  │ (Subscript. │  │ - User (extendido)     │  │
│  │  Google,    │  │  + Checkout)│  │ - Course               │  │
│  │  Email)     │  │             │  │ - Module               │  │
│  └──────┬──────┘  └──────┬──────┘  │ - License (user+course)│  │
│         │                │         └────────────────────────┘  │
│         └───────┬────────┘                  │                  │
│                 ▼                           ▼                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Dashboard de usuario (/mi-cuenta)                       │   │
│  │ - Mis cursos | Progreso | Facturas | Certificados       │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

**Pros:** Auth robusto, sesión persistente, escalable.
**Contras:** Requiere mover a SSR/hibrido, más complejidad.

---

### Opción C: Plataforma externa (Teachable, Kajabi, Podia) + Embed

```
┌────────────────────────────────────────────────────────────────┐
│  ELFUTBOLVERDADERO.COM (Astro SSG)                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Landing page curso → Botón "Comprar" → teachable.com/   │   │
│  │                                                         │   │
│  │ Ventajas: 0 mantenimiento, pagos, EU VAT, afiliados     │   │
│  │ Desventajas: 10-15% fee, marca ajena, menos control     │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

**Pros:** Lanzamiento en días, cero ops.
**Contras:** Fee alto, UX rota, datos de cliente no tuyos.

---

### Opción D: Lemon Squeezy / Paddle (Merchant of Record) + Webhooks

- MoR maneja IVA global, facturas, reembolsos
- Webhooks → Sanity (crear License) → Astro (validar acceso)
- Fee ~5-7% + $0.50 (vs 2.9% + $0.30 Stripe + tú gestionas IVA)

---

## 4. Modelo de datos en Sanity (propuesta)

```typescript
// sanity/schemas/curso.ts
export const curso = defineType({
  name: 'curso',
  title: 'Curso Premium',
  type: 'document',
  fields: [
    { name: 'title', type: 'string', validation: Rule => Rule.required() },
    { name: 'slug', type: 'slug', options: { source: 'title' } },
    { name: 'description', type: 'text', rows: 4 },
    { name: 'coverImage', type: 'image', options: { hotspot: true } },
    { name: 'previewVideo', type: 'reference', to: [{ type: 'muxVideo' }] },
    { name: 'price', type: 'number' }, // en céntimos EUR
    { name: 'priceId', type: 'string' }, // Stripe Price ID
    { name: 'subscriptionPriceId', type: 'string' }, // opcional
    { name: 'author', type: 'reference', to: [{ type: 'autor' }] },
    { name: 'categorias', type: 'array', of: [{ type: 'reference', to: [{ type: 'categoria' }] }] },
    { name: 'nivel', type: 'string', options: { list: ['iniciacion', 'intermedio', 'avanzado'] } },
    { name: 'duracionHoras', type: 'number' },
    { name: 'modulos', type: 'array', of: [{ type: 'modulo' }] },
    { name: 'publishedAt', type: 'datetime' },
    { name: 'isPublished', type: 'boolean', initialValue: false },
  ],
})

const modulo = defineType({
  name: 'modulo',
  title: 'Módulo',
  type: 'object',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'description', type: 'text' },
    { name: 'orden', type: 'number' },
    { name: 'lecciones', type: 'array', of: [{ type: 'leccion' }] },
    { name: 'isFreePreview', type: 'boolean', initialValue: false },
  ],
})

const leccion = defineType({
  name: 'leccion',
  title: 'Lección',
  type: 'object',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'tipo', type: 'string', options: { list: ['video', 'texto', 'pdf', 'quiz', 'descarga'] } },
    { name: 'contenido', type: 'array', of: [{ type: 'block' }, { type: 'image' }, { type: 'embed' }] },
    { name: 'video', type: 'reference', to: [{ type: 'muxVideo' }] },
    { name: 'pdf', type: 'file' },
    { name: 'duracionMin', type: 'number' },
    { name: 'orden', type: 'number' },
    { name: 'isFreePreview', type: 'boolean' },
  ],
})

// Licencia (vincula usuario + curso)
export const licencia = defineType({
  name: 'licencia',
  title: 'Licencia de Curso',
  type: 'document',
  fields: [
    { name: 'userEmail', type: 'string' },
    { name: 'stripeCustomerId', type: 'string' },
    { name: 'stripeSubscriptionId', type: 'string' },
    { name: 'curso', type: 'reference', to: [{ type: 'curso' }] },
    { name: 'tipo', type: 'string', options: { list: ['compra_unica', 'suscripcion'] } },
    { name: 'estado', type: 'string', options: { list: ['activa', 'cancelada', 'expirada', 'reembolsada'] } },
    { name: 'progreso', type: 'object', fields: [
      { name: 'modulosCompletados', type: 'array', of: [{ type: 'string' }] },
      { name: 'leccionesCompletadas', type: 'array', of: [{ type: 'string' }] },
      { name: 'ultimaLeccion', type: 'string' },
      { name: 'porcentaje', type: 'number' },
    ]},
    { name: 'certificadoEmitido', type: 'boolean', initialValue: false },
    { name: 'creadoEn', type: 'datetime' },
    { name: 'expiraEn', type: 'datetime' }, // null = vitalicio
  ],
})
```

---

## 5. Hosting de vídeo: Comparativa

| Proveedor | Coste | Características clave | Integración |
|-----------|-------|----------------------|-------------|
| **Mux** | $0.0018/min stream + $0.008/min encoding | DRM, adaptive bitrate, webhooks, player React | Excelente (SDK + webhooks) |
| **Cloudflare Stream** | $1/1000 min almacenados + $0.50/1000 min entregados | Muy barato, DRM beta, player propio | Buena (API REST) |
| **Vimeo OTT / Pro** | $20-50/mes + fee | Monetización integrada, apps TV | Embed iframe |
| **Bunny.net Stream** | $0.003/min + $0.01/GB | Muy barato, DRM, player | API simple |
| **Sanity Asset + `<video>`** | Incluido en plan | Solo MP4 progresivo, sin ABR, sin DRM | Nativo |

**Recomendación:**
- **Mux** si hay presupuesto (~$50-100/mes para 10 cursos)
- **Cloudflare Stream** si presupuesto ajustado (~$10-20/mes)
- Evitar Sanity para vídeo largo

---

## 6. Control de acceso: Estrategias

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESTRATEGIAS DE ACCESO                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CLIENT-SIDE ONLY (SSG + JS)                                │
│     ┌─────────────────────────────────────────────────────┐    │
│     │ Build: genera /curso/[slug]/index.html (público)    │    │
│     │ JS: fetch /api/access?course=X → 403/200            │    │
│     │ ❌ SEO: Google ve contenido gratis                  │    │
│     │ ❌ Seguridad: token en localStorage                 │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  2. EDGE MIDDLEWARE (Vercel Edge Functions)                   │
│     ┌─────────────────────────────────────────────────────┐    │
│     │ Request → Edge: valida cookie JWT → rewrite/403     │    │
│     │ ✅ Rápido, barato, SEO-friendly (SSR selectivo)     │    │
│     │ ⚠️ Límite 50ms CPU, sin BD (lee KV/cookie)          │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  3. SSR / ISR POR PÁGINA (Astro Hybrid)                       │
│     ┌─────────────────────────────────────────────────────┐    │
│     │ export const prerender = false                      │    │
│     │ Astro.locals.user = await validateSession(cookies)  │    │
│     │ if (!hasAccess) return Astro.redirect('/login')     │    │
│     │ ✅ Control total, SEO perfecto                      │    │
│     │ ⚠️ Coste Vercel Functions, latencia                 │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  4. PREVIEW PÚBLICO + CONTENIDO PROTEGIDO (Recomendado)       │
│     ┌─────────────────────────────────────────────────────┐    │
│     │ /curso/[slug]/ → landing pública (SEO, marketing)   │    │
│     │ /curso/[slug]/modulo/[n]/ → protegido (Edge/SSR)    │    │
│     │ Primer módulo gratis (isFreePreview) → lead magnet  │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Modelo de pricing sugerido

| Modelo | Precio | Para qué sirve |
|--------|--------|----------------|
| **Curso individual** | €47-97 | Entrada baja, compra por impulso |
| **Pack "Especialista"** (3-4 cursos) | €147-197 | Upsell, LTV mayor |
| **Suscripción "Academia"** | €19-29/mes | Recurrente, acceso total + comunidad |
| **Licencia club** (5-10 entrenadores) | €297-497/año | B2B, facturación anual |

### Benchmark España fútbol base

- Futbolmanía / Marcet / cursos federativos: €50-300/curso
- Suscripciones tipo "The Coaching Manual": €20-30/mes
- Masterclasses puntuales: €15-30

---

## 8. Integración con contenido existente (sinergias)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ECOSISTEMA ELFUTBOLVERDADERO                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   GRATIS (SEO, Top of Funnel)          PREMIUM (Monetización)  │
│   ──────────────────────────            ─────────────────────   │
│   • Entrevistas semanales      ←──▶    • Cursos estructurados   │
│   • Artículos de opinión                   • Vídeos + PDFs      │
│   • Newsletter semanal           ───▶    • Progreso + certif.   │
│   • Búsqueda                     │       • Comunidad privada   │
│   • Directorio entrenadores      │       • Plantillas descarga │
│                                  │                             │
│   CONVERSIÓN:                                                    │
│   • Entrevista → "¿Quieres profundizar? Curso de X"            │
│   • Autor invitado → "Enseña en nuestra Academia"              │
│   • Newsletter → Pitch curso nuevo (segmentado por tags)       │
│   • Búsqueda "presión alta" → Curso "Presión y recuperación"   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| **IVA UE / MOSS** | Usar Lemon Squeezy / Paddle (Merchant of Record) |
| **Piratería / compartir cuentas** | DRM (Mux), watermarking, límite sesiones concurrentes |
| **Soporte técnico (vídeos no cargan)** | Player robusto + FAQ + email soporte |
| **Reembolsos / disputas** | Política clara 14 días, Stripe Radar |
| **Escalabilidad vídeo** | Mux/CF Stream manejan CDN automáticamente |
| **Migración futuro (LMS dedicado)** | Diseñar datos portables (SCORM/xAPI opcional) |

---

## 10. Preguntas para definir el MVP

1. **¿Cuál es tu objetivo de ingresos a 12 meses?** (€500/mes vs €5000/mes vs €20000/mes)
2. **¿Tienes ya grabados los vídeos o es producción nueva?**
3. **¿Quieres gestionar facturas/IVA tú o delegar (MoR)?**
4. **¿Cuántos cursos reales planeas lanzar en v1?** (1, 3, 10?)
5. **¿Necesitas dashboard de alumno (progreso, certificados) en v1 o basta "acceso al contenido"?**
6. **¿Hay presupuesto mensual para herramientas?** (€0, €50, €200, €500+)
7. **¿Quieres que los autores invitados cobren % por su curso?**
8. **¿Comunidad (foro/grupo) por curso o global?**

---

## 11. MVP recomendado (2-3 semanas)

```
┌─────────────────────────────────────────────────────────────────┐
│                        MVP RECOMENDADO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STACK:                                                         │
│  • Astro Hybrid (SSR solo en /curso/*)                          │
│  • Sanity: Course, Module, Lesson, License schemas             │
│  • Stripe: Checkout (compra única) + Customer Portal           │
│  • Cloudflare Stream: vídeo (barato, DRM beta, API simple)     │
│  • Auth: Magic link email (sin passwords, bajo fricción)       │
│  • Edge Middleware: valida cookie JWT → access control         │
│                                                                 │
│  FLUJO:                                                         │
│  1. Landing /curso/[slug] (SSG, público, SEO)                  │
│  2. "Comprar €XX" → Stripe Checkout Session                    │
│  3. Webhook Stripe → Sanity: create License (email + course)   │
│  4. Email al comprador con Magic Link → /curso/[slug]/modulo/1 │
│  5. Edge Middleware valida JWT → renderiza lección (SSR)       │
│  6. Progreso guardado en Sanity (License.progreso)             │
│                                                                 │
│  FUERA DEL MVP (fase 2):                                        │
│  • Suscripciones recurrentes                                   │
│  • Dashboard alumno (/mi-cuenta)                               │
│  • Certificados PDF                                            │
│  • Programa de afiliados                                       │
│  • App móvil / PWA                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Stack tecnológico detallado del MVP

| Componente | Solución | Coste estimado |
|-----------|----------|----------------|
| **Auth** | `astro-auth` + Magic Link (email) | $0 |
| **Pagos** | Stripe Checkout + Webhooks + Customer Portal | 2.9% + €0.30/transacción |
| **Vídeo** | Cloudflare Stream | ~€10-20/mes |
| **CMS** | Sanity (ya existe) | $0 (plan gratuito) |
| **Edge** | Vercel Edge Middleware (ya existe en plan) | $0 (incluido) |
| **Email transaccional** | Resend / Postmark (magic link + confirmación) | $0-20/mes |
| **Total estimado** | | **€30-50/mes + fees de transacción** |

---

## 12. Flujo técnico detallado del MVP

### 12.1 Compra

```
Usuario → Landing /curso/[slug]/ (SSG, pública)
  │
  ├─ Click "Comprar €47"
  │
  ▼
Stripe Checkout Session (hosted)
  │
  ├─ Pago exitoso
  │
  ▼
Webhook POST /api/webhook/stripe (Vercel Serverless)
  │
  ├─ Verifica firma Stripe
  ├─ Extrae email + curso del session.metadata
  ├─ Crea documento Licencia en Sanity:
  │    { userEmail, curso, tipo: 'compra_unica', estado: 'activa', creadoEn }
  │
  ▼
Email mágico via Resend/Postmark
  │
  ├─ "¡Bienvenido a [Curso]! Haz clic para acceder"
  ├─ Link: /curso/[slug]/modulo/1?token=<jwt>
  │
  ▼
Edge Middleware (valida JWT de URL)
  │
  ├─ Verifica exp + firma
  ├─ Setea cookie HttpOnly: session=<jwt> (30 días)
  ├─ Redirect a /curso/[slug]/modulo/1
  │
  ▼
Página de lección (SSR: export const prerender = false)
  │
  ├─ Lee cookie → Sanity: busca Licencia (email + curso)
  │
  ├─ Si no tiene acceso → redirect a /acceso-denegado
  └─ Si tiene acceso → renderiza contenido (PortableText, vídeo, etc.)
```

### 12.2 Struktur der URL

```
/curso/                          ← Catálogo público
/curso/[slug]/                   ← Landing pública del curso (SSG)
/curso/[slug]/modulo/[n]/        ← Lección (SSR, protegido)
/curso/[slug]/modulo/[n]/[leccion-slug]  ← URL amigable (SSR, protegido)
/mi-cuenta/                      ← Dashboard alumno (SSR, fase 2)
/mi-cuenta/mis-cursos/           ← Lista de cursos comprados
/api/webhook/stripe              ← Webhook Stripe
/api/auth/[...action]            ← Auth.js endpoints
```

---

## 13. Próximos pasos

1. **Validar interés** — Encuesta a 50-100 lectores (newsletter, redes) sobre qué temas pagarían
2. **MVP de contenido** — Grabar 1 curso completo (5-8 módulos, ~3-4h vídeo total)
3. **Setup técnico** — Stripe + Sanity schemas + Astro hybrid + Edge
4. **Landing page** — Construir la landing con precio, contenido, testimonios
5. **Lanzamiento beta** — Ofrecer a 20-30 personas con descuento 50%
6. **Iterar** — Medir tasa conversión, feedback, ajustar precio
7. **Escalar** — Más cursos, suscripción, comunidad, afiliados

---

*Documento generado como referencia para futura implementación. No código — solo diseño y arquitectura.*
