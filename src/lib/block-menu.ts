import { normalizeForSearch } from './tree';
import type { BlockType } from './types';

export interface BlockMenuItem {
  type: BlockType;
  label: string;
  description: string;
  /** Extra search terms, including the English names people already know. */
  aliases: string[];
  /** Short glyph shown in the menu tile. */
  glyph: string;
}

export const BLOCK_MENU: readonly BlockMenuItem[] = [
  { type: 'text', label: 'Texto', description: 'Empieza a escribir con texto normal.', aliases: ['text', 'parrafo', 'plain'], glyph: 'Aa' },
  { type: 'page', label: 'Página', description: 'Inserta una subpágina dentro de esta.', aliases: ['page', 'subpagina'], glyph: '📄' },
  { type: 'todo', label: 'Lista de tareas', description: 'Haz seguimiento con casillas.', aliases: ['todo', 'to-do', 'tarea', 'checkbox', 'check'], glyph: '☑' },
  { type: 'h1', label: 'Encabezado 1', description: 'Título de sección grande.', aliases: ['h1', 'heading', 'titulo'], glyph: 'H1' },
  { type: 'h2', label: 'Encabezado 2', description: 'Título de sección mediano.', aliases: ['h2', 'heading', 'subtitulo'], glyph: 'H2' },
  { type: 'h3', label: 'Encabezado 3', description: 'Título de sección pequeño.', aliases: ['h3', 'heading'], glyph: 'H3' },
  { type: 'bullet', label: 'Lista con viñetas', description: 'Crea una lista sencilla.', aliases: ['bullet', 'lista', 'ul', 'vinetas'], glyph: '•' },
  { type: 'numbered', label: 'Lista numerada', description: 'Crea una lista con números.', aliases: ['numbered', 'ol', 'numeros'], glyph: '1.' },
  { type: 'toggle', label: 'Lista desplegable', description: 'Oculta contenido dentro.', aliases: ['toggle', 'desplegable', 'plegable'], glyph: '▸' },
  { type: 'quote', label: 'Cita', description: 'Destaca una cita.', aliases: ['quote', 'cita', 'blockquote'], glyph: '❝' },
  { type: 'callout', label: 'Destacado', description: 'Resalta un aviso con icono.', aliases: ['callout', 'aviso', 'nota'], glyph: '💡' },
  { type: 'code', label: 'Código', description: 'Fragmento de código.', aliases: ['code', 'codigo', 'snippet'], glyph: '</>' },
  { type: 'divider', label: 'Divisor', description: 'Separa bloques con una línea.', aliases: ['divider', 'separador', 'linea', 'hr'], glyph: '—' },
];

/** Menu items matching the text typed after `/`, best matches first. */
export function filterBlockMenu(query: string): BlockMenuItem[] {
  const needle = normalizeForSearch(query.trim());
  if (!needle) return [...BLOCK_MENU];
  const scored = BLOCK_MENU.map((item) => {
    const label = normalizeForSearch(item.label);
    const terms = item.aliases.map(normalizeForSearch);
    let score = -1;
    if (label.startsWith(needle) || terms.some((term) => term.startsWith(needle))) score = 2;
    else if (label.includes(needle) || terms.some((term) => term.includes(needle))) score = 1;
    return { item, score };
  });
  return scored
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
