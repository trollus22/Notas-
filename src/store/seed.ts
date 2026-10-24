import { generateNKeysBetween } from 'fractional-indexing';

import { ME } from '@/lib/database';
import { newBlock } from '@/lib/editing';
import type { Block, BlockType, Patch, Property } from '@/lib/types';

export const WORKSPACE_NAME = 'Mi espacio';

interface SeedNode extends Partial<Omit<Block, 'type'>> {
  type: BlockType;
  children?: SeedNode[];
}

const TASK_SCHEMA: Property[] = [
  {
    id: 'status',
    name: 'Status',
    type: 'status',
    options: [
      { id: 'not-started', name: 'Not started', color: 'gray', group: 'todo' },
      { id: 'in-progress', name: 'In progress', color: 'blue', group: 'inProgress' },
      { id: 'done', name: 'Done', color: 'green', group: 'complete' },
    ],
  },
  { id: 'assignee', name: 'Assignee', type: 'person' },
  { id: 'due', name: 'Due date', type: 'date' },
  {
    id: 'priority',
    name: 'Priority',
    type: 'select',
    options: [
      { id: 'low', name: 'Low', color: 'green' },
      { id: 'medium', name: 'Medium', color: 'yellow' },
      { id: 'high', name: 'High', color: 'red' },
    ],
  },
  {
    id: 'type',
    name: 'Task type',
    type: 'multiSelect',
    options: [
      { id: 'bug', name: '🐞 Bug', color: 'red' },
      { id: 'feature', name: '💬 Feature request', color: 'green' },
      { id: 'polish', name: '💅 Polish', color: 'pink' },
    ],
  },
  { id: 'description', name: 'Description', type: 'text' },
];

const ALL_COLUMNS = ['status', 'assignee', 'due', 'priority', 'type', 'description'];

const WORKSPACE: SeedNode[] = [
  {
    type: 'teamspace',
    text: `Sede de ${WORKSPACE_NAME}`,
    icon: 'ion:home:#91918E',
    children: [
      {
        type: 'database',
        text: 'Tasks Tracker',
        icon: 'ion:checkmark-circle:#448361',
        description: 'Stay organized with tasks, your way.',
        schema: TASK_SCHEMA,
        views: [
          { id: 'all', name: 'All Tasks', type: 'table', icon: 'star', columns: ALL_COLUMNS },
          { id: 'by-status', name: 'By Status', type: 'board', icon: 'arrow-forward-circle', groupBy: 'status' },
          {
            id: 'mine',
            name: 'My Tasks',
            type: 'table',
            icon: 'person',
            filter: { propertyId: 'assignee', value: ME },
            columns: ['assignee', 'status', 'due'],
          },
          { id: 'checklist', name: 'Checklist', type: 'checklist', icon: 'list' },
        ],
        children: [
          {
            type: 'page',
            text: 'Improve website copy',
            icon: '📄',
            props: {
              status: 'done',
              due: '2025-02-03',
              priority: 'high',
              type: ['polish'],
              description: 'Change header text to better reflect our value proposition',
            },
          },
          {
            type: 'page',
            text: 'Update help center & FAQ',
            icon: '📕',
            props: {
              status: 'in-progress',
              due: '2025-02-20',
              priority: 'medium',
              type: ['feature'],
              description: 'Update support documentation with the latest features',
            },
          },
          {
            type: 'page',
            text: 'Publish release notes',
            icon: '🗒️',
            props: {
              status: 'not-started',
              due: '2025-02-28',
              priority: 'low',
              type: ['feature'],
              description: 'Include product updates in the monthly newsletter',
            },
          },
        ],
      },
      {
        type: 'page',
        text: 'Teamspace Home',
        icon: 'ion:compass:#91918E',
        children: [
          {
            type: 'text',
            color: 'gray',
            text: 'Give your colleagues a place to learn about your team, and what you’re working on. Use the + buttons in your left-hand sidebar to add more pages, like process docs or a project roadmap.',
          },
          { type: 'text' },
          {
            type: 'callout',
            icon: '👋',
            color: 'yellow',
            text: 'Welcome to the team! Our mission is to...',
            children: [
              { type: 'text' },
              { type: 'text', text: 'Questions? Here’s how to reach us:' },
              { type: 'bullet', text: 'Slack channel:' },
              { type: 'bullet', text: 'Email:' },
              { type: 'bullet', text: 'Team manager:' },
            ],
          },
          { type: 'h2', text: 'About the team' },
          { type: 'divider' },
          { type: 'text', color: 'gray', text: 'Type the @ key to tag a teammate' },
          { type: 'h2', text: 'Resources' },
          { type: 'divider' },
          { type: 'text', color: 'gray', text: 'Type the / key to add custom blocks' },
        ],
      },
    ],
  },
];

/** The workspace the app starts with, the same as a new Notion teamspace. */
export function seedPatch(now: number): Patch {
  const put: Block[] = [];
  const build = (nodes: SeedNode[], parentId: string | null) => {
    const keys = generateNKeysBetween(null, null, nodes.length);
    nodes.forEach((node, index) => {
      const { children, type, ...fields } = node;
      const block = newBlock(
        {
          ...fields,
          type,
          parentId,
          position: keys[index],
          text: fields.text ?? '',
          ...(type === 'todo' ? { checked: fields.checked ?? false } : {}),
        },
        now - index * 60_000,
      );
      put.push(block);
      if (children) build(children, block.id);
    });
  };
  build(WORKSPACE, null);
  return { put, remove: [] };
}
