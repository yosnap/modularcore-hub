# Guía de Marca — ModularCore Hub

Kit de marca inicial (v1.0, 2026-08-20). Sin branding previo; generado desde cero como SVG vectorial (la API de generación de imágenes IA no tenía cuota disponible en la cuenta de Gemini usada).

## 1. Concepto

**Isotipo:** cubo isométrico de 3 caras = un "módulo core" ensamblable. Comunica composición/building-blocks, coherente con el producto (componentes headless, copy-code, multi-proveedor).

**Estilo:** minimalista geométrico, plano, alto contraste, escalable hasta 16px (favicon).

## 2. Archivos

```
assets/
├── logo/svg/
│   ├── mark.svg                    # isotipo a color (uso general)
│   ├── mark-mono-black.svg         # isotipo 1 color, fondos claros
│   ├── mark-mono-white.svg         # isotipo 1 color, fondos oscuros
│   ├── favicon.svg                 # versión simplificada para tamaños pequeños
│   ├── lockup-horizontal-light.svg # isotipo + wordmark, fondos claros
│   ├── lockup-horizontal-dark.svg  # isotipo + wordmark, fondos oscuros
│   ├── wordmark-light.svg          # solo texto, fondos claros
│   └── wordmark-dark.svg           # solo texto, fondos oscuros
├── logo/png/
│   ├── mark/       # 16, 32, 48, 64, 128, 192, 256, 512, 1024 px (color + mono)
│   ├── lockup/      # 400, 800, 1600 px (light + dark)
│   └── wordmark/    # 400, 800, 1600 px (light + dark)
├── favicon/
│   ├── favicon.ico              # multi-resolución 16/32/48
│   ├── favicon-{16,32,48,180,192,512}.png
│   └── apple-touch-icon.png     # 180x180
├── brand-tokens.json  # paleta + tipografía en JSON
└── brand-tokens.css   # mismas variables como CSS custom properties
```

## 3. Paleta de colores

| Rol | Token | Hex |
|---|---|---|
| Primario | `--mc-primary-500` | `#6366F1` (índigo) |
| Primario hover/dark | `--mc-primary-600` | `#4F46E5` |
| Acento | `--mc-accent-violet` | `#8B5CF6` |
| Texto sobre claro | `--mc-neutral-900` | `#0F172A` |
| Texto sobre oscuro | `--mc-neutral-0` | `#FFFFFF` |
| Success / Warning / Danger / Info | — | `#10B981` / `#F59E0B` / `#EF4444` / `#0EA5E9` |

Escala completa (50–900) en `assets/brand-tokens.json` / `.css`.

## 4. Tipografía

- **Display/UI:** Geist (fallback Inter) — geométrica, alineada al espacio devtools (Vercel/Linear).
- **Body:** Inter.
- **Código (CLI/MCP/snippets):** Geist Mono (fallback JetBrains Mono).
- Wordmark: peso 700, letter-spacing `-0.02em`.

No se incluyen archivos de fuente: Geist e Inter son gratuitas y se sirven vía Google Fonts / `next/font` / `@fontsource`; no requieren licenciamiento.

## 5. Uso del logo

- **Espacio de seguridad:** 0.5× el ancho del cubo en todos los lados.
- **Tamaño mínimo:** isotipo solo 24px, lockup completo 96px de ancho.
- **Fondos claros →** `mark.svg` / `lockup-horizontal-light.svg` / `mark-mono-black.svg`.
- **Fondos oscuros →** versiones `-dark` / `mark-mono-white.svg`.
- **Favicon/app icon →** usar siempre `favicon.svg` (versión simplificada, no el `mark.svg` completo) para máxima legibilidad en 16-32px.
- No deformar, rotar, añadir sombras/efectos, ni recolorear fuera de la paleta definida.

## 6. Pendiente / decisiones abiertas

- No se generaron variantes con IA (logo alternativo tipo "monograma" o "gradiente") por falta de cuota en `GEMINI_API_KEY`. Si se habilita cuota de pago, se puede correr `ak-design` logo `--batch` para explorar alternativas y comparar contra este isotipo base.
- Tagline "Componentes headless, un solo core." es un borrador, no validado con el usuario — ajustar si se define copy oficial.
