# web-branding-theme Specification

## Purpose
Planning Poker Web 介面的品牌識別：首頁顯示 WeAgile 等品牌 Logo，並以品牌色系呈現主要互動元素，且不影響既有功能與投票流程。

## Requirements

### Requirement: 首頁顯示品牌 Logo
系統 SHALL 在 Web 首頁的標題區塊顯示品牌 Logo，且不影響現有功能與版面流程。

#### Scenario: 首頁載入時顯示 Logo
- **WHEN** 使用者開啟 Planning Poker 首頁
- **THEN** 頁首可見品牌 Logo，且主要功能區塊位置與互動不變

### Requirement: 套用品牌色系
系統 SHALL 將 Web 首頁視覺重點色調整為品牌色系（藍、橘、綠），並維持在深色背景下可讀。

#### Scenario: 主要按鈕與狀態使用品牌色
- **WHEN** 使用者查看建立/加入與流程操作按鈕
- **THEN** 主要互動元素使用品牌色階顯示，且文字可讀性與對比符合既有可用性
