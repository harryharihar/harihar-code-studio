import {
  describeDue,
  dueOptionFromIso,
  dueOptionToIso,
  isDueToday,
} from '../src/shared/lib/dates';

const now = new Date(2026, 10, 21, 10, 30); // Sat 21 Nov 2026, 10:30 local

describe('due dates', () => {
  it('quick picks become the end of that local day', () => {
    expect(dueOptionToIso('none', now)).toBeNull();
    const today = new Date(dueOptionToIso('today', now)!);
    expect([today.getDate(), today.getHours(), today.getMinutes()]).toEqual([
      21, 23, 59,
    ]);
    expect(new Date(dueOptionToIso('tomorrow', now)!).getDate()).toBe(22);
    expect(new Date(dueOptionToIso('nextWeek', now)!).getDate()).toBe(28);
  });

  it('round-trips quick picks', () => {
    for (const option of ['none', 'today', 'tomorrow', 'nextWeek'] as const) {
      expect(dueOptionFromIso(dueOptionToIso(option, now), now)).toBe(option);
    }
    expect(
      dueOptionFromIso(new Date(2026, 11, 25).toISOString(), now),
    ).toBeNull();
  });

  it('describes due dates for the task list', () => {
    expect(describeDue(null, now)).toBeNull();
    expect(describeDue(dueOptionToIso('today', now), now)).toEqual({
      label: 'Today',
      tone: 'today',
    });
    expect(describeDue(dueOptionToIso('tomorrow', now), now)?.label).toBe(
      'Tomorrow',
    );
    expect(describeDue(new Date(2026, 10, 19).toISOString(), now)).toEqual({
      label: 'Overdue · 19 Nov',
      tone: 'overdue',
    });
    expect(describeDue(dueOptionToIso('nextWeek', now), now)?.label).toBe(
      '28 Nov',
    );
  });

  it('counts overdue tasks as due today', () => {
    expect(isDueToday(new Date(2026, 10, 19).toISOString(), now)).toBe(true);
    expect(isDueToday(dueOptionToIso('tomorrow', now), now)).toBe(false);
    expect(isDueToday(null, now)).toBe(false);
  });
});
