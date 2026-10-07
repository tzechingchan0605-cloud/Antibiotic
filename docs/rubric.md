# VL4 評分準則初稿 / Draft assessment rubric

這份準則供首次試教及研究者檢閱，尚未驗證。正式比較不同 VL 前，需統一準則、配分及評分者校準。本文件與 `rubric.js` 的 Excel 評分準則同步；教師只能在匯出的 Excel 內評分，學生介面和 PDF 不顯示分數。

This draft requires pilot teaching and calibration across VLs and assessors. It is not a validated instrument. Scores exist only in the exported teacher workbook; student pages and reports contain no scores.

| SPS 類別 | 4 分的組成 |
| --- | --- |
| 觀察 | 初步觀察（教師 2）；直徑和紙碟外有無圈（自動 2） |
| 分類 | 獨立變量（自動 1）；因變量（自動 1）；六項控制變量（自動 2） |
| 設計探究 | 可測試假說及理由（教師 1）；原始重複理由（教師 1）；對照理由（教師 1）；探究假設（自動 1） |
| 進行實驗 | 平板設計品質（教師 2）；依結果檢查及改善方法（教師 2） |
| 推論 | 自己的平均值（自動 1）；死亡及臨床限制（自動 1）；對照與獨立重複的書面證據（教師 2） |
| 溝通 | 棒高與自己的平均值（自動 2）；書面表達（教師 2） |

六項 SPS 合共 24 分。新知識四項各 2 分：抗生素與細菌感染、細菌抗藥性、清晰區及重複的限制、以概念與證據修訂原始解釋；合共 8 分，整體最高 32 分。完整的逐項滿分／部分得分／零分描述在 Excel「評分準則」工作表及 `rubric.js` 的 `RUBRIC_ROWS`。

## 數值檢核 / Numeric checks

- **直徑**：模型使用 6 mm 紙碟，量度穿過紙碟中心的整個無可見生長區，包括紙碟。12 項最後讀數各自需符合模型參考直徑 **±1 mm**，並正確分類紙碟外有／無圈。每項滿足兩者得 `2/12` 分，再將整欄保留兩位小數。沒有外圍圈記 6 mm，不是 0；6 mm 紙碟本身不代表抑菌。
- **平均值**：以學生自己的三個最後讀數相加再除 3，不用模型直徑取代學生讀數。輸入保留一位小數，容差 **±0.1 mm**。每個正確樣本 0.25 分，共 1 分。
- **棒形圖**：X、Y、Z、空白對照四根棒，Y 為平均總直徑（mm）。以學生自己輸入的平均值檢核，容差 **±0.5 mm**；必須按確認圖表才可檢核。每個正確棒高 0.5 分，共 2 分。類別不連成連續曲線。
- **控制變量**：六項分別是同一種細菌、可比較初始分布、相同培養基、紙碟大小、各樣本預設製備條件、共同培養及觀察條件。每項 `2/6` 分，整欄保留兩位小數；誤選非控制條件則本欄 0 分。不同抗生素的擴散特性仍可能不同。
- **探究假設**：只選「初始分布可比較」「沒有額外污染」「相同模擬條件」得 1 分；錯選／漏選 0。不能選「沒有生長必定全部死亡」。
- **推論選擇**：不能由無可見生長證明全部死亡、不能由最大圈判定最佳臨床治療；各 0.5 分。學生原有假說沒有獲結果支持不直接扣能力分。

Readings use a ±1 mm tolerance and the correct visible-zone category. Means are checked against the student's own latest readings (±0.1 mm); bars against their entered means (±0.5 mm). This avoids deducting repeatedly for one measurement error.

## 人工評分及狀態 / Manual marking and status

12 個人工格均預設空白。Excel `COUNT` 分開空白與數字 0：空白表示待評；填 0 表示已評零分。人工格設有 0 至該項最高分的十進制驗證，可填部分分數。綠字滿分／正確，紅字零分／錯誤，橙字部分分數，中性色待評或未答。

分項公式有必要人工分數才產生數值。整體總分還要求**全部 12 個必要人工格填完，以及學生反思已提交**；否則顯示「待評／未完成」。新匯出的檔案不會讀取上一次 Excel 的人工分數，教師需保存已評分的 Excel。公式在 Excel／LibreOffice 開啟時重算。

Blank manual cells mean pending review; zero is an actual awarded score. The 32-point total remains pending until all twelve manual fields contain numbers and reflection submission is recorded. Save the marked workbook: subsequent exports start with blank manual fields.

## 評分界線 / Assessment limits

不把選 3 次、次數較多、完成率、拖動精度、點擊／拖動次數、速度或有效用時直接換成 SPS 分數。操作事件只提供方法評估的背景。新的獨立平板才算獨立重複；同一圈再量度或複製圖片不算。合理但未被數據支持的假說可有滿分的設計與分析；評分看可測試性、理由及證據。三次是課堂可行安排，並非可靠性保證。新知識選擇題有客觀參考，但新知識分數由教師綜合選項及實際反思評定。

Do not score motor precision, mouse speed, clicks, elapsed time, completion rate or the choice of three repeats. A sound but unsupported hypothesis can receive full design and evidence-reasoning credit. Objective knowledge choices may be annotated, but teachers judge knowledge scores using the student's explanation and reflection.

全班 Excel 必須在前端完成全部中央資料讀取後才匯出；讀取失敗不得用部分本機資料代替全班。本機匯出使用「本機學習紀錄」檔名，與「全班學習紀錄」明確區分。教師示範、教師身分紀錄及非 VL4 資料均排除於匯出。

獨立變量及因變量沿用 VL2 的多選按鈕作答；只選中該類的正確因素才得 1 分，多選錯誤因素得 0 分。舊紀錄的單一文字選項仍可讀取及評分。
