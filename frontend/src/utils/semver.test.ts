import { describe, it, expect } from 'vitest';
import { parseSemver, compareSemver, isVersionLte, isVersionGt } from './semver';

describe('parseSemver', () => {
  it('parses standard semver versions', () => {
    expect(parseSemver('1.0.0')).toEqual([1, 0, 0]);
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
    expect(parseSemver('10.20.30')).toEqual([10, 20, 30]);
  });

  it('handles v prefix', () => {
    expect(parseSemver('v1.0.0')).toEqual([1, 0, 0]);
    expect(parseSemver('v1.2.3')).toEqual([1, 2, 3]);
  });

  it('strips prerelease suffixes', () => {
    expect(parseSemver('1.0.0-beta')).toEqual([1, 0, 0]);
    expect(parseSemver('1.2.3-beta.20260115.1')).toEqual([1, 2, 3]);
    expect(parseSemver('v2.0.0-alpha')).toEqual([2, 0, 0]);
    expect(parseSemver('1.0.0-rc.1')).toEqual([1, 0, 0]);
  });

  it('returns null for invalid versions', () => {
    expect(parseSemver('')).toBeNull();
    expect(parseSemver('invalid')).toBeNull();
    expect(parseSemver('1.0')).toBeNull();
    expect(parseSemver('1')).toBeNull();
    expect(parseSemver('a.b.c')).toBeNull();
  });
});

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('v1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('1.2.3', 'v1.2.3')).toBe(0);
  });

  it('returns -1 when first version is less', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
    expect(compareSemver('1.0.0', '1.1.0')).toBe(-1);
    expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
    expect(compareSemver('1.9.9', '2.0.0')).toBe(-1);
  });

  it('returns 1 when first version is greater', () => {
    expect(compareSemver('2.0.0', '1.0.0')).toBe(1);
    expect(compareSemver('1.1.0', '1.0.0')).toBe(1);
    expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
    expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
  });

  it('ignores prerelease suffixes when comparing base versions', () => {
    expect(compareSemver('1.0.0-beta', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.0', '1.0.0-beta')).toBe(0);
    expect(compareSemver('1.0.0-beta.1', '1.0.0-beta.2')).toBe(0);
  });

  it('returns 0 for invalid versions', () => {
    expect(compareSemver('invalid', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.0', 'invalid')).toBe(0);
    expect(compareSemver('invalid', 'also-invalid')).toBe(0);
  });
});

describe('isVersionLte', () => {
  it('returns true when first version is less than second', () => {
    expect(isVersionLte('1.0.0', '2.0.0')).toBe(true);
    expect(isVersionLte('1.0.0', '1.1.0')).toBe(true);
    expect(isVersionLte('1.0.0', '1.0.1')).toBe(true);
  });

  it('returns true when versions are equal', () => {
    expect(isVersionLte('1.0.0', '1.0.0')).toBe(true);
    expect(isVersionLte('1.0.0-beta', '1.0.0')).toBe(true);
  });

  it('returns false when first version is greater', () => {
    expect(isVersionLte('2.0.0', '1.0.0')).toBe(false);
    expect(isVersionLte('1.1.0', '1.0.0')).toBe(false);
    expect(isVersionLte('1.0.1', '1.0.0')).toBe(false);
  });
});

describe('isVersionGt', () => {
  it('returns true when first version is greater', () => {
    expect(isVersionGt('2.0.0', '1.0.0')).toBe(true);
    expect(isVersionGt('1.1.0', '1.0.0')).toBe(true);
    expect(isVersionGt('1.0.1', '1.0.0')).toBe(true);
  });

  it('returns false when versions are equal', () => {
    expect(isVersionGt('1.0.0', '1.0.0')).toBe(false);
    expect(isVersionGt('1.0.0-beta', '1.0.0')).toBe(false);
  });

  it('returns false when first version is less', () => {
    expect(isVersionGt('1.0.0', '2.0.0')).toBe(false);
    expect(isVersionGt('1.0.0', '1.1.0')).toBe(false);
    expect(isVersionGt('1.0.0', '1.0.1')).toBe(false);
  });
});
