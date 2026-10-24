import {
  addView,
  boardColumns,
  createRow,
  databaseRows,
  formatDate,
  isoDate,
  ME,
  removeView,
  rowsForView,
  setRowProperty,
  setViewFilter,
  tableColumns,
  toggleRowDone,
  toggleViewColumn,
  viewById,
} from '../database';
import { flattenPage, pageAncestors, subPages, teamspaces, type Tree } from '../tree';
import type { Block, Property } from '../types';
import { applyPatch, n, treeOf } from './helpers';

const NOW = 5_000;

const schema: Property[] = [
  {
    id: 'status',
    name: 'Status',
    type: 'status',
    options: [
      { id: 'todo', name: 'Not started', color: 'gray', group: 'todo' },
      { id: 'doing', name: 'In progress', color: 'blue', group: 'inProgress' },
      { id: 'done', name: 'Done', color: 'green', group: 'complete' },
    ],
  },
  { id: 'who', name: 'Assignee', type: 'person' },
  { id: 'tags', name: 'Tags', type: 'multiSelect', options: [{ id: 'bug', name: 'Bug', color: 'red' }] },
];

function tasksTree(): Tree {
  return treeOf(
    n('team', 'teamspace', 'Sede', [
      n('db', 'database', 'Tareas', [
        n('r1', 'page', 'Uno', [], { props: { status: 'done', who: ME } }),
        n('r2', 'page', 'Dos', [], { props: { status: 'doing', tags: ['bug'] } }),
        n('r3', 'page', 'Tres', [], { props: { status: 'todo' } }),
        n('r4', 'page', 'Borrada', [], { props: { status: 'todo' }, deletedAt: 1 }),
      ], {
        schema,
        views: [
          { id: 'all', name: 'All', type: 'table', icon: 'star' },
          { id: 'board', name: 'Board', type: 'board', icon: 'albums', groupBy: 'status' },
          { id: 'mine', name: 'Mine', type: 'table', icon: 'person', filter: { propertyId: 'who', value: ME }, columns: ['who'] },
          { id: 'check', name: 'Check', type: 'checklist', icon: 'list' },
        ],
      }),
    ]),
  );
}

const db = (tree: Tree) => tree.map.get('db') as Block;

describe('database views', () => {
  it('lists live rows and applies filters, search and checklist order', () => {
    const tree = tasksTree();
    expect(databaseRows(tree, 'db').map((row) => row.id)).toEqual(['r1', 'r2', 'r3']);
    expect(rowsForView(tree, db(tree), viewById(db(tree), 'mine')).map((row) => row.id)).toEqual(['r1']);
    expect(rowsForView(tree, db(tree), viewById(db(tree), 'all'), 'do').map((row) => row.id)).toEqual(['r2']);
    expect(rowsForView(tree, db(tree), viewById(db(tree), 'check')).map((row) => row.id)).toEqual(['r3', 'r2', 'r1']);
  });

  it('falls back to the first view for unknown ids', () => {
    expect(viewById(db(tasksTree()), 'nope')?.id).toBe('all');
  });

  it('groups board columns by status option', () => {
    const tree = tasksTree();
    const columns = boardColumns(db(tree), viewById(db(tree), 'board')!, databaseRows(tree, 'db'));
    expect(columns.map((column) => [column.option?.name, column.rows.map((row) => row.id)])).toEqual([
      ['Not started', ['r3']],
      ['In progress', ['r2']],
      ['Done', ['r1']],
    ]);
  });

  it('picks table columns from the view', () => {
    const database = db(tasksTree());
    expect(tableColumns(database, viewById(database, 'mine')).map((p) => p.id)).toEqual(['who']);
    expect(tableColumns(database, viewById(database, 'all')).map((p) => p.id)).toEqual(['status', 'who', 'tags']);
  });
});

