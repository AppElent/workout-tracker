import { describe, expect, it } from 'vitest';
import { calculateOneRepMax } from './oneRepMax';

describe('calculateOneRepMax', () => {
  it('returns weight directly when reps === 1 (actual 1RM)', () => {
    const result = calculateOneRepMax(140, 1);
    expect(result.value).toBe(140);
    expect(result.source).toBe('actual');
    expect(result.formula).toBeUndefined();
  });

  it('applies Epley formula for reps > 1', () => {
    // Epley: weight * (1 + reps / 30)
    // 100 * (1 + 10/30) = 100 * 1.333... = 133.3
    const result = calculateOneRepMax(100, 10);
    expect(result.value).toBe(133.3);
    expect(result.source).toBe('calculated');
    expect(result.formula).toBe('epley');
  });

  it('rounds to 1 decimal place', () => {
    // 90 * (1 + 8/30) = 90 * 1.2666... = 114.0
    const result = calculateOneRepMax(90, 8);
    expect(result.value).toBe(114);
  });

  it('handles reps = 5 correctly', () => {
    // 100 * (1 + 5/30) = 100 * 1.1666... = 116.7
    const result = calculateOneRepMax(100, 5);
    expect(result.value).toBe(116.7);
  });

  it('handles fractional weight', () => {
    // 102.5 * (1 + 3/30) = 102.5 * 1.1 = 112.75 → rounds to 112.8
    const result = calculateOneRepMax(102.5, 3);
    expect(result.value).toBe(112.8);
  });
});
