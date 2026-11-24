import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../src/locales/en.json';
import fr from '../src/locales/fr.json';
import { hasTranslation } from '../src/util/i18n';

const sourceDirs = ['model', 'schema'].map((dir) => join(__dirname, '../src', dir));

function flatKeys(node: object, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'object' ? flatKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

const usedKeys = [
  ...new Set(
    sourceDirs
      .flatMap((dir) => readdirSync(dir).filter((file) => file.endsWith('.ts')).map((file) => join(dir, file)))
      .flatMap((file) => readFileSync(file, 'utf8').match(/'validation\.[A-Za-z.]+'/g) ?? [])
      .map((key) => key.slice(1, -1)),
  ),
];

describe('locales', () => {
  it('has the same keys in English and French', () => {
    expect(flatKeys(fr).sort()).toEqual(flatKeys(en).sort());
  });

  it('has no unused validation messages', () => {
    const unused = flatKeys(en).filter((key) => key.startsWith('validation.') && key !== 'validation.common.invalidValue' && !usedKeys.includes(key));
    expect(unused).toEqual([]);
  });

  it.each(usedKeys)('translates %s in both languages', (key) => {
    expect(hasTranslation(key, 'en')).toBe(true);
    expect(hasTranslation(key, 'fr')).toBe(true);
  });
});
