import {glossEnglish} from '../english-glossary.js';
export const LABELS={
 title:['抗生素與細菌生長','Antibiotics and bacterial growth'],
 scenario:['患者傷口感染在初步抗生素治療後仍未明顯改善，化驗確認由 MRSA 引起。本工作紙以三塊獨立平板的靜態圖，比較 X、Y、Z 及相同載體對照 C 對可見細菌生長的影響。','A wound infection has not clearly improved after initial antibiotic treatment; testing identifies MRSA. This worksheet uses static images from three independent plates to compare X, Y, Z and the matching carrier control C for visible bacterial growth.'],
 A:['自學概念與已解說示例','Concepts and worked examples'],B:['有提示練習與獨立應用','Guided practice and independent application'],C:['核對答案與修正','Answer checking and corrections'],D:['教師指引、完整答案與評分','Teacher guide, full answers and marking'],all:['完整教師列印套裝','Complete teacher print pack'],
 identity:['姓名：________________　班別：________　學號：________','Name: __________________　Class: ________　No.: ________'],
 circle:['圈選適用選項；文字題以一至兩句或關鍵詞作答。','Circle applicable options; answer written questions with one or two sentences or key terms.'],
 multi:['可選多於一項，請在方格內加上 ✓。','Tick all applicable boxes; more than one may be selected.'],
 sequence:['自學順序：概念解說 → 已解說示例 → 有提示練習 → 獨立應用 → 核對修正。','Study sequence: explanation → worked example → guided practice → independent application → checking and correction.'],
 simulation:['所有平板及數據均為教學模擬；不操作 VL，也不要求實體培養 MRSA。模擬共同條件：30°C、24 小時。','All plates and data are teaching simulations. Do not operate the VL or culture MRSA physically. Shared simulated conditions: 30°C and 24 hours.'],
 conceptTitle:['先學核心概念','Learn the core concepts first'],methodTitle:['已解說示例：把概念用於研究與量度','Worked examples: applying concepts to investigation and measurement'],
 guided:['有提示練習','Guided practice'],independent:['獨立應用：讀圖、量度與判斷','Independent application: observe, measure and interpret'],
 noKey:['先自行完成 B；完成並保留首次作答後，才閱讀 C。A 的示例不是本次 X/Y/Z/C 的結果。','Complete B yourself and preserve your first answers before reading C. The examples in A are not the results for X/Y/Z/C.'],
 scale:['依圖中 mm 刻度讀兩端位置，相減得總直徑；不要用紙上圖像的實際長度代替圖中刻度。','Read both ends on the illustrated mm scale and subtract for the total diameter. Use the labelled scale, not the physical length of the printed image.'],
 convention:['有紙碟外清晰區時，總直徑包括 6 mm 紙碟。沒有外圍清晰區時記 0；紙碟本身的 6 mm 不算清晰區。','When a zone extends beyond the disc, the total diameter includes the 6 mm disc. Without an external zone, record 0; the 6 mm disc alone is not a clear zone.'],
 before:['模擬培養前（尚無可見生長結果）','Before simulated incubation (no visible growth result yet)'],after:['模擬培養後：30°C、24 小時','After simulated incubation: 30°C, 24 hours'],
 observation:['參閱 A 的歷史觀察圖，描述青黴菌附近可見的細菌生長，分開觀察與原因解釋。','Refer to the historical image in A. Describe visible bacterial growth near the fungus, separating observation from an explanation of its cause.'],
 hypothesisEval:['比較兩個說法：甲「這個樣本一定能殺死所有 MRSA」；乙「在相同條件下，含樣本 M 的紙碟周圍清晰區總直徑大於載體對照」。圈選較能以清晰區資料檢驗的說法（甲／乙），並說明理由。','Compare two claims: A, “This sample must kill all MRSA”; B, “Under the same conditions, the total clear-zone diameter around a disc with sample M is greater than around the carrier control.” Circle the more testable claim (A/B), and explain why clear-zone data can test it.'],
 hypothesisApply:['另一情境：對另一種細菌比較未知樣本 U 與相同載體對照。寫一個可用「有無外圍清晰區及總直徑」檢驗的假說；不是重新猜本次 X/Y/Z 的結果。','Another context: compare unknown sample U with the same carrier control using a different bacterium. Write a hypothesis testable with external-zone presence and total diameter; do not make a new prediction about X/Y/Z.'],
 hypothesisHint:['提示：指出比較條件與可觀察結果；清晰區資料不能直接證明「全部死亡」。','Hint: state the comparison and an observable outcome. Zone data cannot directly prove “all killed”.'],
 controlPrompt:['C 是甚麼？說明它如何提供比較基準，以及為何其餘條件須相同。','What is C? Explain its comparison baseline and why the remaining conditions must be the same.'],
 designTitle:['補全標示與檢查公平比較','Complete labels and check fair comparison'],designPrompt:['在四個紙碟旁補全 X、Y、Z、C，各用一次。說明為何要留足紙碟間距及與邊緣的距離。標示順序不影響得分。','Label the four discs X, Y, Z and C, once each. Explain why discs need space between them and from the edge. Label order does not affect credit.'],
 designFault:['圈選有問題的安排（可多選）：甲「同一鑷子未重新消毒便夾下一紙碟」；乙「只在其中一塊平板使用另一種細菌，卻直接合併所有平板作比較」；丙「相同載體、細菌及共同觀察條件」。指出它們可能造成污染或不公平比較。','Circle flawed arrangements (more than one): A, “Pick up the next disc without re-sterilising the forceps”; B, “Use another bacterium on one plate, but combine all plates directly for comparison”; C, “Use the same carrier, bacteria and observation conditions”. Identify contamination or unfair comparison.'],
 repeatCompare:['方案甲：重新量同一平板三次。方案乙：三塊新平板各獨立準備及觀察一次。哪個提供獨立重複？它如何協助檢查變異？','Plan A: remeasure the same plate three times. Plan B: independently prepare and observe three new plates once each. Which provides independent repeats, and how do they help check variation?'],
 repeatFeasible:['本課統一使用三塊平板。為何「三次」不是所有研究唯一正確答案？比較三塊與更多獨立平板時，須考慮甚麼可行性限制？','This lesson uses three plates. Why is “three” not the only correct number for every study? What feasibility limits matter when comparing three with more independent plates?'],
 procedureTitle:['讀圖與程序排序（不是實作操作能力）','Diagram reading and procedure ordering (not practical performance)'],
 procedurePrompt:['以下是模擬流程的描述。把字母排列成合理順序；三塊平板須獨立準備後才共同觀察。這項作答不代表你已完成消毒、塗布或培養操作。','These cards describe a simulated procedure. Order the letters logically; prepare three plates independently before the shared observation. Answering does not demonstrate sterilisation, spreading or incubation performance.'],
 procedureError:['圈選錯誤（可多選）：甲「未均勻塗布便放紙碟」；乙「把重新量同一清晰區稱為一塊新平板的獨立結果」；丙「保留三塊獨立平板的不同讀數」。說明應檢查甚麼。','Circle errors (more than one): A, “Place discs before spreading evenly”; B, “Call remeasurement of one zone a new plate’s independent result”; C, “Retain differing readings from three independent plates”. State what should be checked.'],
 meansHint:['使用你在 B 的三次讀數：平均值＝三個讀數之和 ÷ 3，保留一位小數。','Use your three readings in B: mean = sum of three readings ÷ 3, to one decimal place.'],
 ranking:['本條件下平均清晰區總直徑的排序：','Ranking of mean total clear-zone diameter under these conditions:'],
 conclusionHint:['只排列有外圍清晰區的樣本；未使用的位置選「不適用」。這不是臨床效能或選藥排名。','Rank only samples with an external zone; select “Not applicable” for unused places. This is not a clinical effectiveness or treatment ranking.'],
 reflectionTitle:['概念應用：抗性選擇作用','Concept application: selection of resistance'],
 reflectionPrompt:['選出一個能抑制生長的樣本並引用讀數。若群體原已有少量具該抗生素抗性的細菌，持續使用後，其效果可能如何改變？以存活、繁殖、遺傳及比例變化解釋。','Choose a growth-inhibiting sample and cite readings. If a few bacteria already resist that antibiotic, how might continued use affect its effectiveness? Explain through survival, reproduction, inheritance and changing proportions.'],
 checkingGate:['只在完成 B 並保留首次答案後派發。先核對，再以不同筆色修正，不抹去原答案。','Distribute only after B is completed and first answers preserved. Check, then correct in another colour without erasing the original.'],
 corrected:['我的修正及理由（如原答正確，可寫出核對依據）','My correction and reason (if originally correct, state the check used)'],
 teacher:['只供教師；D 及完整套裝不可整套派學生','Teacher only; do not distribute D or the complete pack to students'],
 guide:['教學安排與研究條件','Teaching arrangements and study conditions'],
 diagnostic:['WS 作業檢核：38 分（不是跨組成效分數）','WS task check: 38 marks (not a cross-group outcome score)'],
 notEquivalent:['程序排序與讀圖不能當作已展示虛擬操作能力；本 WS 分數不直接等同 VL 的原始預測、操作或完成分數。跨組成效用另行共同測驗評估。','Ordering and diagram reading do not demonstrate virtual practical skill. WS marks are not equivalent to VL prediction, operation or completion scores. Evaluate group outcomes using separate common assessments.'],
 mappingTitle:['逐題配對：原題、處理、新題、共同目標及理由','Item alignment: original, treatment, new item, shared goal and rationale'],
 rubricHeaders:[['項目','分數','判準'],['Item','Marks','Criterion']],
 mapHeaders:[['VL 原題','處理方式','新版題目','共同目標','理由'],['Original VL item','Treatment','New worksheet item','Shared goal','Rationale']],
 steps:[
 ['實驗組使用 IBL＋VL；比較組沒有課前講授、不操作 VL，只靠本 WS 自學。A 從開始即可閱讀，按「解說→示例→有提示練習→獨立應用→核對修正」進行。','The experimental group uses IBL + VL. The comparison group has no pre-lesson lecture and does not operate the VL; it learns through the WS. Make A available from the start: explanation → example → guided practice → independent application → checking/correction.'],
 ['兩組均安排 15–20 分鐘，建議使用相同 20 分鐘總時限：概念 3、示例 2、有提示練習 4、獨立應用 8、核對修正 3 分鐘。15 分鐘課節亦須兩組使用相同總時限，不按速度給能力分。','Both groups use 15–20 minutes, preferably the same 20-minute limit: concepts 3, examples 2, guided practice 4, independent application 8, checking/correction 3 minutes. If using 15 minutes, use the same limit for both groups; speed is not an ability score.'],
 ['教師可簡短澄清工作紙已寫出的術語、讀圖方式及作答要求，不在自學前另作概念講授。A 的示例不使用 X/Y/Z/C 的結果；未完成 B 前不揭示其答案。記錄額外提示及實際完成時間。','Teachers may briefly clarify terms, diagram-reading instructions and response requirements already written in the WS, without a separate concept lecture before self-study. Examples do not use X/Y/Z/C outcomes. Do not reveal B answers before completion. Record additional prompts and actual completion times.'],
 ['B1–2 提供提示，B3–5 有十二項獨立量度，B6 是平均值及六類分析，B7 是抗性選擇應用。容許短句或關鍵詞，兩行是作答空間，不要求填滿。','B1–2 are guided; B3–5 contain twelve independent measurements; B6 covers means and six analysis categories; B7 applies resistance selection. Accept short sentences or key terms. Two lines provide space; they need not be filled.'],
 ['學生完成 B 後固定並保留首次作答，才派 C 核對修正。教師此時才提供答案及針對性回饋。尚未完成者不可先看答案；記錄未完成項目，試教檢查 15–20 分鐘是否足夠，不聲稱軟體測試證實教學完成時間。','After B is completed, preserve the first answers before distributing C for corrections. Only then provide answers and focused feedback. Do not give answers to unfinished students. Record unfinished items and pilot feasibility of 15–20 minutes; software tests do not establish actual learning duration.'],
 ['所有圖及量尺由現有固定 seeds 1001、1002、1003 與 generateResult 產生。VL 的個別種子不同，不能聲稱每次學生 VL 數字相同。30°C、24 小時是模擬條件；本冊沒有實體 MRSA 培養要求。','All diagrams and rulers use existing fixed seeds 1001, 1002 and 1003 with generateResult. Individual VL seeds differ; do not claim all learner values are identical. 30°C and 24 hours are simulation conditions. No physical MRSA culture is required.'],
 ['以模型直徑 ±1 mm 核對有區量度；沒有外圍清晰區須選無並記 0。平均值按學生自己的三次讀數核對（±0.1 mm），避免把同一量度錯誤再扣一次。','Check external-zone measurements within ±1 mm of the model. Absence requires No and exactly 0. Check means against the student’s own readings (±0.1 mm), avoiding a second penalty for one measurement error.'],
 ['WS 38 分只作此版本的作業檢核，不與 VL 23 分直接比較，也不把紙本程序／讀圖當作實作能力。研究成效另用共同 SPSAI／CKT；正式工具及其效度須研究者核對。','The 38-mark WS check is specific to this task version, not directly comparable with the VL’s 23 marks; paper ordering/reading is not practical performance. Use common SPSAI/CKT assessments for study outcomes; researchers must verify the formal instruments and their validity.'],
 ['本重設依研究者 2026-10-14 的新比較組條件，調整舊版同題、先探究後教概念的安排；附逐題配對表供研究設計文件同步。保留原有兩語詞彙規則，不改學生 VL、紀錄、雲端或 Excel。','This redesign follows the researcher’s 14 October 2026 comparison condition, replacing the earlier same-item, inquiry-before-teaching arrangement. Use the alignment table to update study documents. Preserve approved bilingual vocabulary; do not change learner VL, records, cloud collection or Excel.']
 ]
};
export const CONCEPTS=[
 ['抗生素主要用於細菌感染，不能治療病毒引起的傷風或流感。','Antibiotics mainly treat bacterial infections, not viral colds or influenza.'],
 ['抗生素由紙碟向外擴散，濃度通常隨距離下降；仍足以抑制生長的範圍形成清晰區。較敏感的細菌可在較低濃度下受抑制，清晰區可能較大。','Antibiotic diffuses outward from the disc, usually decreasing in concentration with distance. A clear zone forms where growth is still inhibited. More susceptible bacteria may be inhibited at a lower concentration, allowing a larger zone.'],
 ['清晰區是沒有可見細菌生長的區域；不能證明全部細菌已死亡。清晰區大小亦受擴散及製備等因素影響，最大區不等於最佳患者治療。','A clear zone has no visible bacterial growth; it does not prove all bacteria died. Diffusion and preparation also affect size, so the largest zone is not the best patient treatment.'],
 ['MRSA 對甲氧西林有抗性，不代表對所有抗生素均有抗性。無區不等於本模型已作臨床抗藥判定；模型無臨床判定界線，不能推廣至所有 MRSA。','MRSA resists methicillin, not necessarily every antibiotic. No zone is not a clinical resistance classification: this model has no clinical breakpoints and cannot be generalised to all MRSA.'],
 ['若原有少量抗性細菌，抗生素的選擇壓力使它們較易存活、繁殖並遺傳抗性特徵。其比例可能上升，抗生素效果可能下降；不必完全佔據群體。','If a few resistant bacteria already exist, antibiotic selection pressure favours their survival, reproduction and inheritance of resistance traits. Their proportion may rise and effectiveness may decline without their occupying the entire population.'],
 ['細菌不是為了適應而主動產生需要的抗性，也不是患者本人產生抗性。不當或過度使用抗生素會增加不必要的選擇壓力。','Bacteria do not purposefully produce the resistance they need to adapt, and patients themselves do not develop bacterial resistance. Misuse or overuse adds unnecessary selection pressure.']
];
export const EXAMPLES={
 hypothesis:['示例：對細菌 T，比較樣本 P 與相同載體對照，提出「在其他條件相同時，P 紙碟的外圍清晰區總直徑大於載體對照」。這有比較條件及可量度結果，但不能由圈大小證明全部死亡。它不是 X/Y/Z 的預測。','Example: compare sample P with the same carrier control for bacterium T. “With other conditions equal, P has a larger external-zone total diameter than the carrier control.” This names a comparison and a measurable outcome, but cannot prove complete killing from zone size. It is not an X/Y/Z prediction.'],
 variables:['示例：若只改同一樣本的紙碟大小，獨立變量是紙碟大小；因變量是有無外圍圈及總直徑。要保留相同細菌、載體等條件。本次 X/Y/Z 的練習要按其實際改變因素分類。','Example: if only disc size changes for the same sample, disc size is independent; external-zone presence and total diameter are dependent. Keep bacteria and carrier alike. For the X/Y/Z task, classify the factor actually being changed.'],
 control:['C 只含相同載體，不含抗生素，用作比較基準。只有載體確為水時才稱水對照。留足紙碟間距及與邊緣的距離，避免區域重疊或難以判讀。','C contains the same carrier without antibiotic as a comparison baseline. Call it a water control only when the carrier is water. Space discs apart and away from the edge to avoid overlap and difficult interpretation.'],
 measurement:['示例 S（不是 X/Y/Z/C）：6 mm 紙碟外有清晰區。左端讀 12 mm、右端讀 28 mm；總直徑＝28−12＝16 mm，包括紙碟。若只有紙碟而沒有外圍圈，按本模型記 0，不記 6。','Example S (not X/Y/Z/C): an external zone surrounds a 6 mm disc. Its ends read 12 mm and 28 mm; total diameter = 28−12 = 16 mm, including the disc. With only a disc and no external zone, this model records 0, not 6.'],
 mean:['示例 S 的三塊獨立平板讀數是 12、16、20 mm：平均＝(12+16+20)÷3＝16.0 mm。重複可檢查變異；差異大時先查塗布、污染、紙碟位置及條件，不刪去不合假說的資料。三次是本課安排，不是唯一可靠次數。','Example S has 12, 16 and 20 mm from three independent plates: mean = (12+16+20)÷3 = 16.0 mm. Repeats check variation. First investigate spreading, contamination, disc positions and conditions, then consider additional independent tests. Never delete data for disagreeing with a hypothesis. Three is a classroom arrangement, not the only reliable number.']
};
export const PROCEDURE_CARDS=[
 ['P','三塊新平板都準備好後，以共同 30°C、24 小時模擬條件觀察。','Observe all three prepared new plates under shared simulated conditions of 30°C and 24 hours.'],
 ['Q','以無菌塗布器上下塗布並旋轉，使分布均勻。','Spread vertically with a sterile spreader and rotate for even distribution.'],
 ['R','在平板底部畫分格及標示 X/Y/Z/C。','Divide and label the plate bottom X/Y/Z/C.'],
 ['S','蓋好並倒置；在新的平板獨立重複相同準備。','Cover and invert; repeat the preparation independently on new plates.'],
 ['T','每夾一片紙碟前，以酒精燒杯及酒精燈消毒鑷子，再放到相應位置。','Before each disc, sterilise forceps with the alcohol beaker and lamp, then place it at the matching position.'],
 ['U','在正面中央加入已稀釋細菌懸液。','Release diluted bacterial suspension at the top centre.']
];
export const label=(key,language)=>language==='en'?glossEnglish(LABELS[key][1]):LABELS[key][0];
export const supported=(pair,language)=>language==='en'?glossEnglish(pair[1]):pair[0];
