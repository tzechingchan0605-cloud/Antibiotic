# VL4 · 抗生素研究任務 / Antibiotic investigation

Independent, working bilingual inquiry laboratory based on the supplied VL4 brief and VL2 interface reference. The research proposal informs the scaffolding and assessment; it does not prescribe expected research outcomes. No VL2 source, storage keys, student records or production collection endpoint is changed or reused.

繁體中文預設；右上角可自由切換 English。每次重新載入均返回空白中文登入，原有紀錄及待同步資料保留。

## Run

Requires Node.js 20+ and npm. This cloud workspace has Node.js 24 and system Chromium.

```sh
npm ci --cache .npm-cache --no-audit --no-fund
npm run build
npm start
```

The static server uses port 4173; set `PORT` to choose another port. Open the server with your hosting platform's normal browser access. In this cloud workspace, `bash scripts/install.sh` uses the shared writable `/workspace/.npm-cache`. The built static files can also be served with `python3 -m http.server 4173` without installing Node. Serve over HTTP(S), rather than double-clicking `index.html`.

For static hosting, deploy `index.html`, `styles.css`, `bench.css`, the `assets/` folder and the `app.bundle*.js` files. The repository includes prebuilt files. `npm run build` writes a bundle with a content hash in its filename and updates the matching import in `index.html`; this prevents cached JavaScript from being paired with newer page markup. It also versions the stylesheet URLs from their contents so changed button positions and tool orientations load with the new page. When changing the cloud endpoint or any JavaScript/CSS source, rebuild and commit the updated HTML, versioned bundle, compatibility bundle and source map together. Keep previously published versioned bundles available for cached HTML. `.nojekyll` serves the project as static files on GitHub Pages. If startup fails, the page displays a reload button without clearing saved records. Filesystem setup and a running local server do not publish the site.

## Student workflow

1. **了解情境 / Context:** wound-infection research scenario, a brief MRSA terminology note and the teacher-supplied plate photograph with bilingual labels. Students record their initial observations; this phase has no inference or comparison question. Background concepts appear in the learning points after submission. Fleming’s historical work involved staphylococci, not MRSA. The original photograph is used unchanged; `history-figure.js` places translated labels and a colony definition around it. Include `assets/` when publishing the static site.
2. **設計探究 / Design:** Five numbered VL2-style panels use two inline prediction selectors (samples forming clear zones, then the largest zone with a not-applicable option), seven ordered variable buttons, assumption checkboxes, a written control answer and a drawing/photo/written setup. An agar-diffusion hint supports the reason field. The control prompt asks how to design a control group to investigate whether the samples affect bacterial growth. The original repeat proposal offers 1–20 tests per sample and asks for a reason. Original answers and the original design image are captured once before the first experiment, independently of the shared three-plate classroom arrangement. Wrong but complete answers do not block inquiry.
3. **虛擬實驗 / Experiment:** manually prepare plate 1 by flipping it to label its bottom, collecting diluted suspension with the dropper, spreading vertically while rotating the plate, using the alcohol beaker and lamp before picking up each disc with forceps and placing it in its matching labelled area, and covering and inverting it. Plate 2 unlocks after plate 1 is ready; plate 3 unlocks after plate 2 is ready. Plates 2–3 allow optional automatic preparation or assisted spreading. All three plates must be ready before selecting the virtual 30°C and 24-hour settings and incubating them together. The results then become available for measurement with a movable ruler, with magnification for phones. The ruler controls move above the procedure after incubation. Dragging near a clear-zone diameter attracts the ruler into alignment; small movements retain horizontal alignment and allow vertical adjustment, while a larger pull releases it for the next zone. This never fills in a reading. After confirming readings, the page returns to the plate buttons only if another plate still needs confirmed readings. Each plate retains its own seed, operations, fixed outcome and readings. A toolbar beneath the plate provides tool selection, a tool cursor and operation animations. The numbered procedure highlights the current step; a reminder arrow appears after five seconds without progress.
4. **分析與結論 / Analysis:** enter your own three-reading means, answer five multiple-choice questions about clear zones, diameter, independent repeats, variable results and C (control), and select the effective samples and their order in a structured conclusion. The third and fourth ranking positions offer “Not applicable”. Complete answers can be submitted even when incorrect; no chart or extension is required.
5. **Submission and reflection:** confirmation locks inquiry answers, reveals an enlarged learning-points heading with the revised antibiotic-diffusion diagram and notes about zone-size differences, treatment choice, antibiotic overuse/misuse and selection of resistant bacteria, and asks students to revisit their original ideas. Reflection submission is a second lock and enables the bilingual print/save-as-PDF report. Student reports never display scores.

The initial trial target is 45–55 minutes (to be reassessed with the revised analysis questions). See [design rationale](docs/design-rationale.md) for the proposed teaching sequence and candidate English glossary terms. English terminology has no unapproved Chinese parenthetical additions.

The design-phase materials match the virtual procedure: three nutrient-containing agar plates; one marker, dropper, diluted bacterial suspension and sterile spreader; four forceps, a beaker of alcohol and an alcohol lamp; three X/Y/Z/C disc sets; one incubator and ruler. C is labelled as the control. The agar plate illustration shows its sidewall and depth. The spreader and forceps use mint/teal cartoon illustrations based on the teacher's reference photographs; the forceps opening faces the lower left. See [asset notes](assets/README.md).

## Scientific model and measurement rules

