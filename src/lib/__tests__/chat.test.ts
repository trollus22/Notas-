import { chatMessages, NOT_CONNECTED_NOTICE, sendMessage } from '../chat';
import { chats, privatePages, searchPages } from '../tree';
import { applyPatch, n, treeOf } from './helpers';

describe('chat', () => {
  it('starts a chat titled after the first message and adds a notice instead of a reply', () => {
    const tree = treeOf(n('p', 'page', 'Página'));
    const first = sendMessage(tree, null, '  Hola,   ¿qué tal?  ', 10);
    const next = applyPatch(tree, first.patch);

    expect(chats(next).map((chat) => chat.text)).toEqual(['Hola, ¿qué tal?']);
    expect(chatMessages(next, first.chatId).map((message) => [message.role, message.text])).toEqual([
      ['user', 'Hola,   ¿qué tal?'],
      ['notice', NOT_CONNECTED_NOTICE],
    ]);
    expect(privatePages(next).map((page) => page.id)).toEqual(['p']);
  });

  it('appends to an existing chat in order and keeps chats out of search', () => {
    const tree = treeOf();
    const first = sendMessage(tree, null, 'Uno', 10);
    const afterFirst = applyPatch(tree, first.patch);
    const second = sendMessage(afterFirst, first.chatId, 'Dos', 20);
    const afterSecond = applyPatch(afterFirst, second.patch);

    expect(second.chatId).toBe(first.chatId);
    expect(chatMessages(afterSecond, first.chatId).map((message) => message.text)).toEqual([
      'Uno',
      NOT_CONNECTED_NOTICE,
      'Dos',
      NOT_CONNECTED_NOTICE,
    ]);
    expect(afterSecond.map.get(first.chatId)?.updatedAt).toBe(20);
    expect(searchPages(afterSecond, 'Dos')).toEqual([]);
  });
});
