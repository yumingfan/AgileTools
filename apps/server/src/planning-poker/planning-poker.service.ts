import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  buildRound3ConvergedFormula,
  buildSuccessAverageFormula,
  evaluateRound12,
  evaluateRound3,
  formatAverageInt,
  isAllowedCard,
  parseVote,
  roundAverageInt,
  type CardString,
} from './poker-rules';
import type { Participant, RoomPhase, RoomSnapshot, RoomSummaryPayload } from './room.types';

interface InternalRoom {
  code: string;
  hostClientId: string;
  phase: RoomPhase;
  round: 1 | 2 | 3;
  thinkSeconds: number;
  thinkRemaining: number | null;
  revealTick: 3 | 2 | 1 | null;
  participants: Map<string, Participant>;
  votes: Map<string, string>;
  awaitingRevealKickoff: boolean;
  thinkInterval: ReturnType<typeof setInterval> | null;
  revealTimeouts: Array<ReturnType<typeof setTimeout>>;
  summary: RoomSummaryPayload | null;
  revealedVotes: Record<string, CardString> | null;
}

@Injectable()
export class PlanningPokerService {
  private readonly rooms = new Map<string, InternalRoom>();
  /** socketId → 房間與穩定 clientId */
  private readonly socketBindings = new Map<string, { roomCode: string; clientId: string }>();
  private onRoomChange?: (code: string) => void;

  setOnRoomChange(cb: (code: string) => void): void {
    this.onRoomChange = cb;
  }

  private touch(room: InternalRoom): void {
    this.onRoomChange?.(room.code);
  }

  private genRoomCode(): string {
    return randomBytes(4).toString('base64url').slice(0, 6).toUpperCase();
  }

  private bindSocket(socketId: string, roomCode: string, clientId: string): void {
    this.socketBindings.set(socketId, {
      roomCode: roomCode.toUpperCase(),
      clientId,
    });
  }

  private unbindSocket(socketId: string): void {
    this.socketBindings.delete(socketId);
  }

  /** 換新 socket 時解除舊連線綁定 */
  private rebindParticipantSocket(room: InternalRoom, clientId: string, newSocketId: string): void {
    const p = room.participants.get(clientId);
    if (!p) return;
    if (p.socketId && p.socketId !== newSocketId) {
      this.unbindSocket(p.socketId);
    }
    p.socketId = newSocketId;
    this.bindSocket(newSocketId, room.code, clientId);
  }

  resolveClientInRoom(
    socketId: string,
    rawRoomCode: string,
  ): { clientId: string } | { error: string } {
    const norm = rawRoomCode.trim().toUpperCase();
    const b = this.socketBindings.get(socketId);
    if (!b || b.roomCode !== norm) return { error: '未加入此房間或連線已失效' };
    return { clientId: b.clientId };
  }

  /**
   * 斷線：僅解除 socket 與參與者關聯，不刪成員、不刪房。
   * @returns 若房間仍在則回傳 room code 以便廣播
   */
  handleSocketDisconnect(socketId: string): string | undefined {
    const b = this.socketBindings.get(socketId);
    if (!b) return undefined;
    const room = this.getRoom(b.roomCode);
    this.unbindSocket(socketId);
    if (!room) return undefined;
    const p = room.participants.get(b.clientId);
    if (p) p.socketId = null;
    this.touch(room);
    return room.code;
  }

  createRoom(
    hostClientId: string,
    hostName: string,
    hostSocketId: string,
    thinkSeconds?: number,
  ): string {
    const sec = Math.max(5, thinkSeconds ?? 60);
    let code = this.genRoomCode();
    while (this.rooms.has(code)) code = this.genRoomCode();

    const trimmedHost = hostName.trim() || 'Host';
    const room: InternalRoom = {
      code,
      hostClientId,
      phase: 'lobby',
      round: 1,
      thinkSeconds: sec,
      thinkRemaining: null,
      revealTick: null,
      participants: new Map([
        [
          hostClientId,
          {
            clientId: hostClientId,
            socketId: hostSocketId,
            name: trimmedHost,
            role: 'host',
            canVoteThisRound: true,
          },
        ],
      ]),
      votes: new Map(),
      awaitingRevealKickoff: false,
      thinkInterval: null,
      revealTimeouts: [],
      summary: null,
      revealedVotes: null,
    };
    this.rooms.set(code, room);
    this.bindSocket(hostSocketId, code, hostClientId);
    this.touch(room);
    return code;
  }

