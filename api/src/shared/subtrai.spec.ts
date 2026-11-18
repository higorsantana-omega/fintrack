import { subtrai } from './subtrai';

describe('subtrai', () => {
  it('subtrai números positivos', () => {
    expect(subtrai(5, 3)).toBe(2);
    expect(subtrai(3, 5)).toBe(-2);
  });

  it('subtrai números negativos', () => {
    expect(subtrai(-2, -3)).toBe(1);
    expect(subtrai(-2, 5)).toBe(-7);
  });

  it('subtrai com zero', () => {
    expect(subtrai(0, 0)).toBe(0);
    expect(subtrai(7, 0)).toBe(7);
    expect(subtrai(0, -4)).toBe(4);
  });
});
