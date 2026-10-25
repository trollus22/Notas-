import { parseSse } from '../agents-api';
import { replyMessage, sendMessage } from '../chat';
import { applyPatch, treeOf } from './helpers';
import { chatMessages } from '../chat';

const frame = (event: string, data: object) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

describe('parseSse', () => {
  it('lee los eventos del servicio y deja el trozo incompleto para después', () => {
    const text = frame('session', { sessionId: 'api_1_ab', runId: 'run_1' }) + frame('delta', { text: 'Ho' }) + frame('tool', { name: 'terminal' }) + 'event: delta\ndata: {"te';
    const { events, rest } = parseSse(text);
    expect(events).toEqual([
      { type: 'session', sessionId: 'api_1_ab', runId: 'run_1' },
      { type: 'delta', text: 'Ho' },
      { type: 'tool', name: 'terminal' },
    ]);
    const next = parseSse(rest + 'xt":"la"}\n\n' + frame('done', { text: 'Hola' }));
    expect(next.events).toEqual([{ type: 'delta', text: 'la' }, { type: 'done', text: 'Hola' }]);
  });

  it('un evento de error corta con el mensaje del servicio', () => {
    expect(() => parseSse(frame('error', { message: 'La agente no ha podido responder.' }))).toThrow('La agente no ha podido responder.');
  });
});

describe('agente conectada', () => {
  it('dev no añade aviso al enviar; su respuesta se guarda después con la sesión', () => {
    const tree = treeOf();
    const sent = sendMessage(tree, null, '@dev hola', 10);
    const afterSend = applyPatch(tree, sent.patch);
    expect(chatMessages(afterSend, sent.chatId).map((m) => m.role)).toEqual(['user']);

    const reply = replyMessage(afterSend, sent.chatId, 'dev', { text: 'Hola', session: 'api_1_ab' }, 20);
    const done = applyPatch(afterSend, reply);
    expect(chatMessages(done, sent.chatId).map((m) => [m.role, m.agent, m.text])).toEqual([['user', undefined, '@dev hola'], ['assistant', 'dev', 'Hola']]);
    expect(done.map.get(sent.chatId)?.session).toBe('api_1_ab');
  });

  it('sin agente elegida el mensaje se guarda con un aviso', () => {
    const tree = treeOf();
    const sent = sendMessage(tree, null, 'hola a nadie', 10);
    expect(chatMessages(applyPatch(tree, sent.patch), sent.chatId).map((m) => m.role)).toEqual(['user', 'notice']);
  });

  it('un fallo se guarda como aviso', () => {
    const tree = treeOf();
    const sent = sendMessage(tree, null, '@dev hola', 10);
    const after = applyPatch(tree, sent.patch);
    const failed = applyPatch(after, replyMessage(after, sent.chatId, 'dev', { text: 'La agente no está disponible ahora mismo.', failed: true }, 20));
    expect(chatMessages(failed, sent.chatId).map((m) => m.role)).toEqual(['user', 'notice']);
  });
});
