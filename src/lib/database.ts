import { keyAtEnd, newBlock } from './editing';
import { newId } from './ids';
import { childrenOf, type Tree } from './tree';
import type {
  Block,
  DatabaseView,
  EditResult,
  Patch,
  Property,
  PropertyValue,
  SelectOption,
  StatusGroup,
  ViewType,
} from './types';

/** The name the local user goes by in "person" properties. */
export const ME = 'Yo';

export function databaseRows(tree: Tree, databaseId: string): Block[] {
  return childrenOf(tree, databaseId).filter((block) => block.type === 'page' && !block.deletedAt);
}

export function propertyById(database: Block, propertyId: string | undefined): Property | undefined {
  return database.schema?.find((property) => property.id === propertyId);
}

export function optionById(property: Property | undefined, optionId: PropertyValue | undefined): SelectOption | undefined {
  if (typeof optionId !== 'string') return undefined;
  return property?.options?.find((option) => option.id === optionId);
}

/** The first status property, which drives checklists and the default board. */
export function statusProperty(database: Block): Property | undefined {
  return database.schema?.find((property) => property.type === 'status');
}

export function viewById(database: Block, viewId: string | undefined | null): DatabaseView | undefined {
  const views = database.views ?? [];
  return views.find((view) => view.id === viewId) ?? views[0];
}

const GROUP_ORDER: Record<StatusGroup, number> = { todo: 0, inProgress: 1, complete: 2 };

/** Rows a view shows: its filter and the search text applied; checklists list open tasks first. */
export function rowsForView(tree: Tree, database: Block, view: DatabaseView | undefined, query = ''): Block[] {
  const needle = query.trim().toLowerCase();
  const rows = databaseRows(tree, database.id).filter((row) => {
    if (needle && !row.text.toLowerCase().includes(needle)) return false;
    if (!view?.filter) return true;
    const value = row.props?.[view.filter.propertyId] ?? null;
    return Array.isArray(value) ? value.includes(view.filter.value ?? '') : value === view.filter.value;
  });
  if (view?.type !== 'checklist') return rows;
  return rows.sort((a, b) => GROUP_ORDER[statusGroupOf(database, a)] - GROUP_ORDER[statusGroupOf(database, b)]);
}

export interface BoardColumn {
  option: SelectOption | null;
  rows: Block[];
}

/** Board columns: one per option of the grouping property, plus "no value" when used. */
export function boardColumns(database: Block, view: DatabaseView, rows: Block[]): BoardColumn[] {
  const property = propertyById(database, view.groupBy) ?? statusProperty(database);
  if (!property) return [{ option: null, rows }];
  const columns: BoardColumn[] = (property.options ?? []).map((option) => ({ option, rows: [] }));
  const empty: BoardColumn = { option: null, rows: [] };
  for (const row of rows) {
    const value = row.props?.[property.id];
    const column = columns.find((candidate) => candidate.option?.id === value);
    (column ?? empty).rows.push(row);
  }
  return empty.rows.length > 0 ? [empty, ...columns] : columns;
}

export function statusGroupOf(database: Block, row: Block): StatusGroup {
  const property = statusProperty(database);
  return optionById(property, row.props?.[property?.id ?? ''])?.group ?? 'todo';
}

function firstOptionIn(property: Property | undefined, group: StatusGroup): SelectOption | undefined {
  return property?.options?.find((option) => option.group === group);
}

export function setRowProperty(tree: Tree, rowId: string, propertyId: string, value: PropertyValue, now: number): Patch {
  const row = tree.map.get(rowId);
  if (!row) return { put: [], remove: [] };
  return { put: [{ ...row, props: { ...row.props, [propertyId]: value }, updatedAt: now }], remove: [] };
}

