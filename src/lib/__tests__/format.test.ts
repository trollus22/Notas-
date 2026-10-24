import { pageTitle, relativeTime, shortAge, textChange } from '../format';

describe('format', () => {
  const now = new Date(2026, 9, 24, 18, 0).getTime();

  it('describes how long ago something happened', () => {
    expect(relativeTime(now - 10_000, now)).toBe('Ahora');
    expect(relativeTime(now - 5 * 60_000, now)).toBe('Hace 5 min');
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe('Hace 3 h');
    expect(relativeTime(new Date(2026, 9, 23, 9, 0).getTime(), now)).toBe('Ayer');
    expect(relativeTime(new Date(2026, 9, 20, 9, 0).getTime(), now)).toBe('Hace 4 días');
    expect(relativeTime(new Date(2026, 2, 3).getTime(), now)).toBe('3 mar');
    expect(relativeTime(new Date(2025, 2, 3).getTime(), now)).toBe('3 mar 2025');
  });

  it('gives a compact age', () => {
    expect(shortAge(now - 30_000, now)).toBe('ahora');
    expect(shortAge(now - 5 * 60_000, now)).toBe('5 min');
    expect(shortAge(now - 3 * 3_600_000, now)).toBe('3 h');
    expect(shortAge(now - 26 * 3_600_000, now)).toBe('1 d');
    expect(shortAge(now - 15 * 86_400_000, now)).toBe('2 sem');
  });

  it('names untitled pages', () => {
    expect(pageTitle({ text: '  ' })).toBe('Sin título');
    expect(pageTitle({ text: 'Hola' })).toBe('Hola');
  });

  it('finds what was typed or deleted', () => {
    expect(textChange('hola', 'hola\n')).toEqual({ start: 4, inserted: '\n', removed: 0 });
    expect(textChange('hola', 'ho\nla')).toEqual({ start: 2, inserted: '\n', removed: 0 });
    expect(textChange('aa', 'aaa')).toEqual({ start: 2, inserted: 'a', removed: 0 });
    expect(textChange('hola', 'hla')).toEqual({ start: 1, inserted: '', removed: 1 });
    expect(textChange('hola mundo', 'hola /mundo')).toEqual({ start: 5, inserted: '/', removed: 0 });
    expect(textChange('abc', 'aXYc')).toEqual({ start: 1, inserted: 'XY', removed: 1 });
  });
});
