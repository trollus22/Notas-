import { isExpanded, toggleExpanded } from '../sidebar-state';

describe('sidebar state', () => {
  it('uses the fallback until toggled, then flips', () => {
    expect(isExpanded('row-a', false)).toBe(false);
    expect(isExpanded('section-a', true)).toBe(true);
    toggleExpanded('row-a', false);
    toggleExpanded('section-a', true);
    expect(isExpanded('row-a', false)).toBe(true);
    expect(isExpanded('section-a', true)).toBe(false);
    toggleExpanded('row-a', false);
    expect(isExpanded('row-a', false)).toBe(false);
  });
});
