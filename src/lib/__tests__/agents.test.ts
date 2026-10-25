import { agentNotice, chatMessages, sendMessage } from '../chat';
import { AGENTS, insertMention, mentionQuery, mentionedAgent } from '../agents';
import { applyPatch, treeOf } from './helpers';

describe('agentes', () => {
  it('detecta la agente mencionada con @', () => {
    expect(mentionedAgent('@dev ¿cómo va el build?')?.id).toBe('dev');
    expect(mentionedAgent('hola @marca')?.id).toBe('marca');
    expect(mentionedAgent('correo@dev.com')).toBeUndefined();
    expect(mentionedAgent('sin menciones')).toBeUndefined();
  });

  it('ofrece agentes mientras se escribe la mención y la completa', () => {
    expect(mentionQuery('hola @')?.map((a) => a.id)).toEqual(AGENTS.map((a) => a.id));
    expect(mentionQuery('@d')?.map((a) => a.id)).toEqual(['dev']);
    expect(mentionQuery('@dev ya')).toBeNull();
    expect(insertMention('hola @d', AGENTS[1])).toBe('hola @dev ');
  });

  it('sin agente conectada el chat avisa en vez de inventar una respuesta', () => {
    const tree = treeOf();
    const first = sendMessage(tree, null, 'sin agente concreta', 10);
    const next = applyPatch(tree, first.patch);
    expect(next.map.get(first.chatId)?.agent).toBeUndefined();
    const msgs = chatMessages(next, first.chatId);
    expect(msgs.map((m) => m.role)).toEqual(['user', 'notice']);
    expect(msgs[1].text).toBe(agentNotice(undefined));
    // Un mensaje posterior que menciona a una agente fija el chat con ella.
    const second = sendMessage(next, first.chatId, '@marca y la portada', 20);
    expect(applyPatch(next, second.patch).map.get(first.chatId)?.agent).toBe('marca');
  });
});
