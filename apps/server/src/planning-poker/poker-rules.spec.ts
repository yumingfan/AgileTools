import {
  allNumericInSameTriplet,
  buildRound3ConvergedFormula,
  buildSuccessAverageFormula,
  evaluateRound12,
  evaluateRound3,
  formatAverageInt,
  isAllowedCard,
  parseVote,
  roundAverageInt,
} from './poker-rules';

describe('poker-rules', () => {
  it('parseVote', () => {
    expect(parseVote('5')).toBe(5);
    expect(parseVote('?')).toBe('?');
    expect(parseVote('99')).toBeNull();
  });

  it('isAllowedCard', () => {
    expect(isAllowedCard('13')).toBe(true);
    expect(isAllowedCard('4')).toBe(false);
  });

  it('allNumericInSameTriplet', () => {
    expect(allNumericInSameTriplet([2, 3, 3])).toBe(true);
    expect(allNumericInSameTriplet([3, 5, 8])).toBe(true);
    expect(allNumericInSameTriplet([2, 8])).toBe(false);
  });

  it('evaluateRound12 success / failure / ?', () => {
    expect(evaluateRound12(['3', '3', '5'])).toEqual({
      kind: 'success',
      average: (3 + 3 + 5) / 3,
    });
    expect(evaluateRound12(['2', '8'])).toMatchObject({ kind: 'failure', min: 2, max: 8 });
    expect(evaluateRound12(['5', '?'])).toEqual({ kind: 'cannot_estimate' });
  });

  it('evaluateRound3 convergence', () => {
    expect(evaluateRound3(['3', '5', '8', '8', '1'])).toMatchObject({
      kind: 'converged',
      average: 4,
      remaining: [3, 5],
    });
    expect(evaluateRound3(['5', '5', '5'])).toEqual({ kind: 'cannot_estimate' });
    expect(evaluateRound3(['5', '?'])).toEqual({ kind: 'cannot_estimate' });
  });

  it('roundAverageInt and formatAverageInt', () => {
    expect(roundAverageInt(2 / 3)).toBe(1);
    expect(formatAverageInt(2 / 3)).toBe('1');
  });

  it('buildSuccessAverageFormula', () => {
    const built = buildSuccessAverageFormula([3, 3, 5]);
    expect(built.average).toBe(4);
    expect(built.formula).toContain('Fibonacci');
    expect(built.formula).toContain('3 + 3 + 5');
    expect(built.formula).toContain('= 4');
  });

  it('buildRound3ConvergedFormula', () => {
    const built = buildRound3ConvergedFormula(['3', '5', '8', '8', '1']);
    expect(built).not.toBeNull();
    expect(built!.average).toBe(4);
    expect(built!.formula).toContain('移除');
    expect(built!.formula).toContain('3 + 5');
    expect(built!.formula).toContain('= 4');
  });
});
