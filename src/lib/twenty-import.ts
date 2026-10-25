// Convierte los datos de Twenty al formato de la app (bloques): el diseño es el de siempre, el contenido sale de Twenty.
//
// - El espacio de Twenty es un espacio de equipo.
// - Cada objeto (empresas, personas, oportunidades, tareas, notas, publicaciones) es una base de datos con sus campos
//   como propiedades y una vista de tabla (y de tablero si tiene estado o etapa).
// - Cada registro es una fila; su cuerpo (notas y tareas) son los bloques de la página.
import { generateNKeysBetween } from 'fractional-indexing';

import type { Block, BlockColor, BlockType, DatabaseView, Patch, Property, PropertyValue, SelectOption, StatusGroup } from './types';

export type TwentyField = {
  id: string;
  name: string;
  label: string;
  type: string;
  isSystem?: boolean;
  isActive?: boolean;
  options?: { value: string; label: string; color?: string; position?: number }[] | null;
};
export type TwentyObjectMeta = {
  nameSingular: string;
  namePlural: string;
  labelPlural: string;
  labelIdentifierFieldMetadataId?: string | null;
  fields: TwentyField[];
};
export type TwentyMember = { id: string; name?: { firstName?: string; lastName?: string } | null };
export type TwentyData = {
  workspaceName: string;
  objects: TwentyObjectMeta[];
  records: Record<string, Record<string, any>[]>;
  members: TwentyMember[];
};

/** Objetos que se ven en la app, en el orden del menú de Twenty, con su icono. */
export const IMPORTED_OBJECTS: { plural: string; icon: string }[] = [
  { plural: 'companies', icon: 'ion:business:#337EA9' },
  { plural: 'people', icon: 'ion:person:#9065B0' },
  { plural: 'opportunities', icon: 'ion:trophy:#CB912F' },
  { plural: 'tasks', icon: 'ion:checkmark-circle:#448361' },
  { plural: 'notes', icon: 'ion:document-text:#91918E' },
  { plural: 'publicaciones', icon: 'ion:calendar:#C14C8A' },
];

const COLOR: Record<string, BlockColor> = {
  gray: 'gray', red: 'red', orange: 'orange', yellow: 'yellow', green: 'green', turquoise: 'green', sky: 'blue',
  blue: 'blue', purple: 'purple', pink: 'pink', brown: 'brown',
};
const colorOf = (c?: string): BlockColor => COLOR[c ?? ''] ?? 'gray';

const DONE = /^(DONE|COMPLETED|WON|CUSTOMER|PUBLISHED|PUBLICADO|HECHO|ARCHIVED)$/i;
const STATUS_FIELDS = new Set(['status', 'stage', 'estado', 'etapa']);
const PERSON_FIELDS = new Set(['assignee', 'accountOwner']);
const SKIP_TYPES = new Set(['RELATION', 'MORPH_RELATION', 'RICH_TEXT', 'RICH_TEXT_V2', 'ACTOR', 'UUID', 'TS_VECTOR', 'POSITION', 'RAW_JSON', 'FILES']);

const id = (...parts: string[]) => `tw-${parts.join('-')}`;
const toMs = (iso?: string | null) => (iso ? Date.parse(iso) || 0 : 0);
const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : null);

function memberName(m?: TwentyMember): string | null {
  const n = [m?.name?.firstName, m?.name?.lastName].filter(Boolean).join(' ').trim();
  return n || null;
}

/** Texto plano de un valor compuesto de Twenty (enlaces, emails, teléfonos, direcciones, moneda, nombre completo). */
function plain(v: any): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v !== 'object') return null;
  if ('amountMicros' in v) return v.amountMicros == null ? null : `${Math.round(v.amountMicros / 1e6).toLocaleString('es-ES')} ${v.currencyCode ?? ''}`.trim();
  if ('primaryLinkUrl' in v) return v.primaryLinkUrl || null;
  if ('primaryEmail' in v) return v.primaryEmail || null;
  if ('primaryPhoneNumber' in v) return [v.primaryPhoneCallingCode, v.primaryPhoneNumber].filter(Boolean).join(' ') || null;
  if ('addressCity' in v || 'addressStreet1' in v) return [v.addressStreet1, v.addressCity, v.addressCountry].filter(Boolean).join(', ') || null;
  if ('firstName' in v || 'lastName' in v) return [v.firstName, v.lastName].filter(Boolean).join(' ') || null;
  return null;
}

