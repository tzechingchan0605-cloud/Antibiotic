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

The static server uses port 4173; set `PORT` to choose another port. Open the server with your hosting platform's normal browser access. In this cloud workspace, `bash scripts/install.sh` uses the shared writable `/workspace/.npm-cache`. The prepared ZIP already includes `app.bundle.js`; it can also be served with `python3 -m http.server 4173` without installing Node. Serve over HTTP(S), rather than double-clicking `index.html`.

For static hosting, deploy `index.html`, `styles.css`, the `assets/` folder and the built `app.bundle.js`. The repository includes the prebuilt bundle. When changing the cloud endpoint or any JavaScript source, run `npm run build`, commit the updated bundle and republish it. Filesystem setup and a running local server do not publish the site.

## Student workflow

1. **了解情境 / Context:** wound-infection research scenario, a brief MRSA terminology note and a labelled historical illustration. Students record their initial observations; this phase has no inference or comparison question. The four background facts appear in the learning review notes after submission. Fleming’s historical work involved staphylococci, not MRSA. The teacher’s photograph awaits the original PNG/JPG file; the bilingual photo overlay is prepared in `history-figure.js`, with `HISTORY_PHOTO_URL` left blank so the current illustration remains visible.
2. **設計探究 / Design:** testable predictions, variable classification, assumptions, carrier-only control, drawing/image/written setup and a positive-integer original repeat proposal. Original answers and the original design image are captured once before the first experiment. Wrong but complete answers do not block inquiry.
3. **虛擬實驗 / Experiment:** label a plate, add simulated bacteria, spread through pointer interaction, rotate the plate using its curved handle or arrow keys, place coded discs, observe a fixed result and measure it using a movable ruler. Assisted spreading and placement are available to keyboard/touch users. Magnification helps read the ruler on phones. Three independently identified plates have separate seeds, operations, outcomes and measurements. Plates 2–3 can be prepared manually or by repeating standardised preparation on new plates.
4. **分析與結論 / Analysis:** enter your own three-reading means, create a categorical bar chart by pointer or precise values, analyse control/repeat evidence and inference limits, and write a conclusion. Pointer hover shows coordinates without recording an answer. An optional disc-content extension requires prediction and fair comparison before showing results.
5. **Submission and reflection:** confirmation locks inquiry answers, reveals learning points and asks students to revisit their original ideas. Reflection submission is a second lock and enables the bilingual print/save-as-PDF report. Student reports never display scores.

The initial trial target is 45–55 minutes, excluding optional extension. See [design rationale](docs/design-rationale.md) for the proposed teaching sequence and candidate English glossary terms. English terminology has no unapproved Chinese parenthetical additions.

## Scientific model and measurement rules

- All preparation and growth are virtual teaching representations. The project provides no real MRSA culture conditions, incubation durations, inoculum quantities or clinical laboratory protocol. The spreading interaction simplifies lawn preparation; it does not reproduce a clinical procedure.
- Coded samples remain X/Y/Z. No real antibiotic identity, concentration, patient dose or clinical susceptibility breakpoint is assigned. The model has small stable plate-to-plate differences; it is not clinically calibrated.
- X and Z produce different visible zones in this particular model; Y and the carrier control have no zone outside the disc. These outcomes are withheld in the student interface until a plate reaches its observation endpoint. Client-side code is inspectable; this is not a secure examination system.
- A 6 mm disc is drawn using 2 SVG units per mm. The **total zone diameter includes the disc**, measured through its centre. No external visible zone is recorded categorically as “no” and numerically as **6 mm**, rather than 0. Users enter their own readings; the program does not replace them with model answers.
- Reading tolerance is ±1 mm. Input precision is at most one decimal place. Means are checked within ±0.1 mm of the student's own readings; bars within ±0.5 mm of the student's own entered means. These separate checks avoid repeatedly penalising one reading error.
- A clear region supports inhibited **visible growth**, not proof of death, mechanism, the best treatment or a claim about all MRSA. Different diffusion and disc preparation can affect zones. Three repeats help examine consistency but do not guarantee reliability or form a universal best number.

## Records, accounts and language

`VL_BIO_ANTIBIOTICS` records use independent `vl4.antibiotics.*` keys. Each student login creates a unique inquiry ID; repeated use of one email does not merge inquiries. Original/latest answers, original replicate proposal, actual plate count, images, fixed results, first/latest readings, revisions, graph, reflection and phase-specific active time are retained. Background-tab time is excluded. Language switching translates the view without changing IDs, options, answers, drawings, results, versions, events or synchronization queues. Student free text remains in its original language.

Phase timing values are stored in seconds. Account changes discard tools/animations/current form state and clear in-memory teacher credentials. Async image and class-read callbacks are guarded against account changes. Browser-native leave confirmation is requested for student work; browser/device rules may prevent it from appearing. Corrupt local storage is preserved and reported instead of being silently overwritten. Use the JSON backup button before clearing site data.

Legacy imports accept compatible **VL4** module records. VL2 transpiration data and teacher/demo records are rejected. Local records can be exported independently, clearly labelled as this device's records. They are not presented as the whole class.

## Teacher workflow and assessment

The supplied teacher email opens the dashboard only. Access to cloud class records additionally requires a password validated by the backend on every page of the read. Teacher demonstrations have a complete student workflow and PDF capability but are excluded from student persistence, telemetry, synchronization, exports and scoring.

Class export reloads all cloud pages first. A failed read blocks class export rather than substituting partial/local records. Genuine `.xlsx` files always use Traditional Chinese and include six worksheets: student answers; readings/calculations/charts; teacher scoring; rubric; operation events; design images. Images, original/latest evidence, formulas, validation, category colours, frozen headings and filters are included.

The draft rubric totals **24 SPS + 8 knowledge = 32 points**. Required manual scores remain blank/待評 until assessed; entering 0 is different from leaving a blank. The total is gated by all required manual scores and reflection submission. Hypothesis outcome, choosing three repeats, operation speed/count, time and completion are not automatic ability scores. The rubric requires trial teaching and cross-module calibration; see [rubric](docs/rubric.md).

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
