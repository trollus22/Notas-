import type { TextInputInstance } from 'react-native';

/** Native inputs report the caret through `onSelectionChange`; nothing extra to read. */
export function currentSelection(_input: unknown): { start: number; end: number } | undefined {
  return undefined;
}

export function setCaret(input: TextInputInstance, offset: number): void {
  input.setSelection(offset, offset);
}
