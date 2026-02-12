import { describe, it, expect } from 'vitest';
import { checkCelebrationThreshold } from './savingsGoalsDb';

describe('checkCelebrationThreshold', () => {
  describe('celebration detection', () => {
    it('should detect crossing 50% threshold', () => {
      const result = checkCelebrationThreshold(40, 60, 100, [50]);
      expect(result).not.toBeNull();
      expect(result?.threshold).toBe(50);
      expect(result?.previousPercent).toBe(40);
      expect(result?.newPercent).toBe(60);
    });

    it('should detect crossing 100% threshold', () => {
      const result = checkCelebrationThreshold(90, 110, 100, [100]);
      expect(result).not.toBeNull();
      expect(result?.threshold).toBe(100);
      expect(result?.newPercent).toBe(100); // clamped to 100
    });

    it('should detect crossing multiple thresholds and pick the first', () => {
      const result = checkCelebrationThreshold(0, 150, 100, [25, 50, 100]);
      expect(result).not.toBeNull();
      expect(result?.threshold).toBe(25);
    });
  });

  describe('no celebration cases', () => {
    it('should not celebrate if threshold already crossed', () => {
      const result = checkCelebrationThreshold(60, 80, 100, [50]);
      expect(result).toBeNull();
    });

    it('should not celebrate if amount decreases', () => {
      const result = checkCelebrationThreshold(80, 40, 100, [50]);
      expect(result).toBeNull();
    });

    it('should not celebrate if no thresholds exist', () => {
      const result = checkCelebrationThreshold(0, 100, 100, []);
      expect(result).toBeNull();
    });

    it('should handle zero target amount', () => {
      const result = checkCelebrationThreshold(0, 100, 0, [100]);
      expect(result).toBeNull();
    });

    it('should not celebrate if amount stays below threshold', () => {
      const result = checkCelebrationThreshold(10, 40, 100, [50]);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should clamp newPercent to 100%', () => {
      const result = checkCelebrationThreshold(80, 250, 100, [100]);
      expect(result).not.toBeNull();
      expect(result?.newPercent).toBe(100);
    });

    it('should handle very small amounts', () => {
      const result = checkCelebrationThreshold(0, 0.01, 100, [0.01]);
      expect(result).not.toBeNull();
      expect(result?.threshold).toBe(0.01);
    });

    it('should handle negative spent amounts', () => {
      // Edge case: even if somehow negative, should calculate percentages
      const result = checkCelebrationThreshold(-10, 60, 100, [50]);
      expect(result).not.toBeNull();
      expect(result?.threshold).toBe(50);
    });

    it('should work with large thresholds array', () => {
      const thresholds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const result = checkCelebrationThreshold(0, 75, 100, thresholds);
      expect(result).not.toBeNull();
      expect(result?.threshold).toBe(10); // First crossed threshold
    });

    it('should respect threshold order (unsorted input)', () => {
      const result = checkCelebrationThreshold(0, 80, 100, [100, 50, 25]);
      expect(result).not.toBeNull();
      expect(result?.threshold).toBe(25); // Should sort and find first
    });
  });
});
