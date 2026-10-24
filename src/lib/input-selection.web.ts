/**
 * Browsers do not fire a selection event when the caret moves with the
 * keyboard (Home, arrows), so read it from the textarea itself.
 */
export function currentSelection(input: unknown): { start: number; end: number } | undefined {
  const node = input as HTMLTextAreaElement | null;
  if (!node || typeof node.selectionStart !== 'number') return undefined;
  return { start: node.selectionStart, end: node.selectionEnd };
}

/** On web the input is the textarea element itself. */
export function setCaret(input: unknown, offset: number): void {
  (input as HTMLTextAreaElement).setSelectionRange?.(offset, offset);
}
