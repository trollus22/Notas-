// Las agentes de Twenty a las que se escribe desde el chat. Aún no hay servidor que las haga responder:
// la app guarda tus mensajes y lo dice claramente (ver chat.ts), sin inventar respuestas ni estados.
export interface Agent {
  id: string;
  name: string;
  role: string;
  /** Fondo y letra del avatar, apagados como el resto de la interfaz. */
  bg: string;
  fg: string;
  /** Responde de verdad (tiene servidor detrás). Las demás guardan el mensaje y lo avisan. */
  connected?: boolean;
}

export const AGENTS: Agent[] = [
  { id: 'pacer', name: 'pacer', role: 'coordina', bg: '#EDE4F7', fg: '#7B5C7E', connected: true },
  { id: 'dev', name: 'dev', role: 'código y builds', bg: '#DCEBF6', fg: '#337EA9', connected: true },
  { id: 'marca', name: 'marca', role: 'diseño', bg: '#FBE6D5', fg: '#B45309', connected: true },
  { id: 'growth', name: 'growth', role: 'contenido', bg: '#FBF0C9', fg: '#8F7340', connected: true },
];

export const agentById = (id?: string | null): Agent | undefined => AGENTS.find((a) => a.id === id);

/** Primera agente mencionada con @ en el texto (`@dev ¿cómo va…?`), si la hay. */
export function mentionedAgent(text: string): Agent | undefined {
  const match = text.match(/(^|\s)@([a-záéíóúñ]+)/i);
  return match ? AGENTS.find((a) => a.id === match[2].toLowerCase()) : undefined;
}

/** Si el texto termina en `@pal…` (sin espacio detrás), las agentes que encajan para ofrecerlas. */
export function mentionQuery(text: string): Agent[] | null {
  const match = text.match(/(^|\s)@([a-záéíóúñ]*)$/i);
  if (!match) return null;
  const q = match[2].toLowerCase();
  return AGENTS.filter((a) => a.id.startsWith(q));
}

/** Sustituye el `@…` final por la agente elegida, con un espacio para seguir escribiendo. */
export function insertMention(text: string, agent: Agent): string {
  return text.replace(/@[a-záéíóúñ]*$/i, `@${agent.id} `);
}
