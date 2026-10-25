import { generateNKeysBetween } from 'fractional-indexing';

import { agentById, mentionedAgent } from './agents';
import { keyAtEnd, newBlock } from './editing';
import { childrenOf, type Tree } from './tree';
import type { Block, Patch } from './types';

export const NOT_CONNECTED_NOTICE =
  'La IA todavía no está conectada. Cuando conectemos el servidor podré responder aquí; tu mensaje queda guardado en este chat.';

/** Aviso de una agente concreta: lo mismo, con su nombre. */
export const agentNotice = (agentId?: string): string =>
  agentById(agentId) ? `${agentById(agentId)!.name} todavía no está conectada. Tu mensaje queda guardado en este chat y lo verá cuando la conectemos.` : NOT_CONNECTED_NOTICE;

export function chatMessages(tree: Tree, chatId: string | null): Block[] {
  if (!chatId) return [];
  return childrenOf(tree, chatId).filter((block) => block.type === 'message');
}

/**
 * Save a message the user sent, starting the chat if needed. Without an AI
 * service the reply is a notice saying so, never an invented answer.
 */
export function sendMessage(tree: Tree, chatId: string | null, text: string, now: number): { patch: Patch; chatId: string } {
  const existing = chatId ? tree.map.get(chatId) : undefined;
  // La agente es la mencionada con @ o, si no hay, la del chat.
  const agent = mentionedAgent(text)?.id ?? existing?.agent;
  const chat = existing
    ? { ...existing, updatedAt: now, ...(agent ? { agent } : {}) }
    : newBlock(
        { type: 'chat', parentId: null, position: keyAtEnd(tree, null), text: text.trim().replace(/\s+/g, ' ').slice(0, 40), ...(agent ? { agent } : {}) },
        now,
      );

  const messages = chatMessages(tree, chat.id);
  const [userKey, noticeKey] = generateNKeysBetween(messages[messages.length - 1]?.position ?? null, null, 2);
  const userMessage = newBlock({ type: 'message', role: 'user', parentId: chat.id, position: userKey, text: text.trim() }, now);
  const notice = newBlock(
    { type: 'message', role: 'notice', parentId: chat.id, position: noticeKey, text: agentNotice(agent), ...(agent ? { agent } : {}) },
    now,
  );
  return { patch: { put: [chat, userMessage, notice], remove: [] }, chatId: chat.id };
}
