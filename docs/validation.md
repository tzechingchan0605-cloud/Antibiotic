# Validation record

Validation was performed in the actual cloud workspace on 7 October 2026 (Hong Kong time), using Node.js 24.19.0 and system Chromium 151 through Playwright. The frontend is a functioning local development application. Saving its reusable environment instructions is separate from publishing a site or a cloud environment snapshot.

Validation result: **38 Node tests + all 9 browser cases passed**, including the eight workflow cases and the isolated multi-browser collector case. The context revision was checked in Chinese, English and at 360 px: only the initial observation is required to continue, the two removed questions are absent from the interface and reports, and the four background facts appear in the learning review notes after submission.

## Executed checks

| Check | Outcome | Evidence |
| --- | --- | --- |
| Frozen installation, build and unit/integration tests | Passed | `bash scripts/install.sh` completed `npm ci`, esbuild and all 38 Node tests with zero failures/skips. |
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
| Corrupt local storage | Passed | Browser and unit checks retained damaged raw values and displayed a backup warning rather than overwriting them. |

## Remaining outside this validation

- The supplied photograph is visible in chat but its original PNG/JPG is not present in the workspace. The bilingual annotation overlay is prepared; the checked-in application uses the historical illustration with an illustration caption until the original image asset is available.

- `CLOUD_ENDPOINT` is intentionally empty. A new owner-controlled Google spreadsheet and Apps Script `/exec` deployment must be configured, and the actual deployed Google sandbox-frame and cross-device collection verified. The isolated browser test uses an intercepted single Google-origin iframe; the real HtmlService nested-frame deployment remains unverified. Isolated service tests are not a Google deployment.
- The public website and a new cloud environment snapshot have not been published by these commands. The reusable `install_script` and `start_skill` were saved as a configuration draft for environment settings review/publication.
- The 32-point rubric is a teaching/research draft; pilot feasibility, scoring calibration, inter-rater agreement and learning outcomes need researcher assessment.
- The five supplied scientific/history URLs returned proxy HTTP 403, so there is no claim of current live source verification. See the access record in `design-rationale.md`.
- Browser verification uses desktop Chromium and its mobile viewport/touch emulation, rather than a physical iPhone/Android device or a cross-browser Safari/Firefox study.

Screenshots and PDF artifacts under `artifacts/` use generated test identities and simulated data, not real student research records. The distributable ZIP includes the built static app, sources, tests, Google backend and deployment documentation.
