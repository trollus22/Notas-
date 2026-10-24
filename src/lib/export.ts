import { pageTitle } from './format';
import { flattenPage, type Tree } from './tree';
import type { Block } from './types';

function line(block: Block, number: number | undefined): string {
  switch (block.type) {
    case 'h1':
      return `# ${block.text}`;
    case 'h2':
      return `## ${block.text}`;
    case 'h3':
      return `### ${block.text}`;
    case 'todo':
      return `- [${block.checked ? 'x' : ' '}] ${block.text}`;
    case 'bullet':
    case 'toggle':
      return `- ${block.text}`;
    case 'numbered':
      return `${number ?? 1}. ${block.text}`;
    case 'quote':
      return `> ${block.text}`;
    case 'callout':
      return `> ${block.icon ?? '💡'} ${block.text}`;
    case 'code':
      return `\`\`\`\n${block.text}\n\`\`\``;
    case 'divider':
      return '---';
    case 'page':
    case 'database':
      return `📄 ${pageTitle(block)}`;
    default:
      return block.text;
  }
}

/** A page as Markdown-like plain text, for the share sheet. Closed toggles are included. */
export function pageToText(tree: Tree, pageId: string): string {
  const page = tree.map.get(pageId);
  if (!page) return '';
  const body = flattenPage(tree, pageId).map(({ block, depth, number }) => '  '.repeat(depth) + line(block, number));
  return [`# ${pageTitle(page)}`, '', ...body].join('\n').trimEnd();
}
