# planning-poker Specification

## Purpose
TBD - created by archiving change planning-poker-web. Update Purpose after archive.
## Requirements
### Requirement: Room 隔離與平行進行
系統 SHALL 支援多組團隊在同一時間使用，且每組團隊在獨立的 `Room` 內進行投票流程。跨 Room 的事件（投票、倒數、結果）不得互相影響或洩漏。

#### Scenario: A Room 與 B Room 同時進行不串線
- **WHEN** 兩位 Host 分別建立 Room A 與 Room B，並且各自有參與者投票
- **THEN** Room A 的倒數與亮牌結果只推送給 Room A 參與者，Room B 的倒數與亮牌結果只推送給 Room B 參與者，且互相不會看到彼此的投票值或狀態

### Requirement: 投票值集合與 `?` 選項
系統 SHALL 提供下列投票選項供每個 Round 使用：`0,1,2,3,5,8,13,21,?`。

#### Scenario: 投票顯示包含指定卡集合
- **WHEN** 參與者在任一 Room 任一 Round 選卡
- **THEN** 選項清單必須包含 `0,1,2,3,5,8,13,21` 與 `?`，且系統能接收並儲存被選擇的值

### Requirement: 投票隱藏與亮牌同時揭示
系統 SHALL 在亮牌前隱藏所有人的投票值，且在進入亮牌階段時同時揭示每個參與者投了哪張卡。

#### Scenario: 未進入亮牌前參與者看不到他人投票
- **WHEN** 參與者完成投票但尚未進入亮牌
- **THEN** 系統不得向該參與者呈現其他參與者的投票值明細

#### Scenario: 進入亮牌階段所有人同時可見投票明細
- **WHEN** Host 啟動該 Round 的亮牌倒數且所有參與者滿足揭示條件
- **THEN** 系統在亮牌事件發生後，將每位參與者的投票值一次推送給該 Room 內的所有使用者進行顯示

### Requirement: Round 時間與倒數顯示規則
系統 SHALL 支援每個 Round 的思考時間上限，且 Host 可設定最少為 `5 秒` 的思考時間。思考時間最後 5 秒 SHALL 顯示倒數 `5..1`。當所有參與者完成投票後，系統 SHALL 進入亮牌倒數（`3..2..1`），且亮牌倒數開始後不再等待思考倒數走完。

#### Scenario: 思考時間最後 5 秒顯示倒數
- **WHEN** 思考時間剩餘 <= 5 秒且該 Round 尚未完成揭示
- **THEN** 前端顯示倒數 `5..1`

#### Scenario: 大家提前投完後立即進入亮牌倒數
- **WHEN** 在思考時間最後 5 秒之前所有參與者都完成投票
- **THEN** 系統立刻進入亮牌倒數並顯示 `3..2..1`，而不必等待思考倒數到 `5..1`

### Requirement: 未投票視為未完成且不可亮牌
系統 SHALL 在思考時間到期時將仍未完成投票的參與者視為「未完成」，並且該 Round SHALL 不得進入亮牌展示流程，直到 Round 完成揭示條件被滿足。

#### Scenario: 思考時間到期仍有人未投
- **WHEN** 思考時間到期且存在參與者未投票
- **THEN** 系統維持在投票等待狀態，並且不得顯示亮牌倒數與投票明細

### Requirement: Round 1/2/3 與主動推進
系統 SHALL 在同一待估項目上使用至多 `Round 1`、`Round 2`、`Round 3`。在未取得「成功平均」（見「得分與待估項目完結」）前，Host SHALL 手動開始下一個 Round（Round+1）。一旦取得成功平均，該待估項目 SHALL 立即完結，不得再開始 Round 2 或 Round 3。

#### Scenario: Round 1 失敗後手動進入 Round 2
- **WHEN** Round 1 的判定未落入成功條件（未取得成功平均）
- **THEN** 系統顯示失敗提醒，並等待 Host 手動開始 Round 2（若當前 Round 序號 < 3 且項目尚未因成功平均而完結）

#### Scenario: Round 1 成功平均後不再進入後續 Round
- **WHEN** Round 1 亮牌後判定為成功平均
- **THEN** 該待估項目立即完結，系統不得要求或允許 Host 開始 Round 2

### Requirement: 成功判定（同一段三連續 Fibonacci 範圍）
系統 SHALL 使用 Fibonacci 值集合 `0,1,2,3,5,8,13,21`，並判定該 Round 的所有數字投票值是否落入同一段「三個連續 Fibonacci 數」所構成的集合內；若符合則視為成功。

