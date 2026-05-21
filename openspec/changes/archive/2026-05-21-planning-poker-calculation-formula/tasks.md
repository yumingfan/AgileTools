## 1. 後端規則與 Summary

- [x] 1.1 在 `poker-rules.ts` 新增 `roundAverage2`、`formatDecimal2`、`findMatchingTriplet`、`buildSuccessAverageFormula`、`buildRound3ConvergedFormula`
- [x] 1.2 `room.types.ts` 的 `RoomSummaryPayload` 新增 `calculationFormula?: string`
- [x] 1.3 `computeSummary` 於 `success_avg` / `round3_converged` 填入公式與二位小數平均
- [x] 1.4 補充 `poker-rules.spec.ts` 與 `planning-poker.item.spec.ts` 斷言公式與小數位

## 2. 前端顯示與歷史

- [x] 2.1 `page.tsx` 摘要型別加入 `calculationFormula`
- [x] 2.2 抽出 `SummaryResultBlock`，於 `revealed`、`item_complete`、估算歷史詳情顯示公式
- [x] 2.3 確認 `item_complete` 寫入歷史之 `summary` 含 `calculationFormula`（無需改結構，驗證即可）

## 3. 驗證

- [x] 3.1 執行 `npm run test:server` 與 `npm run lint -w web`
- [x] 3.2 手動驗證：R1 成功、R3 收斂各顯示公式；歷史展開可見相同公式
