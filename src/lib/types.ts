/**
 * Everything in the workspace is a block. A page is a block whose children are
 * its content; a sub-page is a `page` block nested inside another page.
 *
 * Containers:
 * - `teamspace`: a top-level group of pages ("Espacios de equipo").
 * - `database`: a page whose child pages are its rows.
 * - `chat`: a conversation with the assistant; its children are `message`s.
 */
export type BlockType =
  | 'page'
  | 'database'
  | 'teamspace'
  | 'chat'
  | 'message'
  | 'text'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'todo'
  | 'bullet'
  | 'numbered'
  | 'toggle'
  | 'quote'
  | 'callout'
  | 'code'
  | 'divider';

export type BlockColor =
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red';

export type PropertyType = 'status' | 'select' | 'multiSelect' | 'person' | 'date' | 'text';

/** Status options belong to one of three groups, as in Notion. */
export type StatusGroup = 'todo' | 'inProgress' | 'complete';

export interface SelectOption {
  id: string;
  name: string;
  color: BlockColor;
  group?: StatusGroup;
}

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[];
}

/** Option id, option ids, ISO date (YYYY-MM-DD), person name or text. */
export type PropertyValue = string | string[] | null;

export type ViewType = 'table' | 'board' | 'checklist';

export interface DatabaseView {
  id: string;
  name: string;
  type: ViewType;
  /** Ionicons glyph shown next to the view name. */
  icon: string;
  /** Board views: the status or select property that makes the columns. */
  groupBy?: string;
  /** Rows where `propertyId` equals `value` (null = empty). */
  filter?: { propertyId: string; value: string | null };
  /** Table views: property ids shown as columns, in order. */
  columns?: string[];
}

export interface Block {
  id: string;
  type: BlockType;
  /** Parent block id, or null at the top level. */
  parentId: string | null;
  /** Fractional index key; siblings sort by it. */
  position: string;
  /** Title for pages, databases, teamspaces and chats; text for everything else. */
  text: string;
  checked?: boolean;
  /** Toggle blocks only: true when the toggle is closed. */
  collapsed?: boolean;
  /**
   * An emoji, or a built-in icon written as `ion:<glyph>:<color>` (for example
   * `ion:checkmark-circle:#448361`).
   */
  icon?: string | null;
  /** Cover id for pages (see constants/covers). */
  cover?: string | null;
  /** Subtitle under a page or database title. */
  description?: string;
  /** Text colour, or background colour for callouts. */
  color?: BlockColor;
  favorite?: boolean;
  /** Databases: their properties (the title is `text` of each row). */
  schema?: Property[];
  /** Databases: saved views. */
  views?: DatabaseView[];
  /** Database rows: property values keyed by property id. */
  props?: Record<string, PropertyValue>;
  /** Chat messages. */
  role?: 'user' | 'assistant' | 'notice';
  createdAt: number;
  updatedAt: number;
  viewedAt?: number | null;
  /** Set when a page is in the trash. Content blocks are deleted outright. */
  deletedAt?: number | null;
}

export type BlockMap = ReadonlyMap<string, Block>;

/** A set of changes to apply to the workspace. */
export interface Patch {
  put: Block[];
  remove: string[];
}

/** Where the caret should go after an edit. `title` is the page title input. */
export interface FocusTarget {
  id: string | 'title';
  offset: number;
}

export interface EditResult {
  patch: Patch;
  focus?: FocusTarget;
  /** A page the editor should open, such as a sub-page just created. */
  open?: string;
}

export const emptyPatch = (): Patch => ({ put: [], remove: [] });

/** Blocks you can open as a page. */
export const isPageLike = (type: BlockType): boolean => type === 'page' || type === 'database';

/** Blocks that do not hold editable text in the page body. */
export const isTextless = (type: BlockType): boolean =>
  type === 'page' || type === 'database' || type === 'divider';
