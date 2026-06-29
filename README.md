# Prode 2026

Aplicación web estática e interna para cargar pronósticos de resultado exacto de los partidos de fase de grupos del Mundial 2026.

## Stack

- HTML, CSS y JavaScript vanilla.
- Hosting en GitHub Pages.
- Base de datos en Supabase.
- Cliente `@supabase/supabase-js` cargado por CDN.
- Sin backend propio.
- Sin `service_role key` en frontend.

## Archivos principales

- `index.html`: carga de pronósticos de participantes.
- `ranking.html`: ranking general recalculado desde Supabase.
- `admin.html`: panel interno simple para cargar resultados oficiales.
- `style.css`: estilos responsive.
- `app.js`: lógica de formularios, validaciones, guardado y ranking.
- `supabase.js`: configuración del cliente Supabase.
- `data.js`: equipos, banderas emoji y 72 partidos.
- `schema.sql`: tablas, políticas RLS y carga inicial de partidos.

## Puesta en marcha

1. Crear un proyecto en [Supabase](https://supabase.com/).
2. Abrir el SQL Editor del proyecto.
3. Ejecutar el contenido completo de `schema.sql`.
4. Verificar que se cargaron los 72 partidos:
   ```sql
   select count(*) from matches;
   ```
5. Copiar desde Supabase la **Project URL** y la **anon public key**.
6. Pegarlas en `supabase.js`:
   ```js
   const SUPABASE_URL = "PEGAR_URL_SUPABASE";
   const SUPABASE_ANON_KEY = "PEGAR_ANON_KEY";
   ```
7. Crear el repositorio sugerido `prode-2026` en GitHub.
8. Subir estos archivos al repositorio.
9. Activar GitHub Pages desde **Settings > Pages**.
10. Usar la URL publicada para compartir la aplicación.

## Uso

### Participantes

1. Entrar a `index.html`.
2. Ingresar Nombre y Apellido.
3. Completar los 72 resultados exactos.
4. Presionar **Ver resumen**.
5. Confirmar y guardar.

El sistema valida nombre obligatorio, duplicados, goles vacíos, goles negativos y partidos incompletos.

### Ranking

Entrar a `ranking.html`. La tabla muestra:

- Posición.
- Nombre y Apellido.
- Puntos.
- Exactos.
- Signos acertados.
- Total de aciertos.

El puntaje se recalcula consultando predicciones y resultados oficiales desde Supabase.

### Admin

Entrar a `admin.html` y usar la contraseña definida en `app.js`:

```js
const ADMIN_PASSWORD = "CAMBIAR_PASSWORD_ADMIN";
```

> Importante: esta contraseña no es seguridad real. Es solo una barrera interna en frontend. Para producción, usar autenticación real y políticas RLS estrictas.

## Puntaje

- Resultado exacto acertado: 3 puntos.
- Si no acierta exacto pero acierta signo: 1 punto.
- Si no acierta signo: 0 puntos.

Ejemplos:

- Pronóstico 2-1 y resultado real 2-1 = 3 puntos.
- Pronóstico 1-0 y resultado real 2-1 = 1 punto.
- Pronóstico 1-1 y resultado real 2-1 = 0 puntos.
- Pronóstico 0-1 y resultado real 2-1 = 0 puntos.

## Agregar módulo de eliminatorias en un proyecto existente

Para habilitar `knockout.html` sin borrar datos actuales:

1. Abrí el proyecto en Supabase.
2. Entrá en **SQL Editor**.
3. Creá una nueva query.
4. Copiá y pegá el contenido completo de `migration.sql`.
5. Ejecutá la query una sola vez. La migración usa `IF NOT EXISTS`/`ON CONFLICT` para no borrar participantes, predicciones ni resultados existentes.
6. Verificá que existan las tablas `knockout_matches`, `knockout_predictions` y `knockout_results`, y que `participants` tenga la columna `pin_code`.
7. Desde `admin.html`, ingresá al panel admin, abrí **PIN participantes** y generá/informá el PIN de 4 dígitos a cada participante.
8. Los participantes podrán entrar en `knockout.html` con Nombre y Apellido + PIN para cargar eliminatorias.

Los resultados de eliminatorias se cargan desde el módulo **Resultados eliminatorias** del admin. Los cruces que dependen de ganadores o perdedores se completan automáticamente cuando el partido origen está cerrado.
