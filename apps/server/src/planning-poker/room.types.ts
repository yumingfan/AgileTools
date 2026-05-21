import type { CardString } from './poker-rules';

export type RoomPhase =
  | 'lobby'
  | 'voting'
  | 'reveal_countdown'
  | 'revealed'
  | 'between_rounds'
  | 'item_complete';

export type ParticipantRole = 'host' | 'participant';

export interface Participant {
  clientId: string;
  /** 目前 Socket 連線；斷線時為 null */
  socketId: string | null;
  name: string;
  role: ParticipantRole;
  /** 本輪是否可投票（晚加入：所有人已投完、尚未亮牌前加入 → 本輪不可投） */
  canVoteThisRound: boolean;
}

export interface RoomSnapshot {
  roomCode: string;
  phase: RoomPhase;
  round: 1 | 2 | 3;
  thinkSeconds: number;
  thinkRemainingSeconds: number | null;
  showThinkCountdown: boolean;
  revealTick: 3 | 2 | 1 | null;
  /** 投票階段：僅本人可見已選卡面 */
  myVote: CardString | null;
  /** 揭示完成後：每人卡面 */
  revealedVotes: Record<string, CardString> | null;
  summary: RoomSummaryPayload | null;
  participants: Array<{
    /** 穩定客戶端身分，等同 `clientId` */
    clientId: string;
    name: string;
    role: ParticipantRole;
    canVoteThisRound: boolean;
    hasVoted: boolean;
    connected: boolean;
  }>;
}

export interface RoomSummaryPayload {
  outcome:
    | 'success_avg'
    | 'failure_high_low'
    | 'cannot_estimate'
    | 'round3_converged'
    | 'round3_cannot_estimate';
  message: string;
  average?: number;
  /** 成功平均或 Round 3 收斂時的計算公式（多行文字） */
  calculationFormula?: string;
  min?: number;
  max?: number;
  round3Remaining?: number[];
}
