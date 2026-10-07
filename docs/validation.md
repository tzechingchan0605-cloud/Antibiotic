# Validation record

Validation was performed in the actual cloud workspace on 7 October 2026 (Hong Kong time), using Node.js 24.19.0 and system Chromium 151 through Playwright. The frontend is a functioning local development application. Saving its reusable environment instructions is separate from publishing a site or a cloud environment snapshot.

Current validation result: **49 Node tests + all 16 browser cases passed**, including eight workflow cases, three staged-preparation cases, the isolated multi-browser collector case and four startup regression cases. The full browser run against `app.bundle.b2cfb2753363.js` passed in 1.8 minutes. A subsequent blank-label restoration fix was checked by rerunning all three staged cases against the final `app.bundle.1db572669172.js`; they passed in 40.1 seconds. The context revision was checked in Chinese, English and at 360 px: only the initial observation is required to continue, the two removed questions are absent from the interface and reports, and the four background facts appear in the learning review notes after submission.

The five numbered VL2 design panels and their answer controls are retained. Chinese and English context/design views were inspected, including 360 px widths. The supplied photo has plain label lines with horizontal label ends and no arrowheads, following the teacher’s annotated screenshot; the label reads 清晰區（沒有可見細菌生長的區域）. Current interface/report/rubric terms use 清晰區 and 菌落, and describe the same type of bacteria without the term 菌株. The control question now asks how to design a control group to investigate whether samples affect bacterial growth; its carrier explanation has been removed. The requested disclaimers, JSON download button and two extra hypothesis fields remain removed. Array-based variable answers preserve original snapshots and grade correctly, while legacy scalar answers remain readable.

## Executed checks

| Check | Outcome | Evidence |
| --- | --- | --- |
| Frozen installation, build and unit/integration tests | Passed | Frozen installation was verified earlier using `bash scripts/install.sh`. This revision completed `npm run build` and all 49 Node tests with zero failures/skips. |
| GitHub Pages startup and recovery | Passed | Reproduced the blank screen with historical HTML/JavaScript from different releases. A content-hashed bundle prevents stale unversioned assets from loading; old caption markup remains compatible. Four tests at the intercepted production HTTPS origin and `/Antibiotic/` path covered successful login/photo loading, cached markup, a missing script and a runtime failure. The reload control preserved saved records. |
| Supplied photograph and bilingual annotations | Passed | The uploaded 352 × 347 JPEG loads successfully with the current server’s `image/jpeg` response. Label endpoints were checked against the photograph; Chinese/English desktop and 360 px mobile views were reviewed with no page overflow. The desktop inquiry/PDF and mobile workflow tests passed after integration. |
| Student, teacher, mobile and PDF browser workflow | Passed | All 8 `workflow.spec.js` cases passed in the final full run. |
| Isolated cross-browser collection and dashboard export | Passed | The additional `cloud-browser.spec.js` case used independent desktop student, mobile student and teacher contexts with an intercepted Google-origin iframe. It verified true save acknowledgement, complete images, failed-save queue/retry, authenticated multi-page reads, fresh real XLSX download and prevention of partial-class export. No live Google request was made and the checked-in endpoint remained empty. |
| Original hypothesis/design/repeat snapshots and independent plate results | Passed | Unit tests and browser revisions retained first/latest answers, original proposal of 2 tests, actual 3 plates, and fixed results. |
| Staged preparation, spreading and disc placement | Passed | Browser and unit cases checked bottom markings, unique labels, loaded dropper and centre placement, vertical-only spreading with rotation, incomplete-coverage gates, correct labelled disc centres, covering/inversion, sequential unlock and independent fixed results. |
| Student measurements, arithmetic and graph behavior | Passed | No-zone 6 mm rule, reading revisions, own-data mean/graph checks, hover without recording, numeric/Enter traversal and wrong-but-complete answer progression tested. |
| Optional extension | Passed | Prediction/reason/fair-comparison gate, fixed results and original extension prediction retained across revisions. Unstarted extension does not block the main flow. |
| Language switching and accounts | Passed | Raw records/current/backup/queue snapshots remained equal across Chinese/English toggles; reload returned to blank Chinese login; separate inquiries remained for repeated emails. |
| Teacher demonstration | Passed | Demonstration produced no student record, queued snapshot or student telemetry. |
| Mobile controls | Passed | 360 px viewport had no unintended page overflow. Manual first-plate preparation, later automatic preparation, magnification, sample selection and table scrolling verified. |
| Real bilingual PDF output | Passed | Actual Chinese and English A4 PDFs generated in Chromium, original Chinese answers preserved, embedded CJK fonts and extracted text checked. Visual review included the shared science diagram. Active-time units were corrected and regression-checked. |
| Actual XLSX output | Passed | Workbook ZIP contents and round-trip images, six sheets, original/latest evidence, formulas, validation, conditional formatting and pending manual scores tested. Chinese contents identical across UI languages. Local/class filenames are distinct. |
| Cloud/backend isolated checks | Passed | 17 tests exercised local-first queue, offline/failure retry, correct save acknowledgements, version order/idempotency, strict message validation, teacher password and complete paging, Unicode-safe image chunks and checksum failures. |
| Corrupt local storage | Passed | Browser and unit checks retained damaged raw values and displayed a storage warning rather than overwriting them. |

