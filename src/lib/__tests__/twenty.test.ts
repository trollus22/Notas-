import { buildWorkspace, type TwentyData } from '../twenty-import';

const data: TwentyData = {
  workspaceName: 'PACER LABS',
  members: [{ id: 'm1', name: { firstName: 'Mario', lastName: 'Martín' } }],
  objects: [
    {
      nameSingular: 'task',
      namePlural: 'tasks',
      labelPlural: 'Tareas',
      labelIdentifierFieldMetadataId: 'f-title',
      fields: [
        { id: 'f-title', name: 'title', label: 'Título', type: 'TEXT' },
        { id: 'f-status', name: 'status', label: 'Estado', type: 'SELECT', options: [
          { value: 'TODO', label: 'Por hacer', color: 'sky', position: 0 },
          { value: 'IN_PROGRESS', label: 'En curso', color: 'purple', position: 1 },
          { value: 'DONE', label: 'Hecho', color: 'green', position: 2 },
        ] },
        { id: 'f-due', name: 'dueAt', label: 'Vence', type: 'DATE_TIME' },
        { id: 'f-asg', name: 'assignee', label: 'Asignado', type: 'RELATION' },
        { id: 'f-body', name: 'bodyV2', label: 'Cuerpo', type: 'RICH_TEXT_V2' },
        { id: 'f-sys', name: 'position', label: 'Posición', type: 'POSITION', isSystem: true },
      ],
    },
  ],
  records: {
    tasks: [
      {
        id: 'r1', title: 'Rellenar formulario', status: 'DONE', dueAt: '2026-10-30T10:00:00.000Z', assigneeId: 'm1',
        createdAt: '2026-10-24T07:58:33.447Z', updatedAt: '2026-10-24T17:43:02.151Z',
        bodyV2: { blocknote: JSON.stringify([
          { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Pasos' }], children: [] },
          { type: 'checkListItem', props: { checked: true }, content: [{ type: 'text', text: 'Enviar' }], children: [] },
          { type: 'paragraph', content: [{ type: 'link', content: [{ type: 'text', text: 'web' }] }], children: [] },
          { type: 'paragraph', content: [], children: [] },
        ]) },
      },
    ],
  },
};

describe('buildWorkspace', () => {
  const { put } = buildWorkspace(data, 1);
  const byId = new Map(put.map((b) => [b.id, b]));

  it('monta el espacio, la base de datos y la fila', () => {
    expect(byId.get('tw-team')).toMatchObject({ type: 'teamspace', text: 'PACER LABS', parentId: null });
    const db = byId.get('tw-tasks')!;
    expect(db).toMatchObject({ type: 'database', text: 'Tareas', parentId: 'tw-team' });
    expect(db.schema!.map((p) => [p.id, p.type])).toEqual([['status', 'status'], ['dueAt', 'date'], ['assignee', 'person']]);
    expect(db.views!.map((v) => v.type)).toEqual(['table', 'board']);
    expect(db.schema![0].options!.map((o) => o.group)).toEqual(['todo', 'inProgress', 'complete']);
  });

  it('pasa los valores del registro a propiedades', () => {
    expect(byId.get('tw-r1')).toMatchObject({
      type: 'page', parentId: 'tw-tasks', text: 'Rellenar formulario',
      props: { status: 'DONE', dueAt: '2026-10-30', assignee: 'Mario Martín' },
    });
  });

  it('convierte el cuerpo de BlockNote en bloques y salta los párrafos vacíos', () => {
    const body = put.filter((b) => b.parentId === 'tw-r1');
    expect(body.map((b) => [b.type, b.text, b.checked])).toEqual([
      ['h2', 'Pasos', undefined],
      ['todo', 'Enviar', true],
      ['text', 'web', undefined],
    ]);
  });
});
