## ADDED Requirements

### Requirement: 待估項目完結後保留估算歷史（前端本機）
系統 SHALL 在每次待估項目完結（進入 `item_complete`）後，讓使用者可回看該次估算結果之歷史紀錄。此歷史紀錄 SHALL 由前端從房間狀態推導並儲存在瀏覽器端（例如 localStorage），且 SHALL NOT 改變既有投票流程、事件語意與結果計算邏輯。

#### Scenario: 完結後新增一筆歷史紀錄
- **WHEN** 房間狀態由非 `item_complete` 轉換為 `item_complete`
- **THEN** 前端新增一筆歷史紀錄，包含完成時間、該次摘要結果（成功平均／無法估算／最高最低提醒等）與投票明細（每位參與者投票卡面）

#### Scenario: 重連或狀態重送不產生重複紀錄
- **WHEN** 使用者重整頁面、重連 Socket，或收到重複的 `item_complete` 狀態推播
- **THEN** 前端 SHALL NOT 重複新增相同的歷史紀錄

#### Scenario: 開始下一次投分後歷史仍可回看
- **WHEN** Host 執行「開始下一次投分」並重置狀態
- **THEN** 先前完結的歷史紀錄仍可在 UI 中回看，且新一輪完結時可再新增下一筆歷史

