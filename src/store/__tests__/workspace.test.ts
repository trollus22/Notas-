import { createPage, splitBlock } from '@/lib/editing';
import { databaseRows, rowsForView, viewById } from '@/lib/database';
import { flattenPage, privatePages, subPages, teamspaces, type Tree } from '@/lib/tree';

import { MemoryPersistence } from '../memory-persistence';
import { seedPatch } from '../seed';
import { Workspace } from '../workspace';

const pageNamed = (tree: Tree, title: string) => {
  const page = [...tree.map.values()].find((block) => block.text === title);
  if (!page) throw new Error(`No page ${title}`);
  return page;
};

describe('Workspace', () => {
  it('notifies listeners and saves changes in a batch', async () => {
    const storage = new MemoryPersistence();
    const workspace = await Workspace.open(storage, 10_000);
    const listener = jest.fn();
    workspace.subscribe(listener);

    workspace.apply(createPage(workspace.getTree(), null, 1).patch);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(storage.rows.size).toBe(0);

    await workspace.flush();
    expect(storage.rows.size).toBe(1);
  });

  it('marks the page as edited when its content changes', async () => {
    const workspace = await Workspace.open(new MemoryPersistence(), 10_000);
    workspace.apply(seedPatch(1), 1);
    const page = pageNamed(workspace.getTree(), 'Teamspace Home');
    const firstBlock = flattenPage(workspace.getTree(), page.id)[0].block;

    workspace.apply(splitBlock(workspace.getTree(), firstBlock.id, 3, 500).patch, 500);
    expect(workspace.getTree().map.get(page.id)?.updatedAt).toBe(500);
    await workspace.flush();
  });

  it('reloads what it saved, including removals', async () => {
    const storage = new MemoryPersistence();
    const first = await Workspace.open(storage, 10_000);
    first.apply(seedPatch(1), 1);
    const page = pageNamed(first.getTree(), 'Teamspace Home');
    const block = flattenPage(first.getTree(), page.id)[0].block;
    first.apply({ put: [], remove: [block.id] });
    await first.flush();

    const second = await Workspace.open(storage);
    expect(second.getTree().map.size).toBe(first.getTree().map.size);
    expect(second.getTree().map.has(block.id)).toBe(false);
  });

  it('keeps changes queued when saving fails and retries them', async () => {
    const storage = new MemoryPersistence();
    const save = jest.spyOn(storage, 'save').mockRejectedValueOnce(new Error('disco lleno'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const workspace = await Workspace.open(storage, 10_000);

    workspace.apply(createPage(workspace.getTree(), null, 1).patch);
    await workspace.flush();
    expect(storage.rows.size).toBe(0);

    await workspace.flush();
    expect(save).toHaveBeenCalledTimes(2);
    expect(storage.rows.size).toBe(1);
    warn.mockRestore();
  });

  it('seeds the teamspace shown in the reference app', async () => {
    const workspace = await Workspace.open(new MemoryPersistence(), 10_000);
    workspace.apply(seedPatch(1_000_000));
    const tree = workspace.getTree();

    expect(privatePages(tree)).toEqual([]);
    const [teamspace] = teamspaces(tree);
    expect(teamspace.text).toBe('Sede de Mi espacio');
    expect(subPages(tree, teamspace.id).map((page) => page.text)).toEqual(['Tasks Tracker', 'Teamspace Home']);

    const tasks = pageNamed(tree, 'Tasks Tracker');
    expect(tasks.views?.map((view) => view.name)).toEqual(['All Tasks', 'By Status', 'My Tasks', 'Checklist']);
    expect(databaseRows(tree, tasks.id).map((row) => row.text)).toEqual([
      'Improve website copy',
      'Update help center & FAQ',
      'Publish release notes',
    ]);
    expect(rowsForView(tree, tasks, viewById(tasks, 'checklist')).map((row) => row.text)).toEqual([
      'Publish release notes',
      'Update help center & FAQ',
      'Improve website copy',
    ]);
    expect(rowsForView(tree, tasks, viewById(tasks, 'mine'))).toEqual([]);
    await workspace.flush();
  });
});
