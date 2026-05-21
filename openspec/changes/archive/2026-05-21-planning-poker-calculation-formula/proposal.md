## Why

亮牌後使用者目前只看到「成功，平均：X」或「Round 3 收斂後平均：X」，無法理解三連續 Fibonacci 判定與平均是怎麼算出來的，也不利於 Scrum 討論時對齊共識。需要在**達成估算條件**時顯示可讀的計算公式，並在估算歷史中保留同一套說明。

## What Changes

- 當 Round 1/2 判定為 **成功平均**（`success_avg`）時，顯示：命中的三連續 Fibonacci 區間、加總算式與除法結果。
- 當 Round 3 **收斂**（`round3_converged`）時，顯示：移除的所有最低／最高票、剩餘票與平均算式。
- 平均數與公式中的結果 **四捨五入至小數第二位**（顯示與儲存一致）。
- `RoomSummaryPayload` 新增 **`calculationFormula`**（多行文字），由後端規則引擎產生，前端與本機估算歷史共用。
- 估算歷史（`sessionStorage`）寫入完整 `summary`，**一併保存** `calculationFormula`。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `planning-poker`：亮牌／項目完結時的結果呈現與 summary 契約；成功平均與 Round 3 收斂須附計算公式；平均精度為小數第二位。

## Impact

- `apps/server/src/planning-poker/poker-rules.ts`（公式產生、二位小數）
- `apps/server/src/planning-poker/planning-poker.service.ts`（`computeSummary`）
- `apps/server/src/planning-poker/room.types.ts`（`RoomSummaryPayload`）
- `apps/web/src/app/page.tsx`（亮牌／完結 UI、估算歷史）
- 後端單元測試（`poker-rules.spec.ts`、`planning-poker.item.spec.ts` 等）
