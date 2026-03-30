"use client";

import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import Image from "next/image";

const CARDS = ["0", "1", "2", "3", "5", "8", "13", "21", "?"] as const;

const PP_CLIENT_ID = "pp:clientId";
const PP_ROOM_CODE = "pp:roomCode";
const PP_LAST_NAME = "pp:lastDisplayName";

type RoomSnapshot = {
  roomCode: string;
  phase: string;
  round: 1 | 2 | 3;
  thinkSeconds: number;
  thinkRemainingSeconds: number | null;
  showThinkCountdown: boolean;
  revealTick: 3 | 2 | 1 | null;
  myVote: string | null;
  revealedVotes: Record<string, string> | null;
  summary: {
    outcome: string;
    message: string;
    average?: number;
    min?: number;
    max?: number;
    round3Remaining?: number[];
  } | null;
  participants: Array<{
    clientId: string;
    name: string;
    role: string;
    canVoteThisRound: boolean;
    hasVoted: boolean;
    connected: boolean;
  }>;
};

function makeUuid(): string {
  const c: Crypto | undefined = typeof crypto !== "undefined" ? crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    // RFC 4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
      .slice(6, 8)
      .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }
  // 最低保底：無 crypto 時仍需穩定字串（非密碼學安全）
  return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function clearRoomSession(): void {
  try {
    sessionStorage.removeItem(PP_ROOM_CODE);
    sessionStorage.removeItem(PP_LAST_NAME);
  } catch {
    /* ignore */
  }
}

function persistRoomSession(roomCode: string, displayName: string): void {
  try {
    sessionStorage.setItem(PP_ROOM_CODE, roomCode.trim().toUpperCase());
    sessionStorage.setItem(PP_LAST_NAME, displayName);
  } catch {
    /* ignore */
  }
}

function getWsOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_ORIGIN;
  if (typeof window === "undefined") return "http://localhost:3004";
  const proto = window.location.protocol === "https:" ? "https:" : "http:";
  const host = window.location.hostname;
  const derived = `${proto}//${host}:3004`;

  if (fromEnv && fromEnv.trim()) {
    const trimmed = fromEnv.trim();
    // 若前端不是從 localhost 開啟，卻配置成連 localhost（常見於 docker build-time 內嵌），
    // 會導致其他電腦連線時 WS 連到自己。此時以「同一 hostname」推導為準。
    if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
      try {
        const u = new URL(trimmed);
        const isLocal =
          u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";
        if (isLocal) return derived;
      } catch {
        // ignore parse errors and fall back to trimmed
      }
    }
    return trimmed;
  }

  return derived;
}