#### Scenario: 全部投票落在同一段三連續範圍
- **WHEN** 數字投票值全部都屬於某段 `(a,b,c)` 三個連續 Fibonacci 的集合
- **THEN** 系統判定該 Round 成功，並進行平均計算結果顯示

### Requirement: 平均計算（成功或 Round 3 收斂前）
系統 SHALL 在成功判定時，對該 Round 的數字投票值取平均作為彙總結果。

#### Scenario: 成功後顯示平均
- **WHEN** 該 Round 判定為成功
- **THEN** 系統顯示該 Round 的平均值結果

### Requirement: `?` 行為（無法估算）
系統 SHALL 在任一 Round 只要出現 `?`，即判定該 Round 的結果為「無法估算」，並跳過三連續 Fibonacci 成功判定與平均流程。`?` **不構成「成功平均」／得分**；在未取得成功平均且當前 Round 序號小於 3 時，Host SHALL 仍可手動開始下一 Round。若三輪結束仍從未取得成功平均，該待估項目 SHALL 完結（見「得分與待估項目完結」）。

#### Scenario: 任一人投出 `?`
- **WHEN** 該 Round 的投票集合包含 `?`
- **THEN** 系統顯示「無法估算」，且不進行三連續範圍判定與平均計算

### Requirement: 失敗提醒與後續 Round
系統 SHALL 在該 Round 未落入三連續 Fibonacci 成功條件時，顯示最高/最低需要處理的線上提醒（不需要線上理由輸入），並等待 Host 手動開始下一個 Round（若 Round < 3）。

#### Scenario: 失敗後顯示最高/最低提醒
- **WHEN** Round 的投票值未落入任一三連續 Fibonacci 範圍
- **THEN** 系統顯示「需要線下討論最高/最低估值」的提醒，且允許 Host 手動開始下一輪

### Requirement: Round 3 收斂（移除所有 max 與所有 min）
系統 SHALL 僅在該待估項目**已進入並完成 Round 3 之投票與揭示**、且該 Round **未出現 `?`**、且**先前 Round 皆未取得成功平均**時，執行收斂：移除所有持有最高值的參與者投票（所有 `max`）以及所有持有最低值的參與者投票（所有 `min`），並對剩餘數字投票取平均作為最終結果（或依規則顯示無法估算）。

#### Scenario: 移除 max 與 min 後仍有剩餘票
- **WHEN** Round 3 的數字投票移除所有 `max` 與所有 `min` 後仍存在至少一筆剩餘票
- **THEN** 系統對剩餘票取平均並顯示最終結果

#### Scenario: 移除 max 與 min 後剩餘票數為 0
- **WHEN** Round 3 的數字投票在移除所有 `max` 與所有 `min` 後沒有剩餘票
- **THEN** 系統顯示「無法估算」作為最終結果

### Requirement: 晚加入投票行為（亮牌前加入只能投下一輪）
系統 SHALL 在參與者於該 Round 投票已完成但尚未亮牌前加入時，禁止其參與當前 Round 的投票，並將其置於下一個 Round 的投票等待狀態。

#### Scenario: 亮牌前晚加入只參與下一輪
- **WHEN** 參與者在某 Round 已完成投票但尚未進入亮牌時加入
- **THEN** 系統不得接受其當前 Round 的投票，並要求其在下一個 Round 投票

### Requirement: 亮牌後顯示每人投票明細
系統 SHALL 在亮牌後顯示每個參與者投了哪張卡，且同時顯示彙總結果或失敗/無法估算提醒。系統 SHALL 允許前端以品牌識別視覺（例如品牌 Logo 與品牌色）呈現，但 SHALL NOT 改變投票流程、事件語意與結果計算邏輯。

#### Scenario: 亮牌後顯示每人卡片與結果
- **WHEN** 該 Round 進入亮牌完成狀態
- **THEN** 系統顯示每位參與者的投票卡片，並顯示該 Round 的平均結果或「無法估算」或最高/最低提醒

#### Scenario: 品牌視覺套用不影響流程
- **WHEN** 前端套用品牌 Logo 與品牌色主題
- **THEN** 使用者可在相同流程中完成建立房間、加入、投票、亮牌與下一輪操作，且行為與結果與套用前一致

