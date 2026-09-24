# fonts/

Fuentes servidas desde la propia web (antes venían de Google Fonts: así
cargan sin depender de otro servidor y no se envía la IP de cada visita a
Google). Las declara el bloque `@font-face` al principio de `style.css`.

| Archivo | Fuente | Uso |
|---|---|---|
| `press-start-2p-latin-400-normal.woff2` | Press Start 2P 400 | Títulos y botones (pixel) |
| `press-start-2p-latin-ext-400-normal.woff2` | Press Start 2P 400 | Letras fuera del español básico (solo se descarga si aparecen) |
| `inter-latin-wght-normal.woff2` | Inter variable (pesos 100-900) | Texto normal |
| `inter-latin-ext-wght-normal.woff2` | Inter variable | Igual, letras extra (solo si aparecen) |

Sacadas de los paquetes npm `@fontsource/press-start-2p` y
`@fontsource-variable/inter` (5.3.0). Ambas con licencia SIL Open Font
License 1.1: ver `OFL-PressStart2P.txt` y `OFL-Inter.txt`.
