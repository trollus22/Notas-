// Habla con las agentes de Hermes a través del servicio intermedio de Twenty (planner.pacerlabs.es/agents-api).
// La app solo manda tu sesión de Twenty; la clave de la agente vive en el servidor.
import { fetch as streamingFetch } from 'expo/fetch';

import { TWENTY_URL } from './twenty';

export const AGENTS_API = `${TWENTY_URL}/agents-api`;

export type AgentEvent =
  | { type: 'session'; sessionId: string; runId: string }
  | { type: 'delta'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'done'; text: string };

/** Trocea un texto SSE en eventos; devuelve lo que sobra para el siguiente trozo. */
export function parseSse(buffer: string): { events: AgentEvent[]; rest: string } {
  const events: AgentEvent[] = [];
  let rest = buffer;
  let i: number;
  while ((i = rest.indexOf('\n\n')) >= 0) {
    const raw = rest.slice(0, i);
    rest = rest.slice(i + 2);
    const type = /^event: (\w+)$/m.exec(raw)?.[1];
    const data = /^data: (.*)$/ms.exec(raw)?.[1];
    if (!type || data == null) continue;
    let d: any;
    try {
      d = JSON.parse(data);
    } catch {
      continue;
    }
    if (type === 'session') events.push({ type, sessionId: d.sessionId, runId: d.runId });
    else if (type === 'delta') events.push({ type, text: String(d.text ?? '') });
    else if (type === 'tool') events.push({ type, name: String(d.name ?? '') });
    else if (type === 'done') events.push({ type, text: String(d.text ?? '') });
    else if (type === 'error') throw new Error(String(d.message ?? 'La agente no ha podido responder.'));
  }
  return { events, rest };
}

export class AgentError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AgentError';
  }
}

/** Envía un mensaje a una agente y va entregando su respuesta según llega. */
export async function chatWithAgent({
  token,
  agent,
  message,
  sessionId,
  signal,
  onEvent,
}: {
  token: string;
  agent: string;
  message: string;
  sessionId?: string | null;
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
}): Promise<void> {
  const res = await streamingFetch(`${AGENTS_API}/v1/agents/${agent}/chat`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ message, ...(sessionId ? { sessionId } : {}) }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new AgentError(
      res.status,
      res.status === 401 ? 'La sesión de Twenty ha caducado.' : res.status === 429 ? 'Vas muy rápido: espera un momento.' : 'La agente no está disponible ahora mismo.',
    );
  }
  const decoder = new TextDecoder();
  let buffer = '';
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSse(buffer);
    buffer = parsed.rest;
    parsed.events.forEach(onEvent);
  }
}

/** Pide parar la respuesta en curso (no falla si ya terminó). */
export async function stopAgentRun(token: string, agent: string, runId: string): Promise<void> {
  await streamingFetch(`${AGENTS_API}/v1/agents/${agent}/runs/${runId}/stop`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  }).catch(() => undefined);
}
