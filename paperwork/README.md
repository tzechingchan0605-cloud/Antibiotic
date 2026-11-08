# WS4 v3：抗生素與細菌生長

唯一教材來源是 `source.js`：讀取現行L、完整變量／假設選項、MC、模型、容差、參考函式與rubric。`worksheet.py`產生可編輯DOCX，LibreOffice從同一DOCX產生PDF；不是整頁圖片。十二項資料沿用seeds1001/1002/1003，圖與尺同為1.5pt/mm，6mm紙碟；圖的結果不另造數據。學生版不預印待答讀數或均值。

參照已讀取VL1 repo a9ea711、VL2 repo現行四頁教材及生成來源的版面，沒有移入其科學內容。先前聊天的WS1附件已無法解析，不能聲稱另行核對了該附件；本版參照同系列repo實際公開教材。

## 重建

```sh
npm ci --cache /workspace/shared/npm-cache --no-audit --no-fund
python -m venv --system-site-packages /workspace/shared/ws4-venv
/workspace/shared/ws4-venv/bin/pip install -r paperwork/requirements.txt
PAPER_PYTHON=/workspace/shared/ws4-venv/bin/python npm run build
npm run paper:check
npm test
npm run paper:test
```

需要Noto CJK、Chromium、Poppler及LibreOffice（soffice，可用SOFFICE_PATH覆寫）。`npm run build`會在來源改變時重建；沒有更改不重複生成。檔名包含v3及內容雜湊；manifest檢查來源與十檔checksum，舊版本／缺檔／損壞均拒絕。保留舊app.bundle雜湊檔給快取HTML使用。Pages來源為main根目錄/.nojekyll，正常非強制push；發布後須另查線上檔案，不能以本機成功當上線。

<!-- paper-summary:start -->
WS4 v3 · 598905cb7a91

| 教材 | 頁數 | 繁中 | English |
| --- | ---: | --- | --- |
| 完整學生 PDF | 4 | [下載](generated/VL4_studentPDF_zh_v3_598905cb7a91.pdf) | [Download](generated/VL4_studentPDF_en_v3_598905cb7a91.pdf) |
| 完整學生 Word | 4 | [下載](generated/VL4_studentWord_zh_v3_598905cb7a91.docx) | [Download](generated/VL4_studentWord_en_v3_598905cb7a91.docx) |
| 完整連答案 PDF | 4 | [下載](generated/VL4_answersPDF_zh_v3_598905cb7a91.pdf) | [Download](generated/VL4_answersPDF_en_v3_598905cb7a91.pdf) |
| 完整連答案 Word | 4 | [下載](generated/VL4_answersWord_zh_v3_598905cb7a91.docx) | [Download](generated/VL4_answersWord_en_v3_598905cb7a91.docx) |
| D 教師指引、配對及評分 | 3 | [下載](generated/VL4_D_zh_v3_598905cb7a91.pdf) | [Download](generated/VL4_D_en_v3_598905cb7a91.pdf) |
<!-- paper-summary:end -->

學生／答案各四頁：需知與情境；公平比較；三板、量度、均值與部分分析；其餘分析與整合解釋。姓名只在首頁，同一行。所有題目、選項及提示來自現行VL；最後題只把學習重點改為課題需知。

D列明派發、首次保存、15–20分鐘試教安排、教師支援、逐題配對、全部答案、部分分、缺答／不適用與Excel版本。WS24分僅供紙本作業檢核，不能直接與VL29分比較。沒有紙本機會的原始預測、歷史觀察、自主設計與實作不當零分。正式課本／官方syllabus及共同測驗效度未在本次提供，不捏造。
