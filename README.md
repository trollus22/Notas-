# Notas

App móvil de notas y bases de datos, hecha con Expo y React Native. La interfaz reproduce la app de Notion para iOS tal como aparece en una grabación de referencia: pestañas arriba, barra flotante abajo, barra lateral con espacios de equipo y bases de datos con vistas.

El código es propio. No incluye código, logotipos ni recursos de Notion; el asistente usa un icono propio y se llama «IA».

## Qué funciona

- **Inicio**: Recientes, Privado y Espacios de equipo, con árbol desplegable de páginas y de las vistas de cada base de datos.
- **Editor de bloques**: texto, encabezados, tareas, listas, desplegables, citas, destacados con color, código y divisores. Menú `/`, atajos de Markdown (`# `, `- `, `[] `…), Intro y Borrar como en Notion, sangría, mover y borrar desde la barra del teclado.
- **Bases de datos**: propiedades (estado, persona, fecha, selección, etiquetas, texto) y vistas de tabla, tablero por estado, vista filtrada y checklist. Se pueden crear vistas, filtrar, elegir columnas y editar cada valor.
- **Menús**: menú del espacio de trabajo, hoja de cuentas, menú de nueva página (pulsación larga en el lápiz) y ventana de recientes (pulsación larga en el botón de la izquierda).
- **Otras pantallas**: Buscar, Recientes, Bandeja (tu actividad), Papelera con restaurar y eliminar, y Configuración con tema claro u oscuro y opción de no guardar el historial de visitas.
- **Datos locales**: todo se guarda en el dispositivo (SQLite en iOS y Android, `localStorage` en web) y funciona sin conexión.

## Qué no está conectado todavía

Las pantallas existen y lo dicen claramente al usarlas:

- **Chat con IA**: guarda tus mensajes y responde con un aviso de que la IA no está conectada. No se inventa respuestas.
- **Anotador con IA, notificaciones push, cuentas y varios espacios de trabajo.**
- **Sincronización con un servidor** (por ejemplo, Twenty).

## Ejecutar

```bash
npm install
npx expo start          # Expo Go o build de desarrollo
npx expo start --web    # en el navegador
```

Para el simulador de iOS hace falta un Mac con Xcode:

```bash
npx expo run:ios
```

## Comprobaciones

```bash
npx tsc --noEmit   # tipos
npx expo lint      # lint
npx jest           # tests
```

## Builds de iOS

- **EAS** (en la nube, sin Mac): `npx eas-cli@latest build --platform ios --profile simulator` genera una app para el simulador; el perfil `preview` genera un `.ipa` instalable y necesita una cuenta de Apple Developer.
- **GitHub Actions**: el flujo `CI` pasa tipos, lint y tests en cada push. El trabajo «Build para el simulador de iOS» se lanza a mano (Actions → CI → Run workflow) y sube un `.app` sin firmar. Ese trabajo todavía no se ha ejecutado nunca.

## Estructura

```
src/app/                 Pantallas (Expo Router)
  (tabs)/                Inicio, Chats, Reuniones, Bandeja
  page/[id].tsx          Página o base de datos
  chat/[id].tsx          Chat con la IA
src/components/          Barra flotante, pestañas, barra lateral, menús, hojas
  editor/                Filas de bloque, menú /, barra del teclado
  database/              Tabla, tablero, checklist, vistas, editores de propiedades
src/lib/                 Lógica sin interfaz (con tests): bloques, edición, bases de datos, chat
src/store/               Espacio de trabajo en memoria, persistencia, preferencias, datos iniciales
```

Todo es un bloque: una página es un bloque cuyos hijos son su contenido, una base de datos es una página cuyas subpáginas son sus filas, y el orden se guarda con índices fraccionarios.