## Remaining outside this validation

- Direct verification of the published `https://tzechingchan0605-cloud.github.io/Antibiotic/` site is blocked by this workspace’s network proxy (HTTP 403 / tunnel connection failure). The production-origin tests intercept requests and serve the checked-in static files; they do not claim that the live GitHub Pages deployment has completed.

- `CLOUD_ENDPOINT` is intentionally empty. A new owner-controlled Google spreadsheet and Apps Script `/exec` deployment must be configured, and the actual deployed Google sandbox-frame and cross-device collection verified. The isolated browser test uses an intercepted single Google-origin iframe; the real HtmlService nested-frame deployment remains unverified. Isolated service tests are not a Google deployment.
- A live website deployment and a new cloud environment snapshot are not verified by these checks. The reusable `install_script` and `start_skill` were saved as a configuration draft for environment settings review/publication.
- The 32-point rubric is a teaching/research draft; pilot feasibility, scoring calibration, inter-rater agreement and learning outcomes need researcher assessment.
- The five supplied scientific/history URLs returned proxy HTTP 403, so there is no claim of current live source verification. See the access record in `design-rationale.md`.
- Browser verification uses desktop Chromium and its mobile viewport/touch emulation, rather than a physical iPhone/Android device or a cross-browser Safari/Firefox study.

Screenshots and PDF artifacts under `artifacts/` use generated test identities and simulated data, not real student research records. The distributable ZIP includes the built static app, sources, tests, Google backend and deployment documentation.

## Original repeat-plan wording follow-up

Removed the yes/no repeat question from the interface, completion gate, reports and spreadsheet question columns. The count question now identifies X, Y, Z and the control; the reason question uses the requested wording. Neither answer field has the generic evidence placeholder. English wording is synchronized, and stored original counts/reasons are retained. Validation: build, all 39 Node tests and 3 targeted desktop/completion-gate/mobile browser cases passed.

## Teacher-annotated photo label routing

The three leader lines follow the teacher’s yellow routes in the latest screenshot: horizontal ends near the labels and direct diagonals toward the photographed features. Removed perimeter detours and moved the colony endpoint to the lower white colony (photo coordinates 141.4, 312.2). English explanatory text wraps clear of the leader line. The source photo remains unchanged. Build, bilingual visual review and the desktop inquiry/PDF plus 360 px mobile browser cases passed.

## History attribution, predictions and revised variables

Added the teacher-specified CBS News image-source link and the MRSA note below the 1928 historical paragraph. Updated the hypothesis builder to select individual or combined samples forming clear zones and the sample with the largest zone, including not applicable when no zone is predicted. The no-zone/not-applicable sentence, original/latest prediction export, agar-diffusion hint and bilingual reflection summary were checked. Chinese terminology now uses 瓊脂板 and 樣本. The seven factors follow the requested order with the repeated agar-composition item consolidated; the observation-conditions option was removed as confirmed by the teacher. Five control factors score 0.4 each; old six-control records retain their original grading. Build, all 40 Node tests and all 13 browser cases passed. Desktop Chinese/English and 360 px hypothesis views were visually reviewed, including source placement, link wrapping, no raw translation keys and no page overflow.

## Tool-based preparation and common incubation

Updated the phase-02 materials to match the procedure, including diluted bacterial suspension, four sterile forceps, nutrient-containing agar plates, a marker, dropper and incubator. Generated transparent triangular-loop spreader and open grooved-forceps illustrations appear in the materials, toolbar, cursor and operation animations. Desktop and 360 px materials/bench screenshots were inspected; neither viewport overflowed or raised a JavaScript error. Flip/cover controls sit directly beneath the plate, and the sidebar shows the current hint and eight numbered instructions.

The first plate requires manual preparation. Later plates unlock only after the preceding plate is covered and inverted; assisted spreading and optional automatic steps 1–5 are restricted to plates 2–3. No new result is generated during preparation. All three must be ready before the interface enables the 30°C and 24-hour settings and common incubation. Tests exercise incorrect placement, duplicate labels, premature actions, loaded-tool cursors, animations, the five-second reminder and prevention of duplicate pointer/click selection events. Choosing a blank label after a valid selection restores the saved label and displays a translated prompt; this regression was fixed and checked in the final staged run. Unit cases also retain original answers, separate plate seeds and legacy completed results. Final evidence: all 49 Node tests and all 16 browser cases passed, followed by the three-case staged regression run.