/** Propiedad de la base de datos para un campo de Twenty, o null si no se muestra. */
function propertyFor(f: TwentyField): Property | null {
  if (f.isSystem || f.isActive === false) return null;
  if (PERSON_FIELDS.has(f.name)) return { id: f.name, name: f.label, type: 'person' };
  if (SKIP_TYPES.has(f.type)) return null;
  if (f.type === 'SELECT' || f.type === 'MULTI_SELECT') {
    const sorted = [...(f.options ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const status = f.type === 'SELECT' && STATUS_FIELDS.has(f.name);
    const options: SelectOption[] = sorted.map((o, i) => ({
      id: o.value,
      name: o.label,
      color: colorOf(o.color),
      ...(status ? { group: (DONE.test(o.value) ? 'complete' : i === 0 ? 'todo' : 'inProgress') as StatusGroup } : {}),
    }));
    return { id: f.name, name: f.label, type: f.type === 'MULTI_SELECT' ? 'multiSelect' : status ? 'status' : 'select', options };
  }
  if (f.type === 'DATE' || f.type === 'DATE_TIME') return { id: f.name, name: f.label, type: 'date' };
  return { id: f.name, name: f.label, type: 'text' };
}

function valueFor(p: Property, r: Record<string, any>, members: Map<string, TwentyMember>): PropertyValue {
  if (p.type === 'person') return memberName(members.get(r[`${p.id}Id`])) ?? null;
  const v = r[p.id];
  if (p.type === 'date') return day(v);
  if (p.type === 'multiSelect') return Array.isArray(v) ? v : null;
  if (p.type === 'select' || p.type === 'status') return typeof v === 'string' ? v : null;
  return plain(v);
}

/** Bloques de BlockNote (el editor de Twenty) a bloques de la app. */
const BN_TYPE: Record<string, BlockType> = {
  paragraph: 'text', bulletListItem: 'bullet', numberedListItem: 'numbered', checkListItem: 'todo', quote: 'quote', codeBlock: 'code',
};
function inlineText(content: any): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((c) => (c?.type === 'link' ? inlineText(c.content) : typeof c?.text === 'string' ? c.text : '')).join('');
}
function bodyBlocks(recordId: string, r: Record<string, any>, now: number): Block[] {
  let doc: any[] = [];
  try {
    doc = JSON.parse(r.bodyV2?.blocknote ?? '[]');
  } catch {
    doc = [];
  }
  if (!Array.isArray(doc) || doc.length === 0) {
    // Sin BlockNote: el markdown, una línea por bloque.
    const md = (r.bodyV2?.markdown ?? '').trim();
    doc = md ? md.split('\n').filter((l: string) => l.trim()).map((l: string) => ({ type: 'paragraph', content: l })) : [];
  }
  const flat: { type: BlockType; text: string; checked?: boolean }[] = [];
  const walk = (nodes: any[]) => {
    for (const n of nodes) {
      const text = inlineText(n.content);
      const type: BlockType | undefined =
        n.type === 'heading' ? (n.props?.level === 1 ? 'h1' : n.props?.level === 2 ? 'h2' : 'h3') : BN_TYPE[n.type];
      if (type && !(type === 'text' && !text.trim())) flat.push({ type, text, ...(type === 'todo' ? { checked: !!n.props?.checked } : {}) });
      if (Array.isArray(n.children) && n.children.length) walk(n.children);
    }
  };
  walk(doc);
  const keys = generateNKeysBetween(null, null, flat.length);
  return flat.map((b, i) => ({ id: id(recordId, 'b', String(i)), parentId: id(recordId), position: keys[i], createdAt: now, updatedAt: now, ...b }));
}

const titleOf = (r: Record<string, any>, field?: TwentyField): string => {
  const v = field ? r[field.name] : r.title ?? r.name;
  return (plain(v) ?? plain(r.title) ?? plain(r.name) ?? '').trim();
};

/** Todo el espacio de la app a partir de los datos de Twenty. */
export function buildWorkspace(data: TwentyData, now = Date.now()): Patch {
  const put: Block[] = [];
  const members = new Map(data.members.map((m) => [m.id, m]));
  const team: Block = { id: id('team'), type: 'teamspace', parentId: null, position: 'a0', text: data.workspaceName, icon: 'ion:home:#91918E', createdAt: now, updatedAt: now };
  put.push(team);

  const metas = IMPORTED_OBJECTS.map((o) => ({ ...o, meta: data.objects.find((m) => m.namePlural === o.plural) })).filter((o) => o.meta);
  const dbKeys = generateNKeysBetween(null, null, metas.length);
  metas.forEach(({ plural, icon, meta }, i) => {
    const titleField = meta!.fields.find((f) => f.id === meta!.labelIdentifierFieldMetadataId);
    const schema = meta!.fields
      .filter((f) => f.id !== titleField?.id)
      .map(propertyFor)
      .filter((p): p is Property => p !== null);
    const board = schema.find((p) => p.type === 'status');
    const views: DatabaseView[] = [
      { id: 'all', name: `Todas`, type: 'table', icon: 'star', columns: schema.slice(0, 6).map((p) => p.id) },
      ...(board ? [{ id: 'board', name: `Por ${board.name.toLowerCase()}`, type: 'board' as const, icon: 'arrow-forward-circle', groupBy: board.id }] : []),
    ];
    const dbId = id(plural);
    put.push({ id: dbId, type: 'database', parentId: team.id, position: dbKeys[i], text: meta!.labelPlural, icon, schema, views, titleLabel: titleField?.label, createdAt: now, updatedAt: now });

    const rows = data.records[plural] ?? [];
    const rowKeys = generateNKeysBetween(null, null, rows.length);
    rows.forEach((r, j) => {
      const props: Record<string, PropertyValue> = {};
      for (const p of schema) props[p.id] = valueFor(p, r, members);
      put.push({
        id: id(r.id), type: 'page', parentId: dbId, position: rowKeys[j], text: titleOf(r, titleField), props,
        createdAt: toMs(r.createdAt) || now, updatedAt: toMs(r.updatedAt) || now,
      });
      put.push(...bodyBlocks(r.id, r, toMs(r.updatedAt) || now));
    });
  });
  return { put, remove: [] };
}