/** Checklist tick: complete ↔ not started. */
export function toggleRowDone(tree: Tree, database: Block, rowId: string, now: number): Patch {
  const property = statusProperty(database);
  const row = tree.map.get(rowId);
  if (!property || !row) return { put: [], remove: [] };
  const target = statusGroupOf(database, row) === 'complete' ? 'todo' : 'complete';
  return setRowProperty(tree, rowId, property.id, firstOptionIn(property, target)?.id ?? null, now);
}

/**
 * New row at the end of the database. Values from the view's filter and the
 * board column are filled in so the row shows up where it was created.
 */
export function createRow(
  tree: Tree,
  database: Block,
  now: number,
  options: { view?: DatabaseView; props?: Record<string, PropertyValue> } = {},
): EditResult {
  const status = statusProperty(database);
  const props: Record<string, PropertyValue> = {};
  const defaultStatus = firstOptionIn(status, 'todo');
  if (status && defaultStatus) props[status.id] = defaultStatus.id;
  if (options.view?.filter) props[options.view.filter.propertyId] = options.view.filter.value;
  Object.assign(props, options.props);

  const row = newBlock(
    { type: 'page', parentId: database.id, position: keyAtEnd(tree, database.id), props, viewedAt: now },
    now,
  );
  return { patch: { put: [row], remove: [] }, open: row.id, focus: { id: 'title', offset: 0 } };
}

const VIEW_DEFAULTS: Record<ViewType, { name: string; icon: string }> = {
  table: { name: 'Tabla', icon: 'grid-outline' },
  board: { name: 'Tablero', icon: 'albums-outline' },
  checklist: { name: 'Checklist', icon: 'list' },
};

export function addView(database: Block, type: ViewType, now: number): { patch: Patch; view: DatabaseView } {
  const status = statusProperty(database);
  const view: DatabaseView = {
    id: newId(),
    type,
    ...VIEW_DEFAULTS[type],
    ...(type === 'board' && status ? { groupBy: status.id } : {}),
  };
  return {
    view,
    patch: { put: [{ ...database, views: [...(database.views ?? []), view], updatedAt: now }], remove: [] },
  };
}

export function removeView(database: Block, viewId: string, now: number): Patch {
  const views = (database.views ?? []).filter((view) => view.id !== viewId);
  if (views.length === 0) return { put: [], remove: [] };
  return { put: [{ ...database, views, updatedAt: now }], remove: [] };
}

/** Properties shown as table columns for a view. */
export function tableColumns(database: Block, view: DatabaseView | undefined): Property[] {
  const schema = database.schema ?? [];
  if (!view?.columns) return schema;
  return view.columns
    .map((id) => schema.find((property) => property.id === id))
    .filter((property): property is Property => !!property);
}

/** `2025-02-03` → `02/03/2025`, the format the app shows dates in. */
export function formatDate(value: PropertyValue | undefined): string {
  if (typeof value !== 'string') return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value;
}

export function isoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function updateView(database: Block, viewId: string, change: (view: DatabaseView) => DatabaseView, now: number): Patch {
  const views = (database.views ?? []).map((view) => (view.id === viewId ? change(view) : view));
  return { put: [{ ...database, views, updatedAt: now }], remove: [] };
}

export function setViewFilter(database: Block, viewId: string, filter: DatabaseView['filter'] | null, now: number): Patch {
  return updateView(
    database,
    viewId,
    (view) => {
      const { filter: _previous, ...rest } = view;
      return filter ? { ...rest, filter } : rest;
    },
    now,
  );
}

/** Show or hide a table column, keeping the schema order. */
export function toggleViewColumn(database: Block, viewId: string, propertyId: string, now: number): Patch {
  return updateView(
    database,
    viewId,
    (view) => {
      const shown = new Set(tableColumns(database, view).map((property) => property.id));
      if (shown.has(propertyId)) shown.delete(propertyId);
      else shown.add(propertyId);
      return { ...view, columns: (database.schema ?? []).map((property) => property.id).filter((id) => shown.has(id)) };
    },
    now,
  );
}
