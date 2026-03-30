## Why

目前 Planning Poker 頁面尚未帶入品牌識別。需要在不改動功能與版面結構的前提下，加入 WeAgile logo 並調整視覺色彩，提升品牌一致性與辨識度。

## What Changes

- 在 Web 首頁加入品牌 Logo（置於現有標題區塊）。
- 將既有深色主題的重點色改為品牌色系（藍/橘/綠與深色文字）。
- 僅調整視覺樣式，不變更任何功能、互動流程與布局結構。

## Capabilities

### New Capabilities
- `web-branding-theme`: 規範前端頁面的品牌 logo 與色彩主題套用行為

### Modified Capabilities
- `planning-poker`: 調整 UI 視覺呈現要求（品牌 logo 顯示與品牌色套用），不改投票流程

## Impact

- Affected code:
  - `apps/web/src/app/page.tsx`
  - `apps/web/public/*`（新增 logo 靜態資產）
- 不影響後端 API、WebSocket 事件、資料模型與測試邏輯。