- All preparation and growth are virtual teaching representations. Students choose the requested virtual 30°C and 24-hour settings; a short animation represents this interval. The model assigns no physical inoculum quantities, antibiotic concentrations or clinical laboratory protocol. Its growth results are generated from fixed plate seeds, rather than calculated from real bacterial growth rates. The spreading interaction simplifies lawn preparation.
- Coded samples remain X/Y/Z. No real antibiotic identity, concentration, patient dose or clinical susceptibility breakpoint is assigned. The model has small stable plate-to-plate differences; it is not clinically calibrated.
- X and Z produce different visible zones in this particular model; Y and the carrier control have no zone outside the disc. These outcomes are withheld in the student interface until all three plates have completed the common virtual incubation. Client-side code is inspectable; this is not a secure examination system.
- A 6 mm disc is drawn using 2 SVG units per mm. The **total zone diameter includes the disc**, measured through its centre. No external visible zone is recorded categorically as “no” and numerically as **0 mm**. Users enter their own readings; the program does not replace them with model answers.
- Visible-zone reading tolerance is ±1 mm; no-zone readings must be exactly 0. Reading inputs accept at most one decimal place. Pressing Enter in a mean field rounds and formats the entered value to one decimal place, preserving the formatted value in the record. Means are checked within ±0.1 mm of the student's own readings. Arithmetic is checked against the student’s own readings to avoid penalising a reading error again.
- A clear region supports inhibited **visible growth**, not proof of death, mechanism, the best treatment or a claim about all MRSA. Different diffusion and disc preparation can affect zones. Three repeats help examine consistency but do not guarantee reliability or form a universal best number.

## Records, accounts and language

`VL_BIO_ANTIBIOTICS` records use independent `vl4.antibiotics.*` keys. Each student login creates a unique inquiry ID; repeated use of one email does not merge inquiries. Original/latest answers, original replicate proposal, actual plate count, images, plate orientation and labels, preparation operations, virtual incubation settings, fixed results, first/latest readings, revisions, MC choices, selected conclusion, reflection and phase-specific active time are retained. Compatible older VL4 plate records retain their saved results when upgraded to the new preparation workflow. Background-tab time is excluded. Language switching translates the view without changing IDs, options, answers, drawings, results, versions, events or synchronization queues. Student free text remains in its original language.

Phase timing values are stored in seconds. Account changes discard tools/animations/current form state and clear in-memory teacher credentials. Async image and class-read callbacks are guarded against account changes. Browser-native leave confirmation is requested for student work; browser/device rules may prevent it from appearing. Corrupt local storage is preserved and reported instead of being silently overwritten. Retain site data until a cloud save or teacher export has been confirmed.

Legacy imports accept compatible **VL4** module records. VL2 transpiration data and teacher/demo records are rejected. Local records can be exported independently, clearly labelled as this device's records. They are not presented as the whole class.

## Teacher workflow and assessment

The supplied teacher email opens the dashboard only. Access to cloud class records additionally requires a password validated by the backend on every page of the read. Teacher demonstrations have a complete student workflow and PDF capability but are excluded from student persistence, telemetry, synchronization, exports and scoring.

Class export reloads all cloud pages first. A failed read blocks class export rather than substituting partial/local records. Genuine `.xlsx` files always use Traditional Chinese and include six worksheets for current records: student answers; readings/calculations; teacher scoring; rubric; operation events; design images. Mixed legacy/current exports add a separate current scoring sheet and retain legacy chart and question evidence. Images, original/latest evidence, formulas, validation, category colours, frozen headings and filters are included.

The revised draft rubric totals **23 points**, with five MC questions at 1 point each and seven manual marking cells. Removed chart and question tasks no longer contribute to the current score. Legacy records retain their original **32-point** rubric; totals from the two versions are not directly comparable. Required manual scores remain blank/待評 until assessed; entering 0 is different from leaving a blank. The total is gated by all required manual scores and reflection submission. Hypothesis outcome, choosing three repeats, operation speed/count, time and completion are not automatic ability scores. The rubric requires trial teaching and cross-module calibration; see [rubric](docs/rubric.md).

## Google collection backend

**The frontend currently has no Google collection endpoint.** It saves locally and retains the retry queue; it does not claim cloud synchronization. Frontend bridge/sync modules and a separate Apps Script backend are supplied and tested with isolated service substitutes. There were no requests to a live student collection endpoint.

Follow the [Chinese/English deployment instructions](docs/cloud-setup.md). Create a new VL4 spreadsheet and Apps Script deployment, privately set `SPREADSHEET_ID`, `SETUP_TEACHER_PASSWORD` and exact `ALLOWED_APP_ORIGINS`, run initialization, and put the new `/exec` URL in `cloud-config.js`. Never send the teacher password in chat or put it in frontend code. **Real Google deployment, sandbox-frame behavior and cross-device collection remain to be verified after the owner supplies the new endpoint.**

## Tests and evidence

```sh
npm test
npm run test:browser
```

Browser tests use system Chromium at `/usr/bin/chromium`, or the `CHROMIUM_PATH` override. They prepare complete inquiries through the actual interface, exercise student/teacher/mobile state and generate actual bilingual A4 PDFs. Backend tests use isolated Apps Script/service substitutes for credentials, paging, full-image storage, duplicate/older writes, failures and acknowledgements. XLSX tests inspect actual ZIP contents and round-trip worksheet formulas/images rather than accepting a renamed text file.

See [validation record](docs/validation.md) for the executed results and practical limitations. Test-generated learner identities and data are fixtures, not actual student research data.

The five supplied scientific/history references could not be accessed through the current proxy (HTTP 403). Their exact URLs and access results are documented in [design rationale](docs/design-rationale.md); this delivery does not claim live verification of those pages.
