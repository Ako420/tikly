import { describe, expect, it } from 'vitest';
import { detectFileType } from '../src/util/fileType';
import { JPEG, PDF, PNG, TEXT, WEBP } from './fixtures/files';

describe('detectFileType', () => {
  it.each([
    ['image/png', PNG],
    ['image/jpeg', JPEG],
    ['image/webp', WEBP],
    ['application/pdf', PDF],
  ])('recognises %s from its first bytes', (type, buffer) => {
    expect(detectFileType(buffer)).toBe(type);
  });

  it('returns null for anything else', () => {
    expect(detectFileType(TEXT)).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });
});
