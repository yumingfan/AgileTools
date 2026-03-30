## Context

目前 `apps/web/src/app/page.tsx` 使用 Tailwind utility class 呈現深色主題，重點色偏紫藍。需求是導入使用者提供的 WeAgile logo 與品牌色，且「功能與布局不變」。

## Goals / Non-Goals

**Goals:**
- 在頁首加入 logo 並維持既有結構。
- 將主要互動按鈕與狀態色調整為品牌色系（藍/橘/綠）。
- 不更動頁面流程、資料繫結、Socket 事件、版面區塊順序。

**Non-Goals:**
- 不新增 UI 元件邏輯。
- 不調整後端或通訊協定。
- 不重構整體 CSS 架構（維持在既有 JSX class 名稱微調）。

## Decisions

- **Logo 以靜態檔放置於 `apps/web/public/`**  
  採用 Next.js 公開資產路徑（`/weagile-logo.png`），避免外部 URL 依賴。

- **配色調整以「class 值替換」為主**  
  在既有元素上替換色彩 class，避免布局變動或行為副作用。

- **維持可讀性與對比**  
  深色背景保留，按鈕與狀態色改品牌色，文字與邊框維持足夠對比。

## Risks / Trade-offs

- [Logo 圖片比例不一致] → 以固定高度顯示並保持 `object-contain`。
- [品牌色在深色背景對比不足] → 保留深色文字/邊框並使用較亮品牌色階。
- [僅改 class 可能不夠一致] → 先覆蓋高可見區域（header、CTA、狀態、重點按鈕）。
