/** Page covers: two-colour gradients referenced by id from `Block.cover`. */
export interface Cover {
  id: string;
  colors: readonly [string, string];
}

export const COVERS: readonly Cover[] = [
  { id: 'aurora', colors: ['#F6D365', '#FDA085'] },
  { id: 'lagoon', colors: ['#84FAB0', '#8FD3F4'] },
  { id: 'dusk', colors: ['#A18CD1', '#FBC2EB'] },
  { id: 'ocean', colors: ['#4FACFE', '#00F2FE'] },
  { id: 'forest', colors: ['#43E97B', '#38F9D7'] },
  { id: 'ember', colors: ['#FA709A', '#FEE140'] },
  { id: 'night', colors: ['#30CFD0', '#330867'] },
  { id: 'sand', colors: ['#E6DADA', '#C9B8A8'] },
  { id: 'slate', colors: ['#868F96', '#596164'] },
  { id: 'rose', colors: ['#FF9A9E', '#FECFEF'] },
];

export function coverById(id: string | null | undefined): Cover | undefined {
  return COVERS.find((cover) => cover.id === id);
}

export const PAGE_EMOJIS: readonly string[] = [
  '📄', '📝', '📌', '📎', '📚', '📖', '🗂️', '🗒️', '📅', '🗓️',
  '✅', '☑️', '🎯', '🚀', '💡', '🔥', '⭐', '✨', '💼', '🏠',
  '🧠', '💬', '📈', '📊', '💰', '🛒', '✈️', '🌍', '🏃', '🍎',
  '🎨', '🎵', '🎬', '📷', '🧪', '🛠️', '⚙️', '🔒', '🔑', '❤️',
  '😀', '😎', '🤔', '🙌', '👋', '🐶', '🌱', '🌙', '☀️', '☕',
];
