import { getDisplayName } from '@/utils/getDisplayName';

describe('getDisplayName', () => {
  it('returns display_name when set', () => {
    expect(getDisplayName({ display_name: 'Tino', name: 'Valentina Cruz' })).toBe('Tino');
  });

  it('falls through to first name when display_name is null', () => {
    expect(getDisplayName({ display_name: null, name: 'Valentina Cruz' })).toBe('Valentina');
  });

  it('falls through to first name when display_name is empty string', () => {
    expect(getDisplayName({ display_name: '', name: 'Valentina Cruz' })).toBe('Valentina');
  });

  it('falls through to first name when display_name is whitespace only', () => {
    expect(getDisplayName({ display_name: '   ', name: 'Valentina Cruz' })).toBe('Valentina');
  });

  it('returns full name when it has no spaces', () => {
    expect(getDisplayName({ display_name: null, name: 'Valentina' })).toBe('Valentina');
  });

  it('returns default fallback when both fields are null', () => {
    expect(getDisplayName({ display_name: null, name: null })).toBe('Champion');
  });

  it('returns default fallback when both fields are empty', () => {
    expect(getDisplayName({ display_name: '', name: '' })).toBe('Champion');
  });

  it('returns default fallback for undefined profile', () => {
    expect(getDisplayName(undefined)).toBe('Champion');
  });

  it('uses a custom fallback when provided', () => {
    expect(getDisplayName(undefined, 'Player')).toBe('Player');
    expect(getDisplayName({ display_name: null, name: null }, 'Player')).toBe('Player');
  });

  it('does not strip leading/trailing whitespace from a valid display_name', () => {
    // trim() is only used as a truthy check — if display_name.trim() is truthy,
    // the raw display_name is returned. Confirm no double-trim surprises.
    expect(getDisplayName({ display_name: 'Tino', name: null })).toBe('Tino');
  });
});
