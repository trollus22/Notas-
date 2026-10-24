import { useLayoutEffect, type RefObject } from 'react';

function fitToContent(node: HTMLTextAreaElement | null) {
  if (!node?.style) return;
  node.style.height = '0px';
  node.style.height = `${node.scrollHeight}px`;
}

/**
 * Browsers keep a textarea at its row count, so size it to its content after
 * every change, the way native multiline inputs behave.
 */
export function useAutoGrow(input: RefObject<unknown>, value: string): void {
  useLayoutEffect(() => {
    fitToContent(input.current as HTMLTextAreaElement | null);
  }, [input, value]);
}

/** Start from a single row; the height is set by `useAutoGrow`. */
export const autoGrowProps = { rows: 1 };
