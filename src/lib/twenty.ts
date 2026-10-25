// Cliente de solo lectura para la API de Twenty (planner.pacerlabs.es).
// El acceso es con la cuenta del usuario: se pide un token de sesión con correo y contraseña y se usa como Bearer.
// Nunca se guarda la contraseña; el token sí (en SecureStore, ver twenty-session.ts).

export const TWENTY_URL = 'https://planner.pacerlabs.es';

export type TwentyNote = { id: string; title: string; text: string; updatedAt: string };
export type TwentyTask = { id: string; title: string; text: string; status: string | null; dueAt: string | null; updatedAt: string };

export class TwentyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'TwentyError';
  }
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TWENTY_URL}/metadata`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: TWENTY_URL },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors?.length) {
    throw new TwentyError(res.status, body.errors?.[0]?.userFriendlyMessage?.message ?? 'No se pudo iniciar sesión en Twenty.');
  }
  return body.data as T;
}

/** Inicia sesión con la cuenta de Twenty y devuelve el token de acceso. */
export async function signIn(email: string, password: string): Promise<string> {
  const step1 = await gql<{ getLoginTokenFromCredentials: { loginToken: { token: string } } }>(
    `mutation GetLoginTokenFromCredentials($email: String!, $password: String!, $origin: String!) {
       getLoginTokenFromCredentials(email: $email, password: $password, origin: $origin) { loginToken { token } }
     }`,
    { email, password, origin: TWENTY_URL },
  );
  const loginToken = step1.getLoginTokenFromCredentials.loginToken.token;
  const step2 = await gql<{ getAuthTokensFromLoginToken: { tokens: { accessOrWorkspaceAgnosticToken: { token: string } } } }>(
    `mutation GetAuthTokensFromLoginToken($loginToken: String!, $origin: String!) {
       getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) { tokens { accessOrWorkspaceAgnosticToken { token } } }
     }`,
    { loginToken, origin: TWENTY_URL },
  );
  return step2.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token;
}

async function rest<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${TWENTY_URL}${path}`, { headers: { authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new TwentyError(res.status, res.status === 401 ? 'La sesión de Twenty ha caducado.' : 'No se pudo leer Twenty.');
  return body as T;
}

/** Texto plano del cuerpo de una nota de Twenty (su markdown; vacío si no tiene). */
const textOf = (r: { bodyV2?: { markdown?: string | null } | null }) => (r.bodyV2?.markdown ?? '').trim();

export async function listNotes(token: string, limit = 100): Promise<TwentyNote[]> {
  const body = await rest<{ data: { notes: { id: string; title: string | null; updatedAt: string; bodyV2?: { markdown?: string | null } | null }[] } }>(token, `/rest/notes?limit=${limit}&orderBy=position`);
  return body.data.notes.map((n) => ({ id: n.id, title: n.title?.trim() || 'Sin título', text: textOf(n), updatedAt: n.updatedAt }));
}

export async function listTasks(token: string, limit = 100): Promise<TwentyTask[]> {
  const body = await rest<{ data: { tasks: { id: string; title: string | null; status?: string | null; dueAt?: string | null; updatedAt: string; bodyV2?: { markdown?: string | null } | null }[] } }>(token, `/rest/tasks?limit=${limit}&orderBy=position`);
  return body.data.tasks.map((t) => ({ id: t.id, title: t.title?.trim() || 'Sin título', text: textOf(t), status: t.status ?? null, dueAt: t.dueAt ?? null, updatedAt: t.updatedAt }));
}

/** Primera línea con contenido, para la vista previa de una fila. */
export function preview(text: string): string {
  return text.split('\n').map((l) => l.replace(/^[#>*\-\s\[\]x]+/i, '').trim()).find(Boolean) ?? '';
}