### Requirement: 得分與待估項目完結
系統 SHALL 將 **「成功平均」**（三連續 Fibonacci 成功判定後之數字平均）視為該待估項目之**唯一**得分。`?`、失敗提醒、Round 3 收斂後之「無法估算」等均 **SHALL NOT** 視為得分。

#### Scenario: 任一 Round 取得成功平均後項目完結
- **WHEN** 某 Round 亮牌後判定為成功平均
- **THEN** 該待估項目立即完結，系統進入「項目完結」狀態，且不得再開始更高序號之 Round

#### Scenario: 三輪結束仍無成功平均後項目完結
- **WHEN** Round 3 已揭示完成，且 Round 1 至 Round 3 從未出現成功平均
- **THEN** 該待估項目完結，系統進入「項目完結」狀態

### Requirement: Host 開啟下一次投分
項目完結後，系統 SHALL **不得**自動開始新的待估項目流程。僅當 Host 執行明確操作（例如「開始下一次投分」）時，系統 SHALL 重置該房間內與當前待估項目相關之狀態（輪次、票、計時、揭示結果等），並自 Round 1／等待 Host 開始首輪投票之階段重新開始。系統 **SHALL NOT** 要求輸入項目名稱或編號。

#### Scenario: 完結後僅 Host 可開下一輪投分
- **WHEN** 待估項目已完結
- **THEN** 參與者介面顯示等待或摘要狀態，且僅 Host 可操作以開始下一次投分

#### Scenario: 下一次投分不帶項目識別
- **WHEN** Host 開始下一次投分
- **THEN** 系統不強制收集項目名稱或編號，僅重置流程狀態

### Requirement: Host 不得「僅離開房間」（選項 A）
Host SHALL NOT 使用與一般參與者相同的「離開房間」路徑來脫離該房；Host SHALL 僅能選擇留在房內，或執行明確的「解散房間」以結束該房並通知／移除所有參與者。系統 SHALL 拒絕任何將 Host 視為僅移除自身、而房間仍由其他人繼續運作的「Host 離開」操作。

#### Scenario: Host 嘗試僅離開房間
- **WHEN** Host 觸發僅移出自身之「離開房間」流程（若介面或 API 提供此類操作）
- **THEN** 系統不得接受；Host 須留在房內或改選「解散房間」

#### Scenario: 非 Host 可離開房間
- **WHEN** 非 Host 之參與者執行「離開房間」
- **THEN** 系統僅將該參與者自房間移除，房間與 Host 角色仍存在（與「斷線／重連」語意分離時，不得將一般離開誤等同解散）

### Requirement: 斷線、重連與房間存續
系統 SHALL 以穩定 **`clientId`**（與 Socket 連線分離）識別房內成員。**Socket 斷線** SHALL **不得**將該成員自房間移除，**不得**因 Host 斷線而刪除房間。使用者以相同 **`clientId`** 與房間代碼重新連線並完成入房／恢復流程後，SHALL 恢復原角色與房內狀態（在房間仍存在且未被解散的前提下）。

#### Scenario: 重新整理後自動回到同一房
- **WHEN** 使用者曾成功建立或加入某房，且客戶端保存了 **`clientId`** 與房間代碼後重新載入頁面
- **THEN** 系統自動嘗試恢復連線至該房；若房間仍存在且身分有效，使用者回到與斷線前一致之房內流程狀態

#### Scenario: Host 短暫斷線不刪房
- **WHEN** Host 的 Socket 連線中斷但無人執行解散
- **THEN** 房間 SHALL 仍存在，且 Host 以相同 **`clientId`** 重連後可繼續擔任 Host

### Requirement: 明確離開與解散房間
**離開房間**與**解散房間** SHALL 僅能透過明確的客戶端事件／操作觸發；**不得**僅因 Socket `disconnect` 而觸發等同離開或解散。Host SHALL 僅能透過**解散房間**結束該房給所有人（與「Host 不得僅離開」一致）。

#### Scenario: 參與者明確離開
- **WHEN** 非 Host 執行「離開房間」
- **THEN** 該成員自房間移除，其餘成員仍留在房內，房間可繼續進行

#### Scenario: Host 明確解散
- **WHEN** Host 執行「解散房間」
- **THEN** 房間結束，所有連線中之客戶端 SHALL 收到可區分之通知並回到未入房狀態（具體事件名稱由實作決定，語意須一致）