export default function Home() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [hostName, setHostName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [thinkSeconds, setThinkSeconds] = useState(30);
  const [state, setState] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let id = sessionStorage.getItem(PP_CLIENT_ID);
    if (!id) {
      id = makeUuid();
      sessionStorage.setItem(PP_CLIENT_ID, id);
    }
    setClientId(id);
    const savedName = sessionStorage.getItem(PP_LAST_NAME);
    if (savedName) {
      setHostName((n) => n || savedName);
      setJoinName((n) => n || savedName);
    }
    const savedCode = sessionStorage.getItem(PP_ROOM_CODE);
    if (savedCode) setJoinCode(savedCode);
  }, []);

  useEffect(() => {
    if (!clientId) return;
    const origin = getWsOrigin();
    const s = io(`${origin}/planning-poker`, {
      transports: ["websocket"],
    });
    setSocket(s);

    const tryResume = () => {
      let rc: string | null = null;
      try {
        rc = sessionStorage.getItem(PP_ROOM_CODE);
      } catch {
        rc = null;
      }
      if (!rc?.trim()) return;
      let name = "Participant";
      try {
        name = sessionStorage.getItem(PP_LAST_NAME) || "Participant";
      } catch {
        /* ignore */
      }
      s.emit(
        "pp:joinRoom",
        {
          clientId,
          roomCode: rc.trim().toUpperCase(),
          name,
        },
        (res: { ok?: boolean; error?: string }) => {
          if (res?.ok === false && res?.error) {
            clearRoomSession();
            setError(res.error);
            setState(null);
            setRoomCode("");
          }
        },
      );
    };

    s.on("connect", () => {
      tryResume();
    });
    s.on("pp:roomState", (payload: RoomSnapshot) => {
      setState(payload);
      setRoomCode(payload.roomCode);
      setError(null);
    });
    s.on("pp:error", (payload: { message?: string }) => {
      setError(payload.message ?? "錯誤");
    });
    s.on("pp:roomDissolved", () => {
      clearRoomSession();
      setState(null);
      setRoomCode("");
    });
    return () => {
      s.disconnect();
    };
  }, [clientId]);

  const clearError = useCallback(() => setError(null), []);

  const createRoom = () => {
    clearError();
    if (!socket || !clientId) return;
    const display = hostName.trim() || "Host";
    socket.emit(
      "pp:createRoom",
      { clientId, hostName: display, thinkSeconds },
      (res: { roomCode?: string; error?: string }) => {
        if (res?.error) setError(res.error);
        if (res?.roomCode) {
          setRoomCode(res.roomCode);
          persistRoomSession(res.roomCode, display);
        }
      },
    );
  };

  const joinRoom = () => {
    clearError();
    if (!socket?.connected || !clientId) {
      setError("尚未連線到伺服器，請稍候再試");
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("請輸入房間代碼");
      return;
    }
    const display = joinName.trim() || "Participant";
    socket.emit(
      "pp:joinRoom",
      { clientId, roomCode: code, name: display },
      (res: { ok?: boolean; error?: string }) => {
        if (res?.ok === true) {
          setError(null);
          persistRoomSession(code, display);
        }
        if (res?.ok === false && res?.error) setError(res.error);
      },
    );
  };

  const leaveRoom = () => {
    clearError();
    if (!socket || !roomCode) return;
    socket.emit(
      "pp:leaveRoom",
      { roomCode },
      (res: { ok?: boolean; error?: string }) => {
        if (res?.ok === false && res?.error) setError(res.error);
      },
    );
  };

  const dissolveRoom = () => {
    clearError();
    if (!socket || !roomCode) return;
    socket.emit(
      "pp:dissolveRoom",
      { roomCode },
      (res: { ok?: boolean; error?: string }) => {
        if (res?.ok === false && res?.error) setError(res.error);
      },
    );
  };

  const startVoting = () => {
    clearError();
    if (!socket || !roomCode) return;
    socket.emit("pp:hostStartVoting", { roomCode }, () => undefined);
  };

  const nextRound = () => {
    clearError();
    if (!socket || !roomCode) return;
    socket.emit("pp:hostNextRound", { roomCode }, () => undefined);
  };

  const nextItem = () => {
    clearError();
    if (!socket || !roomCode) return;
    socket.emit("pp:hostNextItem", { roomCode }, () => undefined);
  };

  const vote = (value: string) => {
    clearError();
    if (!socket || !roomCode) return;
    socket.emit("pp:vote", { roomCode, value }, () => undefined);
  };

  const me = state?.participants.find((p) => p.clientId === clientId);
  const isHost = me?.role === "host";

  if (!clientId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-[#0b1220] px-4 py-6 text-slate-100">
        <p className="text-center text-sm text-slate-300">初始化中…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 bg-[#0b1220] px-4 py-6 text-slate-100">
      <header className="space-y-2">
        <Image
          src="/weagile-logo.png"
          alt="WeAgile Logo"
          width={260}
          height={84}
          className="h-14 w-auto object-contain"
          priority
        />
        <h1 className="text-xl font-semibold tracking-tight text-[#4A90E2]">Planning Poker</h1>
        <p className="text-sm text-slate-300">相對估算工具</p>
      </header>

      {error && (
        <div
          className="rounded-lg border border-[#F27A3E]/60 bg-[#3a1f16] px-3 py-2 text-sm text-[#ffd8c4]"
          role="alert"
        >
          {error}
        </div>
      )}

      {!state && (
        <section className="space-y-4 rounded-xl border border-[#1b2a41] bg-[#101a2b]/90 p-4">
          <h2 className="text-sm font-medium text-[#8CCF3F]">建立房間</h2>
          <label className="block text-xs text-slate-300">
            Host 名稱
            <input
              className="mt-1 w-full rounded-md border border-[#223555] bg-[#0c1422] px-3 py-2 text-sm"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="你的名字"
            />
          </label>
          <label className="block text-xs text-slate-300">
            思考時間（秒，至少 5）
            <input
              type="number"
              min={5}
              className="mt-1 w-full rounded-md border border-[#223555] bg-[#0c1422] px-3 py-2 text-sm"
              value={thinkSeconds}
              onChange={(e) => setThinkSeconds(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            onClick={createRoom}
            disabled={!socket?.connected}
            className="w-full rounded-lg bg-[#4A90E2] py-2.5 text-sm font-medium text-white hover:bg-[#3e7ccc] disabled:opacity-50"
          >
            建立房間
          </button>

          <hr className="border-[#1b2a41]" />

          <h2 className="text-sm font-medium text-[#8CCF3F]">加入房間</h2>
          <label className="block text-xs text-slate-300">
            房間代碼
            <input
              className="mt-1 w-full rounded-md border border-[#223555] bg-[#0c1422] px-3 py-2 text-sm uppercase"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="例如 ABC123"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <label className="block text-xs text-slate-300">
            顯示名稱
            <input
              className="mt-1 w-full rounded-md border border-[#223555] bg-[#0c1422] px-3 py-2 text-sm"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="你的名字"
            />
          </label>
          <button
            type="button"
            onClick={joinRoom}
            disabled={!socket?.connected}
            className="w-full rounded-lg border border-[#4A90E2] py-2.5 text-sm font-medium text-[#d7e9ff] hover:bg-[#13243d] disabled:opacity-50"
          >
            加入
          </button>
        </section>
      )}

      {state && (
        <section className="space-y-4 rounded-xl border border-[#1b2a41] bg-[#101a2b]/90 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-300">房間</span>
            <code className="rounded bg-[#0c1422] px-2 py-1 text-sm font-mono tracking-wider">
              {state.roomCode}
            </code>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-[#13243d] px-3 py-1">Round {state.round}</span>
            <span className="rounded-full bg-[#13243d] px-3 py-1 capitalize">
              {state.phase.replaceAll("_", " ")}
            </span>
          </div>

          {isHost && (
            <button
              type="button"
              onClick={dissolveRoom}
              className="w-full rounded-lg border border-[#F27A3E]/70 bg-[#3a1f16] py-2 text-sm text-[#ffd8c4] hover:bg-[#4a261b]"
            >
              解散房間
            </button>
          )}
          {!isHost && (
            <button
              type="button"
              onClick={leaveRoom}
              className="w-full rounded-lg border border-[#4A90E2] py-2 text-sm text-[#d7e9ff] hover:bg-[#13243d]"
            >
              離開房間
            </button>
          )}

          {state.phase === "lobby" && isHost && (
            <button
              type="button"
              onClick={startVoting}
              className="w-full rounded-lg bg-[#8CCF3F] py-2.5 text-sm font-medium text-[#13200a] hover:bg-[#7ab535]"
            >
              開始 Round 1 投票
            </button>
          )}

          {state.phase === "voting" && (
            <div className="space-y-3">
              {state.showThinkCountdown && state.thinkRemainingSeconds !== null && (
                <p className="text-center text-3xl font-bold text-[#F27A3E]">
                  {state.thinkRemainingSeconds}
                </p>
              )}
              {!state.showThinkCountdown &&
                state.thinkRemainingSeconds !== null &&
                state.thinkRemainingSeconds > 5 && (
                  <p className="text-center text-sm text-slate-300">
                    思考剩餘 {state.thinkRemainingSeconds} 秒
                  </p>
                )}
              {me?.canVoteThisRound && (
                <div>
                  <p className="mb-2 text-xs text-slate-300">選擇卡片</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CARDS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => vote(c)}
                        className={`rounded-lg border py-3 text-lg font-semibold ${
                          state.myVote === c
                            ? "border-[#4A90E2] bg-[#163055] text-[#d7e9ff]"
                            : "border-[#223555] bg-[#0c1422] hover:border-[#4A90E2]"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  {state.myVote && (
                    <p className="mt-2 text-center text-xs text-slate-400">
                      已選：{state.myVote}（他人看不到你的選擇）
                    </p>
                  )}
                </div>
              )}
              {!me?.canVoteThisRound && (
                <p className="text-sm text-[#ffd8c4]">
                  本輪你無法投票（晚加入或本輪已鎖定），請等待下一輪。
                </p>
              )}
            </div>
          )}

          {state.phase === "reveal_countdown" && state.revealTick && (
            <p className="text-center text-4xl font-bold text-[#4A90E2]">
              亮牌 {state.revealTick}
            </p>
          )}

          {state.phase === "revealed" && (
            <div className="space-y-3">
              {state.revealedVotes && (
                <ul className="space-y-1 rounded-lg border border-[#223555] bg-[#0c1422] p-3 text-sm">
                  {Object.entries(state.revealedVotes).map(([n, v]) => (
                    <li key={n} className="flex justify-between">
                      <span className="text-slate-300">{n}</span>
                      <span className="font-mono font-medium">{v}</span>
                    </li>
                  ))}
                </ul>
              )}
              {state.summary && (
                <div className="rounded-lg border border-[#223555] bg-[#0f1929] px-3 py-2 text-sm">
                  <p className="font-medium">{state.summary.message}</p>
                  {state.summary.outcome === "failure_high_low" && (
                    <p className="mt-1 text-xs text-slate-300">
                      最低 {state.summary.min}／最高 {state.summary.max}
                    </p>
                  )}
                </div>
              )}
              {isHost && state.round < 3 && (
                <button
                  type="button"
                  onClick={nextRound}
                  className="w-full rounded-lg bg-[#4A90E2] py-2.5 text-sm font-medium text-white hover:bg-[#3e7ccc]"
                >
                  開始下一輪（Round {state.round + 1}）
                </button>
              )}
              {state.round >= 3 && (
                <p className="text-center text-xs text-slate-400">已完成三輪流程</p>
              )}
            </div>
          )}

          {state.phase === "item_complete" && (
            <div className="space-y-3">
              <p className="text-center text-xs text-[#ffd8c4]">本項已結束</p>
              {state.revealedVotes && (
                <ul className="space-y-1 rounded-lg border border-[#223555] bg-[#0c1422] p-3 text-sm">
                  {Object.entries(state.revealedVotes).map(([n, v]) => (
                    <li key={n} className="flex justify-between">
                      <span className="text-slate-300">{n}</span>
                      <span className="font-mono font-medium">{v}</span>
                    </li>
                  ))}
                </ul>
              )}
              {state.summary && (
                <div className="rounded-lg border border-[#223555] bg-[#0f1929] px-3 py-2 text-sm">
                  <p className="font-medium">{state.summary.message}</p>
                  {state.summary.outcome === "failure_high_low" && (
                    <p className="mt-1 text-xs text-slate-300">
                      最低 {state.summary.min}／最高 {state.summary.max}
                    </p>
                  )}
                </div>
              )}
              {isHost && (
                <button
                  type="button"
                  onClick={nextItem}
                  className="w-full rounded-lg bg-[#4A90E2] py-2.5 text-sm font-medium text-white hover:bg-[#3e7ccc]"
                >
                  開始下一次投分
                </button>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs text-slate-400">成員</p>
            <ul className="space-y-1 text-sm text-slate-300">
              {state.participants.map((p) => (
                <li key={p.clientId} className="flex justify-between gap-2">
                  <span>
                    {p.name}
                    {p.role === "host" ? "（Host）" : ""}
                    <span className="ml-1 text-xs text-slate-400">
                      {p.connected ? "線上" : "離線"}
                    </span>
                  </span>
                  <span className="text-slate-400">
                    {p.hasVoted ? "已投" : "未投"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
