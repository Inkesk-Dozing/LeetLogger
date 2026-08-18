import { SubmissionValidator } from '../core/validation/submissionValidator';
import { ISubmissionPayload } from '../core/types';

describe('SubmissionValidator', () => {
  const validPayload: ISubmissionPayload = {
    id: 'lc_1001',
    platform: 'leetcode',
    problemId: '1',
    title: 'Two Sum',
    titleSlug: 'two-sum',
    difficulty: 'Easy',
    topics: ['Array', 'Hash Table'],
    code: 'class Solution {};',
    language: 'cpp',
    extension: '.cpp',
    timestamp: 1684161120000,
  };

  test('should return valid true for complete payload', () => {
    const result = SubmissionValidator.validate(validPayload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should return invalid for null or non-object input', () => {
    expect(SubmissionValidator.validate(null).valid).toBe(false);
    expect(SubmissionValidator.validate('invalid').valid).toBe(false);
    expect(SubmissionValidator.validate(123).valid).toBe(false);
  });

  test('should fail when missing mandatory fields', () => {
    const incompletePayload = { ...validPayload, id: '', title: '' };
    const result = SubmissionValidator.validate(incompletePayload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  test('should fail on invalid platform or difficulty', () => {
    const invalidPlatformPayload = { ...validPayload, platform: 'invalid_platform' };
    const resultPlatform = SubmissionValidator.validate(invalidPlatformPayload);
    expect(resultPlatform.valid).toBe(false);
    expect(resultPlatform.errors[0]).toContain('platform');

    const invalidDiffPayload = { ...validPayload, difficulty: 'Extreme' };
    const resultDiff = SubmissionValidator.validate(invalidDiffPayload);
    expect(resultDiff.valid).toBe(false);
    expect(resultDiff.errors[0]).toContain('difficulty');
  });

  test('should validate extension formatting starting with dot', () => {
    const invalidExtPayload = { ...validPayload, extension: 'cpp' };
    const result = SubmissionValidator.validate(invalidExtPayload);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('extension must start with a dot');
  });

  test('should fail on invalid timestamp or non-array topics', () => {
    const invalidTimePayload = { ...validPayload, timestamp: -50 };
    expect(SubmissionValidator.validate(invalidTimePayload).valid).toBe(false);

    const invalidTopicsPayload = { ...validPayload, topics: 'Array' as any };
    expect(SubmissionValidator.validate(invalidTopicsPayload).valid).toBe(false);
  });
});
