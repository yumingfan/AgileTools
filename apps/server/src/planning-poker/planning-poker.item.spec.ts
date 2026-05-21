import { PlanningPokerService } from './planning-poker.service';

function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

describe('planning-poker item-complete flow', () => {
  let svc: PlanningPokerService;

  beforeEach(() => {
    svc = new PlanningPokerService();
    svc.setOnRoomChange(() => {
      // no-op: tests only care about room phase/summary
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('6.1 早停：Round 1 取得 success_avg 後項目完結且不得再進入 Round 2', async () => {
    const hostId = 'host-1';
    const p1Id = 'p1-1';
    const code = svc.createRoom(hostId, 'Host', hostId, 5);

    svc.joinRoom(p1Id, code, 'P1', p1Id);
    svc.hostStartVoting(hostId, code);

    // success_avg: Round1 numeric votes all in the same triplet {0,1,2}
    svc.vote(hostId, code, '0');
    svc.vote(p1Id, code, '2');

    await flushMicrotasks(); // queueMicrotask kickoffRevealCountdown
    let room = svc.getRoom(code) as any;
    jest.advanceTimersByTime(3000); // 3..2..1 + finishReveal
    room = svc.getRoom(code) as any;
    expect(room.phase).toBe('item_complete');
    expect(room.summary?.outcome).toBe('success_avg');
    expect(room.summary?.average).toBe(1);
    expect(room.summary?.calculationFormula).toContain('Fibonacci');
    expect(room.summary?.calculationFormula).toContain('= 1');

    const nextRoundRes = svc.hostNextRound(hostId, code);
    expect(nextRoundRes.ok).toBe(false);

    const nextItemRes = svc.hostNextItem(hostId, code);
    expect(nextItemRes.ok).toBe(true);

    room = svc.getRoom(code) as any;
    expect(room.phase).toBe('lobby');
    expect(room.round).toBe(1);
    expect(room.summary).toBeNull();
  });

  it('6.2 三輪皆無 success_avg：最後在 Round 3 完成後項目完結', async () => {
    const hostId = 'host-2';
    const p1Id = 'p1-2';
    const code = svc.createRoom(hostId, 'Host', hostId, 5);
    svc.joinRoom(p1Id, code, 'P1', p1Id);

    // Round 1 failure_high_low (not a single triplet)
    svc.hostStartVoting(hostId, code);
    svc.vote(hostId, code, '0');
    svc.vote(p1Id, code, '3');
    await flushMicrotasks();
    jest.advanceTimersByTime(3000);

    let room = svc.getRoom(code) as any;
    expect(room.phase).toBe('revealed');
    expect(room.summary?.outcome).toBe('failure_high_low');
    expect(room.round).toBe(1);

    // Round 2 failure again
    const r2 = svc.hostNextRound(hostId, code);
    expect(r2.ok).toBe(true);
    svc.vote(hostId, code, '0');
    svc.vote(p1Id, code, '3');
    await flushMicrotasks();
    jest.advanceTimersByTime(3000);

    room = svc.getRoom(code) as any;
    expect(room.phase).toBe('revealed');
    expect(room.summary?.outcome).toBe('failure_high_low');
    expect(room.round).toBe(2);

    // Round 3 -> item complete after reveal (cannot_estimate if removing min/max leaves empty)
    const r3 = svc.hostNextRound(hostId, code);
    expect(r3.ok).toBe(true);
    svc.vote(hostId, code, '0');
    svc.vote(p1Id, code, '3');
    await flushMicrotasks();
    jest.advanceTimersByTime(3000);

    room = svc.getRoom(code) as any;
    expect(room.phase).toBe('item_complete');
    expect(room.summary?.outcome).toBe('round3_cannot_estimate');

    // no more next rounds, but next item allowed
    const nextRoundRes = svc.hostNextRound(hostId, code);
    expect(nextRoundRes.ok).toBe(false);
    const nextItemRes = svc.hostNextItem(hostId, code);
    expect(nextItemRes.ok).toBe(true);
  });

  it('6.5 ? 不算得分：Round 1 含 ? 不得早停，仍可走到下一輪並在 Round 3 完結', async () => {
    const hostId = 'host-3';
    const p1Id = 'p1-3';
    const code = svc.createRoom(hostId, 'Host', hostId, 5);
    svc.joinRoom(p1Id, code, 'P1', p1Id);

    // Round 1 with '?': cannot_estimate => not success_avg => should remain revealed
    svc.hostStartVoting(hostId, code);
    svc.vote(hostId, code, '?');
    svc.vote(p1Id, code, '0');
    await flushMicrotasks();
    jest.advanceTimersByTime(3000);

    let room = svc.getRoom(code) as any;
    expect(room.phase).toBe('revealed');
    expect(room.summary?.outcome).toBe('cannot_estimate');
    expect(room.round).toBe(1);

    // proceed to Round 2
    const r2 = svc.hostNextRound(hostId, code);
    expect(r2.ok).toBe(true);
    svc.vote(hostId, code, '0');
    svc.vote(p1Id, code, '3'); // failure
    await flushMicrotasks();
    jest.advanceTimersByTime(3000);

    room = svc.getRoom(code) as any;
    expect(room.phase).toBe('revealed');
    expect(room.round).toBe(2);

    // proceed to Round 3 with '?' again
    const r3 = svc.hostNextRound(hostId, code);
    expect(r3.ok).toBe(true);
    svc.vote(hostId, code, '?');
    svc.vote(p1Id, code, '?');
    await flushMicrotasks();
    jest.advanceTimersByTime(3000);

    room = svc.getRoom(code) as any;
    expect(room.phase).toBe('item_complete');
    expect(room.summary?.outcome).toBe('round3_cannot_estimate');

    // reset by host
    const nextItemRes = svc.hostNextItem(hostId, code);
    expect(nextItemRes.ok).toBe(true);
    room = svc.getRoom(code) as any;
    expect(room.phase).toBe('lobby');
    expect(room.summary).toBeNull();
  });

  it('Round 3 收斂時 summary 含 calculationFormula 與二位小數平均', async () => {
    const hostId = 'host-r3';
    const p1Id = 'p1-r3';
    const p2Id = 'p2-r3';
    const code = svc.createRoom(hostId, 'Host', hostId, 5);
    svc.joinRoom(p1Id, code, 'P1', p1Id);
    svc.joinRoom(p2Id, code, 'P2', p2Id);

    svc.hostStartVoting(hostId, code);
    svc.vote(hostId, code, '0');
    svc.vote(p1Id, code, '3');
    svc.vote(p2Id, code, '5');
    await flushMicrotasks();
    jest.advanceTimersByTime(3000);

    svc.hostNextRound(hostId, code);
    svc.vote(hostId, code, '0');
    svc.vote(p1Id, code, '3');
    svc.vote(p2Id, code, '5');
    await flushMicrotasks();
    jest.advanceTimersByTime(3000);

    svc.hostNextRound(hostId, code);
    svc.vote(hostId, code, '1');
    svc.vote(p1Id, code, '3');
    svc.vote(p2Id, code, '8');
    await flushMicrotasks();
    jest.advanceTimersByTime(3000);

    const room = svc.getRoom(code) as any;
    expect(room.phase).toBe('item_complete');
    expect(room.summary?.outcome).toBe('round3_converged');
    expect(room.summary?.average).toBe(3);
    expect(room.summary?.calculationFormula).toContain('移除');
    expect(room.summary?.calculationFormula).toContain('= 3');
  });
});

