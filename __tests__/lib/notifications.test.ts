import { getReminderMessage } from '@/lib/notifications';

describe('getReminderMessage', () => {
  it('returns a 2-day message with a casual tone', () => {
    const { title, body } = getReminderMessage(2);
    expect(title).toBe('Coach Vinnie here! 👟');
    expect(body).toContain('Two days');
  });

  it('returns a 3-day message expressing disappointment', () => {
    const { title, body } = getReminderMessage(3);
    expect(title).toBe('Coach Vinnie calling... ⚽');
    expect(body).toContain('3 days');
  });

  it('returns a 4-day message with urgency', () => {
    const { title, body } = getReminderMessage(4);
    expect(body).toContain('4 days');
  });

  it('returns a 5-day message', () => {
    const { title, body } = getReminderMessage(5);
    expect(body).toContain('5 days');
  });

  it('returns a generic day-count message for days beyond 5', () => {
    const { title, body } = getReminderMessage(6);
    expect(title).toContain('Day 6');
    expect(body).toContain('6 days');
  });

  it('generic message includes the correct day count', () => {
    const { title, body } = getReminderMessage(8);
    expect(title).toContain('Day 8');
    expect(body).toContain('8 days');
  });

  it('every message has a non-empty title and body', () => {
    for (let day = 2; day <= 9; day++) {
      const { title, body } = getReminderMessage(day);
      expect(title.length).toBeGreaterThan(0);
      expect(body.length).toBeGreaterThan(0);
    }
  });
});
