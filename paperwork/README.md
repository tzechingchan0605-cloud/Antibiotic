# VL4 教師下載紙本對照組工作紙 PDF

依使用者提供並已核對的研究 proposal §4.1、§4.3.2，兩組使用相同情境、概念及題目，在正式授課前完成四週自學活動；紙本以靜態圖及預製資料表代替互動模擬。此套件對應目前 VL4 抗生素活動，不移入 VL1 消化系統題目，亦不恢復已刪延伸、棒形圖或舊知識題。

## 派發與教師入口

以目前指定教師電郵登入後，儀表板顯示「下載紙本對照組工作紙 PDF」。無須建立示範、解鎖雲端、新增 Apps Script 或完成學生探究。可獨立選擇材料繁中／英文，預覽及直接下載真正的 PDF；選擇材料語言不會切換探究語言。

<!-- paper-summary:start -->
材料 v1 · 內容版本 22ddc4c4967f

| 分冊 | 頁數 | 完整套裝頁碼 | 繁中 PDF | 英文 PDF |
| --- | ---: | --- | --- | --- |
| A | 3 | 1–3 | [下載](generated/VL4_A_zh_v1_22ddc4c4967f.pdf) | [Download](generated/VL4_A_en_v1_22ddc4c4967f.pdf) |
| B | 2 | 4–5 | [下載](generated/VL4_B_zh_v1_22ddc4c4967f.pdf) | [Download](generated/VL4_B_en_v1_22ddc4c4967f.pdf) |
| C | 2 | 6–7 | [下載](generated/VL4_C_zh_v1_22ddc4c4967f.pdf) | [Download](generated/VL4_C_en_v1_22ddc4c4967f.pdf) |
| D | 6 | 8–13 | [下載](generated/VL4_D_zh_v1_22ddc4c4967f.pdf) | [Download](generated/VL4_D_en_v1_22ddc4c4967f.pdf) |
| 完整教師套裝 | 13 | 1–13 | [下載](generated/VL4_all_zh_v1_22ddc4c4967f.pdf) | [Download](generated/VL4_all_en_v1_22ddc4c4967f.pdf) |
<!-- paper-summary:end -->

學生只使用 A–C（共 7 頁）；D 只供教師。完整教師套裝不能一次整套派學生。

1. 先派 **A**，保存原始假說、理由、變量、實驗前提、對照、裝置設計及重複安排。學生保留可讀副本。
2. 原始設計固定後才派 **B**，由學生判讀圖像、記錄資料、算平均值及完成目前六題分析／結論。
3. 固定或收取原探究答案後才派 **C**，查看學習重點及原有概念圖，引用自己的 B 冊資料完成反思。
4. **D** 包含指引、開放題參考、原始資料與平均值、五題選擇題答案、結論及現行 23 分 rubric。紙本須由教師批改；rubric 中的「自動／Shared check」是 VL 原有檢核準則，不是自動辨識手寫。

A、C 第一頁各印一次姓名、班別、學號，獨立分冊及完整套裝相同；其他頁不重複。所有文字作答及修訂區恰為兩條橫線。句子下拉選單轉成句內括號選項；複選保留方格，單選題使用圓框。繪圖框在文字設計欄之前，灰色小字保留原有提示。A3 合併實驗前提、對照及裝置；B1 合併圖像／原始資料／觀察表／原有操作提示；B2 合併平均值及現有分析／結論；C1 合併學習重點、概念圖及證據界限，反思保留 C2。

## 同一內容來源與隔離

- `inquiry-content.js`：VL 與紙本共用變量、假設、預測、重複次數選項及材料圖。液體材料有清楚液面線。
- `i18n.js`：共用情境、題幹、提示與選項文字，兩語提醒使用本次指定原文。
- `analysis.js`：共用現行五題 MC、編號／答案及選填結論；紙本不印參考答案。
- `reports.js`：共用學習重點、兩幅概念圖及教師開放題參考；`rubric.js` 共用配分／評分準則。英文 rubric 是同一項目的翻譯，建置驗證列數及分數；不是另一套問題。
- `english-glossary.js`：沿用已批准的詞彙排除清單及括號中文支援；材料不翻譯學生答案。
- `paperwork/source.js`：只讀上述內容，使用獨立的靜態普通物件與固定種子 1001、1002、1003 執行同一 `generateResult`。不呼叫 `freshRecord`、不讀任何學生紀錄。固定模型仍使用 X 約 18 mm、Z 約 27 mm、Y／C 無外圍圈的現行結果規則；原始數值取自模型，未另設濃度、菌落數或患者用藥數據。
- `paperwork/client.js`：每次操作檢查目前教師模式；材料選擇、預覽與下載不觸及答案、繪圖、示範、計時、事件、本機／雲端資料或 Excel。驗證內容 digest、PDF 檔頭、長度及 SHA-256；過期／損壞檔案拒絕下載。

沿用 VL1 的教師電郵入口規則，這不是額外的身份驗證。GitHub Pages 的 PDF 是公開靜態教學檔案；隱藏學生入口不能提供伺服器存取限制，D 的分發由教師管理。

## 建置、版本及驗證

```bash
npm ci
# 重建所需：Python 3、Noto CJK、FontTools；檢查實際 PDF 另需 PyMuPDF／Pillow。
python -m pip install -r paperwork/requirements.txt
# Debian/Ubuntu: 安裝 fonts-noto-cjk、poppler-utils；Chromium 或 Playwright Chromium。
npm run paper:build
npm run paper:check
npm test
npm run paper:test
```

`npm run build` 會自動檢查並只在來源更新時重建材料。`paper:build` 強制重建；`paper:check` 驗證目前來源 fingerprint、兩語內容 digest、字型及十份 PDF 校驗。檔名格式為 `VL4_{A|B|C|D|all}_{zh|en}_v1_{內容hash}.pdf`；下載名稱為 `VL4_ControlGroup_{分冊|CompleteTeacherPack}_{ZH|EN}_v1_{內容hash}.pdf`。文件表格與 manifest 的頁數、套裝頁碼、檔名會隨建置同步更新；成功重建後只保留目前十份檔案，避免派發過期版本。

建置在隔離瀏覽器只載入本機靜態資源，不啟動 VL、不登入、不接觸 Google。實際 A4 頁數經 `pdfinfo` 核對，版面所有元素都須留在內容區，每個文字作答區須有兩線。字型依目前兩語內容自動取香港字形子集；授權見 [字型說明](fonts/README.md)。

`tests/paperwork_pdf.py` 檢查十份 PDF 共 52 頁的實際文字、題目／選項、字型字形、頁面邊界、作答線、姓名欄及詞彙規則，並輸出每頁及灰階 B 至 `artifacts/paper-review/` 供視覺審閱。瀏覽器測試下載兩語十份真正 PDF、驗證 filename／checksum、預覽、手機、學生入口隱藏、過期／損壞拒絕，並比較下載前後完整 localStorage、畫布、欄位、計時及實際 Excel ZIP 內容。

## 研究者仍需核對

見 [proposal 對照說明](../docs/paper-research-alignment.md)。正式 SPSAI／CKT 原題及效度資料未提供，本功能不取代正式測試或證明介入效果。VL 個別探究的種子與紙本固定種子不同，結果參數一致但個別原始值可能不同；請核對等值資料安排。紙本不測虛擬工具操作能力，23 分 rubric 及跨 VL 配重、評分者一致性須校準。正式派發前，以實際印表機試印灰階 B，核對用語、字體可讀性與兩行作答空間是否適合學生。