  getRoom(code: string): InternalRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  joinRoom(
    socketId: string,
    rawCode: string,
    name: string,
    clientId: string,
  ): { ok: true } | { ok: false; reason: string } {
    const code = rawCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return { ok: false, reason: '找不到房間' };

    const trimmed = name.trim() || 'Participant';
    const lateJoinNoVote =
      room.awaitingRevealKickoff ||
      room.phase === 'reveal_countdown' ||
      room.phase === 'revealed' ||
      room.phase === 'item_complete';

    const existing = room.participants.get(clientId);
    if (existing) {
      if (trimmed) existing.name = trimmed;
      this.rebindParticipantSocket(room, clientId, socketId);
      this.touch(room);
      return { ok: true };
    }

    room.participants.set(clientId, {
      clientId,
      socketId,
      name: trimmed,
      role: 'participant',
      canVoteThisRound: room.phase === 'voting' && !lateJoinNoVote,
    });
    this.bindSocket(socketId, code, clientId);
    this.touch(room);
    return { ok: true };
  }

  leaveRoom(
    socketId: string,
    rawRoomCode: string,
  ): { ok: true } | { ok: false; reason: string } {
    const r = this.resolveClientInRoom(socketId, rawRoomCode);
    if ('error' in r) return { ok: false, reason: r.error };
    const code = rawRoomCode.trim().toUpperCase();
    const room = this.getRoom(code);
    if (!room) return { ok: false, reason: '找不到房間' };
    if (r.clientId === room.hostClientId) {
      return { ok: false, reason: 'Host 請使用「解散房間」，無法僅離開' };
    }
    room.participants.delete(r.clientId);
    room.votes.delete(r.clientId);
    this.unbindSocket(socketId);
    this.touch(room);
    return { ok: true };
  }

  dissolveRoom(
    socketId: string,
    rawRoomCode: string,
  ): { ok: true; notifiedSocketIds: string[] } | { ok: false; reason: string } {
    const r = this.resolveClientInRoom(socketId, rawRoomCode);
    if ('error' in r) return { ok: false, reason: r.error };
    const code = rawRoomCode.trim().toUpperCase();
    const room = this.getRoom(code);
    if (!room) return { ok: false, reason: '找不到房間' };
    if (r.clientId !== room.hostClientId) {
      return { ok: false, reason: '僅 Host 可解散房間' };
    }

    const notifiedSocketIds = [...room.participants.values()]
      .map((p) => p.socketId)
      .filter((s): s is string => s != null);

    for (const sid of notifiedSocketIds) {
      this.unbindSocket(sid);
    }
    this.disposeRoomTimers(room);
    this.rooms.delete(room.code);
    return { ok: true, notifiedSocketIds };
  }

  hostStartVoting(clientId: string, code: string): { ok: true } | { ok: false; reason: string } {
    const room = this.getRoom(code);
    if (!room) return { ok: false, reason: '找不到房間' };
    if (room.hostClientId !== clientId) return { ok: false, reason: '僅 Host 可開始投票' };
    if (room.phase !== 'lobby') return { ok: false, reason: '僅能在等待室開始首輪投票' };

    room.round = 1;
    this.enterVoting(room);
    return { ok: true };
  }

  hostNextRound(clientId: string, code: string): { ok: true } | { ok: false; reason: string } {
    const room = this.getRoom(code);
    if (!room) return { ok: false, reason: '找不到房間' };
    if (room.hostClientId !== clientId) return { ok: false, reason: '僅 Host 可推進輪次' };
    if (room.phase !== 'revealed') return { ok: false, reason: '請先完成本輪揭示' };
    if (room.round >= 3) return { ok: false, reason: '已完成 Round 3' };

    room.round = (room.round + 1) as 1 | 2 | 3;
    this.enterVoting(room);
    return { ok: true };
  }

