## ADDED Requirements

### Requirement: 估算結果計算公式顯示

當 Round 判定為 **成功平均**（`success_avg`）或 Round 3 **收斂**（`round3_converged`）時，系統 SHALL 在摘要中提供 **`calculationFormula`**（多行文字），說明如何得出最終平均，且 SHALL NOT 僅顯示最終數字而無計算過程。

#### Scenario: Round 1/2 成功時顯示三連續區間與平均算式

- **WHEN** 該 Round 亮牌後判定為 `success_avg`
- **THEN** 摘要包含 `calculationFormula`，說明命中的 Fibonacci 三連續區間，並以 `(票值加總) ÷ 票數 = 平均` 格式呈現，且平均為小數第二位

#### Scenario: Round 3 收斂時顯示移除 min/max 與平均算式

- **WHEN** Round 3 亮牌後判定為 `round3_converged`
- **THEN** 摘要包含 `calculationFormula`，說明移除的所有最低票與最高票、剩餘票清單，以及剩餘票之平均算式，且平均為小數第二位

#### Scenario: 失敗或無法估算不顯示公式

- **WHEN** 摘要 outcome 為 `failure_high_low`、`cannot_estimate` 或 `round3_cannot_estimate`
- **THEN** 系統 SHALL NOT 要求或顯示 `calculationFormula`

## MODIFIED Requirements

### Requirement: 平均計算（成功或 Round 3 收斂前）

系統 SHALL 在成功判定時，對該 Round 的數字投票值取平均作為彙總結果；對外顯示與儲存之平均 SHALL **四捨五入至小數第二位**。

#### Scenario: 成功後顯示平均

- **WHEN** 該 Round 判定為成功
- **THEN** 系統顯示該 Round 的平均值結果（小數第二位），並可選顯示 `calculationFormula`

### Requirement: Round 3 收斂（移除所有 max 與所有 min）

系統 SHALL 僅在該待估項目**已進入並完成 Round 3 之投票與揭示**、且該 Round **未出現 `?`**、且**先前 Round 皆未取得成功平均**時，執行收斂：移除所有持有最高值的參與者投票（所有 `max`）以及所有持有最低值的參與者投票（所有 `min`），並對剩餘數字投票取平均作為最終結果（或依規則顯示無法估算）；最終平均 SHALL **四捨五入至小數第二位**，並 SHALL 提供 `calculationFormula` 說明收斂計算過程。

#### Scenario: 移除 max 與 min 後仍有剩餘票

- **WHEN** Round 3 的數字投票移除所有 `max` 與所有 `min` 後仍存在至少一筆剩餘票
- **THEN** 系統對剩餘票取平均並顯示最終結果（小數第二位）與計算公式

#### Scenario: 移除 max 與 min 後剩餘票數為 0

- **WHEN** Round 3 的數字投票在移除所有 `max` 與所有 `min` 後沒有剩餘票
- **THEN** 系統顯示「無法估算」作為最終結果，且不顯示收斂平均公式

### Requirement: 亮牌後顯示每人投票明細

系統 SHALL 在亮牌後顯示每個參與者投了哪張卡，且同時顯示彙總結果或失敗/無法估算提醒；當 outcome 為 `success_avg` 或 `round3_converged` 時，SHALL 一併顯示 `calculationFormula`。系統 SHALL 允許前端以品牌識別視覺（例如品牌 Logo 與品牌色）呈現，但 SHALL NOT 改變投票流程、事件語意與結果計算邏輯。

#### Scenario: 亮牌後顯示每人卡片與結果

- **WHEN** 該 Round 進入亮牌完成狀態
- **THEN** 系統顯示每位參與者的投票卡片，並顯示該 Round 的平均結果或「無法估算」或最高/最低提醒；若為成功平均或 Round 3 收斂，則顯示計算公式

#### Scenario: 品牌視覺套用不影響流程

- **WHEN** 前端套用品牌 Logo 與品牌色主題
- **THEN** 使用者可在相同流程中完成建立房間、加入、投票、亮牌與下一輪操作，且行為與結果與套用前一致

### Requirement: 待估項目完結後保留估算歷史（前端本機）

系統 SHALL 在每次待估項目完結（進入 `item_complete`）後，讓使用者可回看該次估算結果之歷史紀錄。此歷史紀錄 SHALL 由前端從房間狀態推導並儲存在瀏覽器端（例如 localStorage），且 SHALL NOT 改變既有投票流程、事件語意與結果計算邏輯。儲存之 `summary` SHALL 包含當次完整摘要（含 `calculationFormula`，若有的話）。

#### Scenario: 完結後新增一筆歷史紀錄

- **WHEN** 房間狀態由非 `item_complete` 轉換為 `item_complete`
- **THEN** 前端新增一筆歷史紀錄，包含完成時間、該次完整 `summary`（含成功或收斂時之 `calculationFormula`）與投票明細（每位參與者投票卡面）

#### Scenario: 重連或狀態重送不產生重複紀錄

- **WHEN** 使用者重整頁面、重連 Socket，或收到重複的 `item_complete` 狀態推播
- **THEN** 前端 SHALL NOT 重複新增相同的歷史紀錄
