import { soma } from './soma';

describe('soma', () => {
  it('soma números positivos', () => {
    expect(soma(2, 3)).toBe(5);
  });

  it('soma números negativos', () => {
    expect(soma(-2, -3)).toBe(-5);
    expect(soma(-2, 5)).toBe(3);
  });

  it('soma com zero', () => {
    expect(soma(0, 0)).toBe(0);
    expect(soma(7, 0)).toBe(7);
    expect(soma(0, -4)).toBe(-4);
  });
});
