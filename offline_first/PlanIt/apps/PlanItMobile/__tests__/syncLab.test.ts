import { runScenario, type ScenarioId } from '../src/dev/syncLab';

const last = (scenario: ScenarioId, mode: 'junior' | 'senior') => {
  const outcome = runScenario(scenario, mode);
  return { outcome, final: outcome.steps[outcome.steps.length - 1].state };
};

describe('Sync Lab — junior model shows the bugs', () => {
  it('ID clash: one task disappears from every phone', () => {
    const { outcome, final } = last('idClash', 'junior');
    const titles = [...final.phoneA, ...final.server, ...final.phoneB].map(c => c.title);

    expect(outcome.verdictTone).toBe('bad');
    expect(titles).not.toContain('Bijli bill pay karna');
  });

  it('Delete offline: the deleted task comes back on phone A', () => {
    const { outcome, final } = last('deleteOffline', 'junior');

    expect(outcome.verdictTone).toBe('bad');
    expect(final.phoneA.map(c => c.title)).toContain('Gas cylinder book karna');
  });

  it('Bad data: the garbage date is saved', () => {
    const { outcome, final } = last('badData', 'junior');

    expect(outcome.verdictTone).toBe('bad');
    expect(final.phoneA[0].note).toBe('Due: Invalid Date');
  });
});

describe('Sync Lab — senior model fixes them', () => {
  it('ID clash: both tasks survive on both phones', () => {
    const { outcome, final } = last('idClash', 'senior');

    expect(outcome.verdictTone).toBe('good');
    for (const lane of [final.phoneA, final.server, final.phoneB]) {
      expect(lane.map(c => c.title).sort()).toEqual(['Bijli bill pay karna', 'Doodh lana']);
    }
  });

  it('Delete offline: the tombstone reaches every phone', () => {
    const { outcome, final } = last('deleteOffline', 'senior');

    expect(outcome.verdictTone).toBe('good');
    for (const lane of [final.phoneA, final.server, final.phoneB]) {
      expect(lane).toHaveLength(1);
      expect(lane[0].tone).toBe('deleted');
    }
  });

  it('Bad data: Zod rejects both fields and nothing is saved', () => {
    const { outcome, final } = last('badData', 'senior');
    const logs = outcome.steps.map(s => s.log).join('\n');

    expect(outcome.verdictTone).toBe('good');
    expect(logs).toContain('title: Title is required');
    expect(logs).toContain('dueAt: Invalid ISO datetime');
    expect(final.phoneA).toHaveLength(0);
  });
});
