# Validation record

Validation was performed in the actual cloud workspace on 7 October 2026 (Hong Kong time), using Node.js 24.19.0 and system Chromium 151 through Playwright. The frontend is a functioning local development application. Saving its reusable environment instructions is separate from publishing a site or a cloud environment snapshot.

Validation result: **39 Node tests + all 13 browser cases passed**, including eight workflow cases, the isolated multi-browser collector case and four startup regression cases. The complete browser run passed in 33.7 seconds. The context revision was checked in Chinese, English and at 360 px: only the initial observation is required to continue, the two removed questions are absent from the interface and reports, and the four background facts appear in the learning review notes after submission.

The latest revision adopts the five numbered VL2 design panels and their answer controls. Chinese and English context/design views were inspected, including 360 px widths. The supplied photo has plain label lines with horizontal label ends and no arrowheads, following the teacher’s latest annotated screenshot; the label now reads 清晰區（沒有可見細菌生長的區域）. Current interface/report/rubric terms use 清晰區 and 菌落, and describe the same type of bacteria without the term 菌株. A carrier explanation is shown beneath the control question. The requested disclaimers, JSON download button and two extra hypothesis fields are removed. Array-based variable answers preserve original snapshots and grade correctly, while legacy scalar answers remain readable.

## Executed checks

| Check | Outcome | Evidence |
| --- | --- | --- |
| Frozen installation, build and unit/integration tests | Passed | Frozen installation was verified earlier using `bash scripts/install.sh`. This revision completed `npm run build` and all 39 Node tests with zero failures/skips. |
| GitHub Pages startup and recovery | Passed | Reproduced the blank screen with historical HTML/JavaScript from different releases. A content-hashed bundle prevents stale unversioned assets from loading; old caption markup remains compatible. Four tests at the intercepted production HTTPS origin and `/Antibiotic/` path covered successful login/photo loading, cached markup, a missing script and a runtime failure. The reload control preserved saved records. |
| Supplied photograph and bilingual annotations | Passed | The uploaded 352 × 347 JPEG loads successfully with the current server’s `image/jpeg` response. Label endpoints were checked against the photograph; Chinese/English desktop and 360 px mobile views were reviewed with no page overflow. The desktop inquiry/PDF and mobile workflow tests passed after integration. |
| Student, teacher, mobile and PDF browser workflow | Passed | All 8 `workflow.spec.js` cases passed in the final full run. |
| Isolated cross-browser collection and dashboard export | Passed | The additional `cloud-browser.spec.js` case used independent desktop student, mobile student and teacher contexts with an intercepted Google-origin iframe. It verified true save acknowledgement, complete images, failed-save queue/retry, authenticated multi-page reads, fresh real XLSX download and prevention of partial-class export. No live Google request was made and the checked-in endpoint remained empty. |
| Original hypothesis/design/repeat snapshots and independent plate results | Passed | Unit tests and browser revisions retained first/latest answers, original proposal of 2 tests, actual 3 plates, and fixed results. |
| Manual pointer spreading, rotation and disc positions | Passed | Browser pointer test checked equivalent local coverage after rotating, incomplete-coverage gate, independent positioning and result stability. |
| Student measurements, arithmetic and graph behavior | Passed | No-zone 6 mm rule, reading revisions, own-data mean/graph checks, hover without recording, numeric/Enter traversal and wrong-but-complete answer progression tested. |
| Optional extension | Passed | Prediction/reason/fair-comparison gate, fixed results and original extension prediction retained across revisions. Unstarted extension does not block the main flow. |
| Language switching and accounts | Passed | Raw records/current/backup/queue snapshots remained equal across Chinese/English toggles; reload returned to blank Chinese login; separate inquiries remained for repeated emails. |
| Teacher demonstration | Passed | Demonstration produced no student record, queued snapshot or student telemetry. |
| Mobile controls | Passed | 360 px viewport had no unintended page overflow. Assisted operation, magnification, sample selection and table scrolling verified. |
| Real bilingual PDF output | Passed | Actual Chinese and English A4 PDFs generated in Chromium, original Chinese answers preserved, embedded CJK fonts and extracted text checked. Visual review included the shared science diagram. Active-time units were corrected and regression-checked. |
| Actual XLSX output | Passed | Workbook ZIP contents and round-trip images, six sheets, original/latest evidence, formulas, validation, conditional formatting and pending manual scores tested. Chinese contents identical across UI languages. Local/class filenames are distinct. |
| Cloud/backend isolated checks | Passed | 17 tests exercised local-first queue, offline/failure retry, correct save acknowledgements, version order/idempotency, strict message validation, teacher password and complete paging, Unicode-safe image chunks and checksum failures. |
| Corrupt local storage | Passed | Browser and unit checks retained damaged raw values and displayed a storage warning rather than overwriting them. |

## Remaining outside this validation

- Direct verification of the published `https://tzechingchan0605-cloud.github.io/Antibiotic/` site is blocked by this workspace’s network proxy (HTTP 403 / tunnel connection failure). The production-origin tests intercept requests and serve the checked-in static files; they do not claim that the live GitHub Pages deployment has completed.

- `CLOUD_ENDPOINT` is intentionally empty. A new owner-controlled Google spreadsheet and Apps Script `/exec` deployment must be configured, and the actual deployed Google sandbox-frame and cross-device collection verified. The isolated browser test uses an intercepted single Google-origin iframe; the real HtmlService nested-frame deployment remains unverified. Isolated service tests are not a Google deployment.
- The public website and a new cloud environment snapshot have not been published by these commands. The reusable `install_script` and `start_skill` were saved as a configuration draft for environment settings review/publication.
- The 32-point rubric is a teaching/research draft; pilot feasibility, scoring calibration, inter-rater agreement and learning outcomes need researcher assessment.
- The five supplied scientific/history URLs returned proxy HTTP 403, so there is no claim of current live source verification. See the access record in `design-rationale.md`.
- Browser verification uses desktop Chromium and its mobile viewport/touch emulation, rather than a physical iPhone/Android device or a cross-browser Safari/Firefox study.

Screenshots and PDF artifacts under `artifacts/` use generated test identities and simulated data, not real student research records. The distributable ZIP includes the built static app, sources, tests, Google backend and deployment documentation.

## Original repeat-plan wording follow-up

Removed the yes/no repeat question from the interface, completion gate, reports and spreadsheet question columns. The count question now identifies X, Y, Z and the control; the reason question uses the requested wording. Neither answer field has the generic evidence placeholder. English wording is synchronized, and stored original counts/reasons are retained. Validation: build, all 39 Node tests and 3 targeted desktop/completion-gate/mobile browser cases passed.

## Teacher-annotated photo label routing

The three leader lines follow the teacher’s yellow routes in the latest screenshot: horizontal ends near the labels and direct diagonals toward the photographed features. Removed perimeter detours and moved the colony endpoint to the lower white colony (photo coordinates 141.4, 312.2). English explanatory text wraps clear of the leader line. The source photo remains unchanged. Build, bilingual visual review and the desktop inquiry/PDF plus 360 px mobile browser cases passed.
