// Conexión con Twenty (planner.pacerlabs.es): inicio de sesión con la cuenta del usuario y lectura de datos por la API REST.
// La contraseña nunca se guarda; el token sí (en el llavero del dispositivo, ver twenty-session.ts).
import type { TwentyData } from './twenty-import';

export const TWENTY_URL = 'https://planner.pacerlabs.es';

export class TwentyError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'TwentyError';
    this.status = status;
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
  const step2 = await gql<{ getAuthTokensFromLoginToken: { tokens: { accessOrWorkspaceAgnosticToken: { token: string } } } }>(
    `mutation GetAuthTokensFromLoginToken($loginToken: String!, $origin: String!) {
       getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) { tokens { accessOrWorkspaceAgnosticToken { token } } }
     }`,
    { loginToken: step1.getLoginTokenFromCredentials.loginToken.token, origin: TWENTY_URL },
  );
  return step2.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token;
}

async function rest<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${TWENTY_URL}${path}`, { headers: { authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new TwentyError(res.status, res.status === 401 ? 'La sesión de Twenty ha caducado.' : 'No se pudo leer Twenty.');
  return body as T;
}

/** Descarga lo necesario de Twenty para montar el espacio de la app. */
export async function fetchTwentyData(token: string, plurals: string[]): Promise<TwentyData> {
  const [objects, members] = await Promise.all([
    rest<{ data: TwentyData['objects'] }>(token, '/rest/metadata/objects?limit=200').then((b) => b.data),
    rest<{ data: { workspaceMembers: TwentyData['members'] } }>(token, '/rest/workspaceMembers?limit=200').then((b) => b.data.workspaceMembers),
  ]);
  const records: TwentyData['records'] = {};
  await Promise.all(
    plurals.map(async (p) => {
      const body = await rest<{ data: Record<string, Record<string, unknown>[]> }>(token, `/rest/${p}?limit=200&orderBy=position`);
      records[p] = body.data[p] ?? [];
    }),
  );
  return { workspaceName: 'PACER LABS', objects, records, members };
}
