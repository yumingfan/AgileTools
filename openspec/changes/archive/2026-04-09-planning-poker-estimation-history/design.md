## Overview

在前端監聽 `pp:roomState`，當房間狀態「剛進入」`phase = item_complete` 時，將該次估算結果追加到本機歷史清單，並在房內 UI 顯示歷史。

## Data Model (client-side)

建議以 `roomCode` 作為分區，存到 localStorage：

- Key: `pp:history:<ROOM_CODE>`
- Value: JSON array of `EstimationHistoryItem`

`EstimationHistoryItem` 建議欄位：

- `id`: string（去重/索引用途；可用 signature 或 uuid）
- `roomCode`: string
- `itemIndex`: number（同 room 的流水號，1..N）
- `completedAt`: string（ISO timestamp，前端時間）
- `roundsUsed`: 1 | 2 | 3（完結時 round）
- `summary`: `RoomSnapshot["summary"]`（包含 outcome/message/average/min/max/round3Remaining）
- `revealedVotes`: `RoomSnapshot["revealedVotes"]`（每人投票明細）
- `participants`: Array<{ clientId: string; name: string; role: string }>（可選，便於回看當時在場成員）

## Capture Rules (when to append)

- 僅在收到 `roomState` 時，偵測到：
  - `prev.phase !== "item_complete"` 且 `next.phase === "item_complete"`
  - 且 `next.summary != null`
  - 且 `next.revealedVotes != null`
- 需做 **去重**：避免重連／重送造成重複追加
  - 建議 signature：`roomCode + ":" + next.round + ":" + JSON.stringify(next.revealedVotes) + ":" + (next.summary?.outcome ?? "") + ":" + (next.summary?.average ?? "")`
  - 若最新一筆 `history[history.length - 1].id` 與本次 signature 相同，則不新增

## UI Design

- 在房內介面新增區塊：`估算歷史`
  - 預設可收合（不干擾當前投票）
  - 顯示筆數與清除按鈕（清除僅清除本機）
- 清單列資訊：
  - `#itemIndex`
  - `completedAt`（相對時間或短格式）
  - 結果摘要：`summary.message`
  - `roundsUsed`（例如：R1 / R2 / R3）
- 單筆展開：
  - 投票明細（與目前 revealed 畫面一致的列表）
  - 若 outcome 為 failure_high_low 顯示 min/max
  - 若 outcome 有 average 顯示 average

## Constraints

- 不改後端事件協定與計算邏輯：歷史資料完全由前端從 `roomState` 推導
- 不新增項目名稱輸入：以 `itemIndex` 流水號表示

