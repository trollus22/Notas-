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
export const textOf = (r: { bodyV2?: { markdown?: string | null } | null }) => (r.bodyV2?.markdown ?? '').trim();

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

// ---- Datos de Twenty para la app ----

export type TwentyRecord = Record<string, any>;

/** Objetos de Twenty que se ven en la app, con su nombre en la barra lateral y su icono. */
export const TWENTY_OBJECTS = [
  { plural: 'companies', label: 'Empresas', icon: 'business-outline' },
  { plural: 'people', label: 'Personas', icon: 'person-outline' },
  { plural: 'opportunities', label: 'Oportunidades', icon: 'trophy-outline' },
  { plural: 'tasks', label: 'Tareas', icon: 'checkbox-outline' },
  { plural: 'notes', label: 'Notas', icon: 'document-text-outline' },
  { plural: 'publicaciones', label: 'Publicaciones', icon: 'calendar-outline' },
] as const;

export type TwentyObjectPlural = (typeof TWENTY_OBJECTS)[number]['plural'];

export function objectLabel(plural: string): string {
  return TWENTY_OBJECTS.find((o) => o.plural === plural)?.label ?? plural;
}

export async function listRecords(token: string, plural: string, limit = 100): Promise<TwentyRecord[]> {
  const body = await rest<{ data: Record<string, TwentyRecord[]> }>(token, `/rest/${plural}?limit=${limit}&orderBy=position`);
  return body.data[plural] ?? [];
}

export async function getRecord(token: string, plural: string, id: string): Promise<TwentyRecord> {
  const body = await rest<{ data: Record<string, TwentyRecord> }>(token, `/rest/${plural}/${id}`);
  const singular = Object.keys(body.data)[0];
  return body.data[singular];
}

/** Nombre visible de un registro: título, nombre o nombre completo (personas). */
export function titleOf(r: TwentyRecord): string {
  if (typeof r.title === 'string' && r.title.trim()) return r.title.trim();
  if (typeof r.name === 'string' && r.name.trim()) return r.name.trim();
  if (r.name && typeof r.name === 'object') {
    const full = [r.name.firstName, r.name.lastName].filter(Boolean).join(' ').trim();
    if (full) return full;
  }
  return 'Sin nombre';
}

const money = (amount: TwentyRecord | null | undefined) =>
  amount?.amountMicros != null ? `${Math.round(amount.amountMicros / 1e6).toLocaleString('es-ES')} ${amount.currencyCode ?? ''}`.trim() : '';

/** Línea secundaria de una fila: estado, fecha o importe, según el objeto. */
export function subtitleOf(plural: string, r: TwentyRecord): string {
  const body = textOf(r);
  if (plural === 'tasks') return [r.status, r.dueAt ? new Date(r.dueAt).toLocaleDateString('es-ES') : ''].filter(Boolean).join(' · ');
  if (plural === 'opportunities') return [r.stage, money(r.amount)].filter(Boolean).join(' · ');
  if (plural === 'companies') return [r.domainName?.primaryLinkUrl, r.categoria].filter(Boolean).join(' · ');
  if (plural === 'people') return r.jobTitle ?? '';
  if (plural === 'notes') return preview(body);
  return preview(body) || (r.fecha ? new Date(r.fecha).toLocaleDateString('es-ES') : '');
}

/** Campos sencillos de un registro, para la ficha (sin ids, fechas técnicas ni relaciones). */
export function fieldsOf(r: TwentyRecord): { label: string; value: string }[] {
  const skip = /^(id|position|createdAt|updatedAt|deletedAt|createdBy|updatedBy|bodyV2|title|name|searchVector|.*Id|.*Ids|.*Relation|timelineActivities|attachments|favorites|noteTargets|taskTargets|messageParticipants|messageThreadTargets|listMemberships|accountOwner|personId|companyId)$/;
  const out: { label: string; value: string }[] = [];
  for (const [key, v] of Object.entries(r)) {
    if (skip.test(key) || v == null || v === '') continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out.push({ label: key, value: String(v) });
    else if (key === 'amount') { const m = money(v as TwentyRecord); if (m) out.push({ label: key, value: m }); }
    else if (typeof v === 'object') {
      // Campos compuestos de Twenty: enlaces (LINKS), direcciones (ADDRESS) y moneda.
      const o = v as TwentyRecord;
      const link = o.primaryLinkUrl ?? o.url;
      const addr = [o.addressStreet1, o.addressCity, o.addressCountry].filter(Boolean).join(', ');
      const text = link ?? (addr || null);
      if (typeof text === 'string' && text) out.push({ label: key, value: text });
    }
  }
  return out;
}

export function bodyOf(r: TwentyRecord): string {
  return textOf(r);
}
