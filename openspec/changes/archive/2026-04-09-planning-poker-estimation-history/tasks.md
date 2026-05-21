## 1. OpenSpec Artifacts

- [x] 1.1 建立 proposal，定義估算歷史的目標/非目標與限制
- [x] 1.2 建立 design，定義資料模型、寫入時機與去重規則、UI 呈現
- [x] 1.3 建立 specs（對 `planning-poker` 增補「歷史紀錄」需求）

## 2. Frontend: 歷史資料儲存

- [x] 2.1 定義 `EstimationHistoryItem` 型別與 localStorage key 規則（以 `roomCode` 分區）
- [x] 2.2 在接收 `pp:roomState` 時偵測 `item_complete` 的邊緣觸發並追加紀錄
- [x] 2.3 實作去重 signature，避免重連/重送造成重複紀錄
- [x] 2.4 加入「清除本機歷史」操作（只清除當前 roomCode）

## 3. Frontend: UI

- [x] 3.1 在房內畫面新增「估算歷史」區塊（可收合）
- [x] 3.2 列表顯示：項次、完成時間、摘要訊息、使用輪次
- [x] 3.3 單筆展開顯示投票明細與平均/min/max 等細節

## 4. 驗證

- [x] 4.1 驗證在 `item_complete` 時僅新增 1 筆歷史（重整/重連不重複）
- [x] 4.2 驗證 `pp:hostNextItem` 重置後仍能累積下一筆
- [x] 4.3 執行前端 lint/型別檢查（至少確認修改檔案無錯）