  hostNextItem(clientId: string, code: string): { ok: true } | { ok: false; reason: string } {
    const room = this.getRoom(code);
    if (!room) return { ok: false, reason: '找不到房間' };
    if (room.hostClientId !== clientId) return { ok: false, reason: '僅 Host 可開始下一次投分' };
    if (room.phase !== 'item_complete') return { ok: false, reason: '目前無可開始下一次投分' };

    this.disposeRoomTimers(room);
    room.phase = 'lobby';
    room.round = 1;
    room.thinkRemaining = null;
    room.revealTick = null;
    room.awaitingRevealKickoff = false;
    room.votes.clear();
    room.summary = null;
    room.revealedVotes = null;
    for (const p of room.participants.values()) {
      p.canVoteThisRound = false;
    }

    this.touch(room);
    return { ok: true };
  }

  private enterVoting(room: InternalRoom): void {
    this.disposeRoomTimers(room);
    room.phase = 'voting';
    room.votes.clear();
    room.summary = null;
    room.revealedVotes = null;
    room.revealTick = null;
    room.awaitingRevealKickoff = false;
    for (const p of room.participants.values()) {
      p.canVoteThisRound = true;
    }
    room.thinkRemaining = room.thinkSeconds;
    this.startThinkTimer(room);
    this.touch(room);
  }

  vote(
    clientId: string,
    code: string,
    value: string,
  ): { ok: true } | { ok: false; reason: string } {
    const room = this.getRoom(code);
    if (!room) return { ok: false, reason: '找不到房間' };
    if (room.phase !== 'voting') return { ok: false, reason: '目前非投票階段' };

    const p = room.participants.get(clientId);
    if (!p?.canVoteThisRound) return { ok: false, reason: '本輪無法投票（晚加入規則）' };
    if (!isAllowedCard(value)) return { ok: false, reason: '不合法的投票值' };

    room.votes.set(clientId, value);

    const connectedEligible = this.connectedRoundVoterClientIds(room);
    const allIn =
      connectedEligible.length > 0 && connectedEligible.every((id) => room.votes.has(id));
    if (allIn) {
      room.awaitingRevealKickoff = true;
      this.touch(room);
      queueMicrotask(() => this.kickoffRevealCountdown(room));
    } else {
      this.touch(room);
    }

    return { ok: true };
  }

  /** 本輪應投票者（含暫時離線者，用於揭示計算） */
  private roundVoterClientIds(room: InternalRoom): string[] {
    return [...room.participants.entries()]
      .filter(([, p]) => p.canVoteThisRound)
      .map(([cid]) => cid);
  }

  /** 本輪應投票且目前連線中者（用於「是否全體已投」） */
  private connectedRoundVoterClientIds(room: InternalRoom): string[] {
    return this.roundVoterClientIds(room).filter((cid) => {
      const p = room.participants.get(cid);
      return p?.socketId != null;
    });
  }

  private startThinkTimer(room: InternalRoom): void {
    if (room.thinkInterval) clearInterval(room.thinkInterval);
    room.thinkInterval = setInterval(() => {
      if (room.phase !== 'voting' || room.thinkRemaining === null) return;

      const connectedEligible = this.connectedRoundVoterClientIds(room);
      if (
        connectedEligible.length > 0 &&
        connectedEligible.every((id) => room.votes.has(id))
      ) {
        return;
      }

      room.thinkRemaining -= 1;
      if (room.thinkRemaining <= 0) {
        room.thinkRemaining = 0;
        clearInterval(room.thinkInterval!);
        room.thinkInterval = null;
      }
      this.touch(room);
    }, 1000);
  }

  private kickoffRevealCountdown(room: InternalRoom): void {
    if (room.phase !== 'voting') return;
    const connectedEligible = this.connectedRoundVoterClientIds(room);
    const allIn =
      connectedEligible.length > 0 &&
      connectedEligible.every((id) => room.votes.has(id));
    if (!allIn) {
      room.awaitingRevealKickoff = false;
      this.touch(room);
      return;
    }

    if (room.thinkInterval) {
      clearInterval(room.thinkInterval);
      room.thinkInterval = null;
    }
    room.thinkRemaining = null;
    room.awaitingRevealKickoff = false;
    room.phase = 'reveal_countdown';

    const runTick = (n: 3 | 2 | 1) => {
      room.revealTick = n;
      this.touch(room);
      const t = setTimeout(() => {
        if (n === 3) runTick(2);
        else if (n === 2) runTick(1);
        else this.finishReveal(room);
      }, 1000);
      room.revealTimeouts.push(t);
    };
    runTick(3);
  }

