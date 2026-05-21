## Context

Planning Poker 後端已在 `poker-rules.ts` 實作三連續 Fibonacci 判定、Round 3 收斂與算術平均；`computeSummary` 僅回傳簡短 `message` 與 `average` 數值。前端在 `revealed`／`item_complete` 與本機估算歷史顯示摘要，但無計算過程。

## Goals / Non-Goals

**Goals**

- `success_avg` 與 `round3_converged` 時提供 **`calculationFormula`**（多行、人類可讀）。
- 平均與公式內結果 **小數第二位**（`Math.round(n*100)/100`，顯示用 `toFixed(2)`）。
- 公式由 **後端單一產生**（`buildSuccessAverageFormula` / `buildRound3ConvergedFormula`），避免前端重複規則。
- 估算歷史透過既有 `summary` 物件寫入，**自動包含** `calculationFormula`。

**Non-Goals**

- 失敗（`failure_high_low`）或無法估算路徑的公式。
- 在 UI 輸入理由或辯論內容。
- 後端持久化歷史（仍為前端 localStorage）。

## Decisions

### 公式內容（後端產生）

**Round 1/2 成功**

```
判定：全部落在 Fibonacci 區間 {a, b, c}
平均 = (v1 + v2 + …) ÷ n = XX.XX
```

使用 `findMatchingTriplet` 回傳實際命中區間；票值順序與 `votes` 陣列一致（不強制排序）。

**Round 3 收斂**

```
移除所有最低票（min）與最高票（max）
剩餘：r1, r2, …
平均 = (r1 + r2 + …) ÷ m = XX.XX
```

與規格一致：移除**所有**等於全域 min／max 的票。

### 契約擴充

`RoomSummaryPayload` 新增可選欄位 `calculationFormula?: string`。`message` 內的平均數字亦改為二位小數，與 `average` 欄位一致。

### 前端呈現

抽出 `SummaryResultBlock`：顯示 `message`、失敗時 min/max、有 `calculationFormula` 時以 `pre` + `whitespace-pre-wrap` + monospace 顯示。歷史區塊重用同一元件。

### 二位小數

`roundAverage2` 用於儲存之 `average`；`formatDecimal2` 用於字串展示。

## Risks / Trade-offs

- [浮點誤差] → 先 `roundAverage2` 再格式化，避免 `3.333333` 顯示。
- [舊歷史無 formula] → 舊 localStorage 紀錄仍可读，僅無公式區塊（可接受）。
- [公式語言] → 先固定繁體中文，與現有 UI 一致。

## Open Questions

（無；使用者已確認：兩種成功路徑都要、小數二位、歷史要存公式。）
