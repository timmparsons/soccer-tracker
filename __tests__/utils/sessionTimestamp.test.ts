import { sessionTimestamp } from '@/utils/sessionTimestamp';
import { getLocalDate } from '@/utils/getLocalDate';

describe('sessionTimestamp', () => {
  it('keeps created_at when logged on the session date', () => {
    const createdAt = new Date().toISOString();
    expect(sessionTimestamp(getLocalDate(), createdAt)).toBe(createdAt);
  });

  it('uses local midnight of the session date when backdated', () => {
    const createdAt = new Date().toISOString();
    const twoDaysAgo = getLocalDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
    const result = new Date(sessionTimestamp(twoDaysAgo, createdAt));
    expect(getLocalDate(result)).toBe(twoDaysAgo);
    expect(result.getHours()).toBe(0);
  });
});
