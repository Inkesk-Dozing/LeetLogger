import { ISubmissionPayload, Difficulty, SupportedPlatform } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class SubmissionValidator {
  private static VALID_PLATFORMS: SupportedPlatform[] = ['leetcode', 'gfg', 'hackerrank'];
  private static VALID_DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Basic', 'School'];

  /**
   * Validates if an unknown object satisfies the ISubmissionPayload structure.
   */
  public static validate(payload: unknown): ValidationResult {
    const errors: string[] = [];

    if (!payload || typeof payload !== 'object') {
      return { valid: false, errors: ['Payload must be a non-null object'] };
    }

    const p = payload as Record<string, any>;

    if (!p.id || typeof p.id !== 'string' || p.id.trim() === '') {
      errors.push('Missing or invalid field: id must be a non-empty string');
    }

    if (!p.platform || !this.VALID_PLATFORMS.includes(p.platform)) {
      errors.push(`Missing or invalid field: platform must be one of [${this.VALID_PLATFORMS.join(', ')}]`);
    }

    if (!p.title || typeof p.title !== 'string' || p.title.trim() === '') {
      errors.push('Missing or invalid field: title must be a non-empty string');
    }

    if (!p.titleSlug || typeof p.titleSlug !== 'string' || p.titleSlug.trim() === '') {
      errors.push('Missing or invalid field: titleSlug must be a non-empty string');
    }

    if (!p.difficulty || !this.VALID_DIFFICULTIES.includes(p.difficulty)) {
      errors.push(`Missing or invalid field: difficulty must be one of [${this.VALID_DIFFICULTIES.join(', ')}]`);
    }

    if (typeof p.code !== 'string') {
      errors.push('Missing or invalid field: code must be a string');
    }

    if (!p.language || typeof p.language !== 'string' || p.language.trim() === '') {
      errors.push('Missing or invalid field: language must be a non-empty string');
    }

    if (!p.extension || typeof p.extension !== 'string' || p.extension.trim() === '') {
      errors.push('Missing or invalid field: extension must be a non-empty string starting with a dot');
    } else if (!p.extension.startsWith('.')) {
      errors.push('Invalid extension format: extension must start with a dot "." (e.g. ".cpp")');
    }

    if (typeof p.timestamp !== 'number' || isNaN(p.timestamp) || p.timestamp <= 0) {
      errors.push('Missing or invalid field: timestamp must be a positive number');
    }

    if (!Array.isArray(p.topics)) {
      errors.push('Missing or invalid field: topics must be an array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
