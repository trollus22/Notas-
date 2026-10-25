import { preview } from '../twenty';

describe('preview', () => {
  it('toma la primera línea con texto y quita el markdown', () => {
    expect(preview('\n## Plan\n- [ ] comprar\n')).toBe('Plan');
    expect(preview('> cita')).toBe('cita');
    expect(preview('   ')).toBe('');
  });
});