  private finishReveal(room: InternalRoom): void {
    room.revealTick = null;

    const eligible = this.roundVoterClientIds(room);
    const voteList = eligible.map((id) => room.votes.get(id) ?? '?');

    const names: Record<string, CardString> = {};
    for (const id of eligible) {
      const raw = room.votes.get(id) ?? '?';
      if (!isAllowedCard(raw)) continue;
      const part = room.participants.get(id);
      names[part?.name ?? id] = raw as CardString;
    }
    room.revealedVotes = names;

    const round = room.round;
    const summary = this.computeSummary(round, voteList);
    room.summary = summary;

    if (round < 3 && summary.outcome === 'success_avg') {
      room.phase = 'item_complete';
    } else if (round === 3) {
      room.phase = 'item_complete';
    } else {
      room.phase = 'revealed';
    }

    this.touch(room);
  }

  private computeSummary(round: 1 | 2 | 3, votes: string[]): RoomSummaryPayload {
    if (round === 3) {
      const r3 = evaluateRound3(votes);
      if (r3.kind === 'cannot_estimate') {
        return { outcome: 'round3_cannot_estimate', message: '無法估算' };
      }
      const built = buildRound3ConvergedFormula(votes);
      const avg = built?.average ?? roundAverageInt(r3.average);
      return {
        outcome: 'round3_converged',
        message: `Round 3 收斂後平均：${formatAverageInt(avg)}`,
        average: avg,
        calculationFormula: built?.formula,
        round3Remaining: r3.remaining,
      };
    }

    const r12 = evaluateRound12(votes);
    if (r12.kind === 'cannot_estimate') {
      return { outcome: 'cannot_estimate', message: '無法估算（含 ?）' };
    }
    if (r12.kind === 'success') {
      const nums = votes
        .map(parseVote)
        .filter((v): v is number => v !== '?' && v !== null);
      const built = buildSuccessAverageFormula(nums);
      return {
        outcome: 'success_avg',
        message: `成功，平均：${formatAverageInt(built.average)}`,
        average: built.average,
        calculationFormula: built.formula,
      };
    }
    return {
      outcome: 'failure_high_low',
      message: '請線下討論最高／最低估值',
      min: r12.min,
      max: r12.max,
    };
  }

  private disposeRoomTimers(room: InternalRoom): void {
    if (room.thinkInterval) {
      clearInterval(room.thinkInterval);
      room.thinkInterval = null;
    }
    for (const t of room.revealTimeouts) clearTimeout(t);
    room.revealTimeouts = [];
  }

  snapshotFor(room: InternalRoom, viewerClientId: string): RoomSnapshot {
    const participants = [...room.participants.values()].map((p) => ({
      clientId: p.clientId,
      name: p.name,
      role: p.role,
      canVoteThisRound: p.canVoteThisRound,
      hasVoted: room.votes.has(p.clientId),
      connected: p.socketId != null,
    }));

    const showThink =
      room.phase === 'voting' &&
      room.thinkRemaining !== null &&
      room.thinkRemaining > 0 &&
      room.thinkRemaining <= 5;

    const rawMine = room.votes.get(viewerClientId);
    const myVote =
      room.phase === 'voting' && rawMine && isAllowedCard(rawMine)
        ? (rawMine as CardString)
        : null;

    const revealed =
      room.phase === 'revealed' || room.phase === 'item_complete'
        ? room.revealedVotes
        : null;

    return {
      roomCode: room.code,
      phase: room.phase,
      round: room.round,
      thinkSeconds: room.thinkSeconds,
      thinkRemainingSeconds: room.thinkRemaining,
      showThinkCountdown: showThink,
      revealTick: room.revealTick,
      myVote,
      revealedVotes: revealed,
      summary: room.summary,
      participants,
    };
  }
}