describe('database edits', () => {
  it('toggles checklist rows between done and not started', () => {
    const tree = tasksTree();
    const done = applyPatch(tree, toggleRowDone(tree, db(tree), 'r3', NOW));
    expect(done.map.get('r3')?.props?.status).toBe('done');
    const reopened = applyPatch(done, toggleRowDone(done, db(done), 'r3', NOW));
    expect(reopened.map.get('r3')?.props?.status).toBe('todo');
    const fromProgress = applyPatch(tree, toggleRowDone(tree, db(tree), 'r2', NOW));
    expect(fromProgress.map.get('r2')?.props?.status).toBe('done');
  });

  it('sets a property without touching the others', () => {
    const tree = tasksTree();
    const next = applyPatch(tree, setRowProperty(tree, 'r2', 'who', ME, NOW));
    expect(next.map.get('r2')?.props).toEqual({ status: 'doing', tags: ['bug'], who: ME });
  });

  it('creates rows that match the view they were added from', () => {
    const tree = tasksTree();
    const result = createRow(tree, db(tree), NOW, { view: viewById(db(tree), 'mine') });
    const row = result.patch.put[0];
    expect(row).toMatchObject({ type: 'page', parentId: 'db', props: { status: 'todo', who: ME } });
    expect(result.open).toBe(row.id);
    const next = applyPatch(tree, result.patch);
    expect(databaseRows(next, 'db').at(-1)?.id).toBe(row.id);

    const inColumn = createRow(tree, db(tree), NOW, { props: { status: 'doing' } }).patch.put[0];
    expect(inColumn.props?.status).toBe('doing');
  });

  it('adds and removes views, keeping at least one', () => {
    const tree = tasksTree();
    const { patch, view } = addView(db(tree), 'board', NOW);
    expect(view).toMatchObject({ type: 'board', groupBy: 'status', name: 'Tablero' });
    const withView = applyPatch(tree, patch);
    expect(db(withView).views).toHaveLength(5);
    const without = applyPatch(withView, removeView(db(withView), view.id, NOW));
    expect(db(without).views).toHaveLength(4);

    const single = { ...db(tree), views: [db(tree).views![0]] };
    expect(removeView(single, 'all', NOW).put).toEqual([]);
  });

  it('changes a view filter and its table columns', () => {
    const tree = tasksTree();
    const cleared = applyPatch(tree, setViewFilter(db(tree), 'mine', null, NOW));
    expect(viewById(db(cleared), 'mine')?.filter).toBeUndefined();
    expect(rowsForView(cleared, db(cleared), viewById(db(cleared), 'mine'))).toHaveLength(3);

    const filtered = applyPatch(tree, setViewFilter(db(tree), 'all', { propertyId: 'who', value: ME }, NOW));
    expect(rowsForView(filtered, db(filtered), viewById(db(filtered), 'all')).map((row) => row.id)).toEqual(['r1']);

    const hidden = applyPatch(tree, toggleViewColumn(db(tree), 'all', 'who', NOW));
    expect(tableColumns(db(hidden), viewById(db(hidden), 'all')).map((p) => p.id)).toEqual(['status', 'tags']);
    const shown = applyPatch(hidden, toggleViewColumn(db(hidden), 'all', 'who', NOW));
    expect(tableColumns(db(shown), viewById(db(shown), 'all')).map((p) => p.id)).toEqual(['status', 'who', 'tags']);
  });

  it('formats dates like the reference app', () => {
    expect(formatDate('2025-02-03')).toBe('02/03/2025');
    expect(formatDate(null)).toBe('');
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('workspace structure', () => {
  it('lists teamspaces, their pages and breadcrumbs through databases', () => {
    const tree = tasksTree();
    expect(teamspaces(tree).map((team) => team.id)).toEqual(['team']);
    expect(subPages(tree, 'team').map((page) => page.id)).toEqual(['db']);
    expect(subPages(tree, 'db')).toEqual([]);
    expect(pageAncestors(tree, 'r1').map((block) => block.id)).toEqual(['team', 'db']);
  });

  it('draws callout children inside the callout box', () => {
    const tree = treeOf(
      n('p', 'page', 'P', [
        n('c', 'callout', 'Hola', [n('c1', 'text', 'dentro'), n('c2', 'bullet', 'punto')], { color: 'yellow' }),
        n('after', 'text', 'fuera'),
      ]),
    );
    expect(flattenPage(tree, 'p').map((row) => row.listLevel)).toEqual([0, 0, 0, 0]);
    expect(flattenPage(tree, 'p').map((row) => [row.block.id, row.container])).toEqual([
      ['c', { color: 'yellow', first: true, last: false }],
      ['c1', { color: 'yellow', first: false, last: false }],
      ['c2', { color: 'yellow', first: false, last: true }],
      ['after', undefined],
    ]);
  });

  it('closes a childless callout on its own row', () => {
    const tree = treeOf(n('p', 'page', 'P', [n('c', 'callout', 'Solo')]));
    expect(flattenPage(tree, 'p')[0].container).toEqual({ color: 'gray', first: true, last: true });
  });
});
