# WS4 v9：抗生素與細菌生長

唯一教材來源是 `source.js`：讀取現行L、完整變量／假設選項、MC、模型、容差、參考函式與rubric。`worksheet.py`產生可編輯DOCX，LibreOffice從同一DOCX產生PDF；不是整頁圖片。十二項資料來自seeds1001/123456789/1982，清晰區及6mm紙碟按1:1實際印刷尺寸繪製，不附內置直尺；圖的結果不另造數據。學生版不預印待答讀數或均值。v4改用較分散的固定種子，直接取自同一generateResult，沒有改VL模型公式或既存結果。

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

需要Noto CJK、Noto Color Emoji、Chromium、Poppler及LibreOffice（soffice，可用SOFFICE_PATH覆寫）。`npm run build`會在來源改變時重建；沒有更改不重複生成。檔名包含v9及內容雜湊；manifest檢查來源與十檔checksum，舊版本／缺檔／損壞均拒絕。保留舊app.bundle雜湊檔給快取HTML使用。Pages來源為main根目錄/.nojekyll，正常非強制push；發布後須另查線上檔案，不能以本機成功當上線。

<!-- paper-summary:start -->
WS4 v9 · f028ff70994b

| 教材 | 頁數（中／英） | 繁中 | English |
| --- | ---: | --- | --- |
| 完整學生 PDF | 4 | [下載](generated/VL4_studentPDF_zh_v9_f028ff70994b.pdf) | [Download](generated/VL4_studentPDF_en_v9_f028ff70994b.pdf) |
| 完整學生 Word | 4 | [下載](generated/VL4_studentWord_zh_v9_f028ff70994b.docx) | [Download](generated/VL4_studentWord_en_v9_f028ff70994b.docx) |
| 完整連答案 PDF | 4 | [下載](generated/VL4_answersPDF_zh_v9_f028ff70994b.pdf) | [Download](generated/VL4_answersPDF_en_v9_f028ff70994b.pdf) |
| 完整連答案 Word | 4 | [下載](generated/VL4_answersWord_zh_v9_f028ff70994b.docx) | [Download](generated/VL4_answersWord_en_v9_f028ff70994b.docx) |
| D 教師指引、配對及評分 | 4 | [下載](generated/VL4_D_zh_v9_f028ff70994b.pdf) | [Download](generated/VL4_D_en_v9_f028ff70994b.pdf) |
<!-- paper-summary:end -->

學生／答案各四頁：課題需知與情境；變量、假設、對照與重複安排；量度、均值與兩道分析；結論、其餘分析及整合解釋。姓名只在首頁，同一行。所有題目、選項及提示來自現行VL；最後題把學習重點對應為課題需知，保留現行選樣本及數據證據要求。

D列明派發、首次保存、15–20分鐘試教安排、教師支援、逐題配對、全部答案、部分分、缺答／不適用與Excel版本。WS24分僅供紙本作業檢核，不能直接與VL29分比較。沒有紙本機會的原始預測、歷史觀察、自主設計與實作不當零分。正式課本／官方syllabus及共同測驗效度未在本次提供，不捏造。

v4（歷史版本）依教師批註：左側為了解情境同源照片與外部標籤、右側課題需知；完整研究情境移入部分1。移除需知量度段落。變量三欄有框線表；1.4合併次數與原因開放作答；2.1每板兩列、樣本四欄；樣本多選，排序手寫並以／刪去不用位置。正文1.15倍、提示16.5pt，選項表20pt及數值表16pt參照WS2；正文／選項仍12pt，提示及圖內字最少11pt。


v5：照片標示重新定位，歷史附註／來源移至D，MRSA定義只在部分1情境。需知改為四點、括號保留無可見生長不等於全死，並加入VL原圖A的列印重排版。抗性段落保留「比例上升可降低效果」，不宣稱必須完全佔滿群落。第3頁三圖放大至57mm寬，只有紙碟／清晰區供實體毫米尺量度，1:1；不新增皿身量度。100%／實際大小列印、20mm校準線，讀數±1mm，均值仍按自身三次讀數±0.1mm。數值表20pt行距，正文／選項18pt（12pt字），自由作答線26pt；整合題四行。結論移第4頁，選項改（□ X　□ Y　□ Z　□ C　□ 沒有樣本），VL同步加入C為干擾選項，總分及舊紀錄不變。


v6按WS1實際Word格式改為正文／MC選項1.5倍行距、段後5pt；表內文字1.2倍行距、段後3pt。字體仍12pt、提示及圖內字最少11pt。保留完整任務及作答線，兩語學生／答案改為六頁，為保留完整題目與作答區，本版依較寬行距排為六頁，未以縮字維持四頁。照片擴至8.6cm，右上只放需知第1、3、4點；第2點置於下方A圖旁，仍為可編輯Word文字。菌落線直接接到菌落詞旁，清晰區文字在其線上方；A圖①接紙碟中央、③接清晰區內。量度頁使用教師提供的新提示，刪學生列印說明及20mm校準線；圖的實際毫米比例與±1mm容差不變，教師印前仍核對紙碟6mm。VL任務、評分、模型及紀錄未改。


v7依最新四頁要求重新分頁，僅在需要位置改為正文／選項18pt行距、表格20pt；字體12pt不變。三個照片括號說明統一灰色#607D85。繁中無可見生長提醒為11pt單獨一行（第3行）；部分1回到首頁，WS刪除指定MRSA抗性補充句。其餘題目、選項、作答區、實際毫米比例及±1mm規則保留。兩語學生／答案均四頁；D依實際頁數列於清單。


v8保留四頁及全部內容，按語言／頁面分配空白：繁中正文22–25pt、選項22–25pt、表格按頁20–28pt；英文只在第2、3頁略增間距，保留已接近頁底的第1、4頁設定。繁中答案文字22pt；題間距同步調整。量度圖不縮放，單行11pt括號提醒不變。


v9圖A四支擴散箭嘴及第②句同為橙色#C56800，移除第②條標示線。VL／報告／紙本直接共用圖源；紙本第①／③條連線以data-step保留對應。首頁照片旁三點解說改為垂直置中，下移至照片旁；兩語學生／答案保持四頁，其他行距與資料不變。


v9同輪後續修改：照片旁文字垂直置中；全份編號／圓點／方格以懸掛縮排對齊首字，兼容中文、英文及勾選字型，圖內編號續行同樣對齊。WS情境改用精簡版本並將三個指定詞組標紅，末尾舊研究問句移除。變量表改為左類別／右完整七選項的三列橫排剔選表。2.1刪除紙碟直徑文字，紀錄項改為「清晰區的存在」及「清晰區的總直徑 (mm)」。第三固定種子1982取代4294967，原generateResult產生第三板X17.7／Z26.1，Z等於第一板；X平均18.1、Z平均26.7，圖與答案自同一資料生成，VL模型及既存學生結果不改。


v9同輪文字批註：2.2改「清晰區的總直徑平均值計算」；結論選項採（□ X,    □ Y,    □ Z,    □ C,    □ 沒有樣本），「抑制效能」及「以「／」刪去不適用位置」標紅；整合題與VL同步改「引用數據支持你的判斷」。英文同步，完整題目、四頁及評分保留。
