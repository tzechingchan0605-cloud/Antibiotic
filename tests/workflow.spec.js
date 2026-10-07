import { test, expect } from '@playwright/test';
import { mkdir, stat } from 'node:fs/promises';

const RECORDS = 'vl4.antibiotics.records.v1';
const CURRENT = 'vl4.antibiotics.current.v1';
const DATA_KEYS = [RECORDS, CURRENT, 'vl4.antibiotics.cloud.queue.v1',
  'vl4.antibiotics.cloud.backups.v1', 'vl4.antibiotics.cloud.confirmations.v1'];
const SAMPLES = ['X', 'Y', 'Z', 'C'];
const PROFILE = { name: '陳小明', className: 'S4X1-05', email: 'student@school.edu.hk' };

test.beforeAll(async () => { await mkdir('artifacts', { recursive: true }); });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function login(page, profile = PROFILE) {
  await expect(page.locator('#loginDialog')).toBeVisible();
  await page.locator('#profileName').fill(profile.name);
  await page.locator('#profileClass').fill(profile.className);
  await page.locator('#profileEmail').fill(profile.email);
  await page.locator('#loginForm button[type="submit"]').click();
}

async function current(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), CURRENT);
}

async function records(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), RECORDS);
}

async function storageSnapshot(page) {
  return page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), DATA_KEYS);
}

async function assertNoOverflow(page) {
  const sizes = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
}

async function screenshot(page, path) {
  // A clicked control may be recreated by rendering; omit incidental focus rings
  // from review screenshots without changing focus behavior in the application.
  await page.evaluate(() => document.activeElement?.blur());
  await page.screenshot({ path, fullPage: true });
}

async function planInvestigation(page, { wrongAnswers = false } = {}) {
  await expect(page.locator('#phase-1')).toBeVisible();
  await expect(page.getByLabel('你的初步觀察', { exact: true })).toBeVisible();
  await expect(page.locator('#inference, #comparison, #backgroundCards')).toHaveCount(0);
  await expect(page.locator('#historyFigure')).toContainText('清晰區');
  await expect(page.locator('#historyFigure')).toContainText('（沒有可見細菌生長的區域）');
  await expect(page.locator('#historyFigure marker, #historyFigure [marker-end]')).toHaveCount(0);
  const leaders = await page.locator('#historyFigure .history-label-lines path').evaluateAll(paths => paths.map(path => path.getAttribute('d')));
  expect(leaders).toHaveLength(3);
  for (const path of leaders) expect(path).toMatch(/^M[\d.]+ [\d.]+H[\d.]+/);
  await page.locator('#observation').fill('黴菌附近少或沒有可見細菌菌落。');
  await page.locator('#orientationNext').click();
  await expect(page.locator('#phase-2')).toBeVisible();
  await expect(page.locator('#phase-2 .design-stack > .card .card-kicker')).toHaveText([
    '01 · 假說建立器', '02 · 公平測試', '03 · 實驗前提', '04 · 對照組設計', '05 · 實驗裝置設計'
  ]);
  await expect(page.locator('#controlPrediction, #otherHypothesis, #backupRecords')).toHaveCount(0);
  await page.locator('#prediction').selectOption('X_Z');
  await page.locator('#largestPrediction').selectOption('na');
  await expect(page.locator('#largestNASuffix')).toBeVisible();
  await expect(page.locator('#largestSuffix')).toBeHidden();
  await page.locator('#largestPrediction').selectOption('Z');
  await expect(page.locator('#largestSuffix')).toBeVisible();
  await page.locator('#reason').fill('不同樣本可能抑制這株細菌的可見生長，需要比較才知道。');
  await page.locator('[data-group="iv"][data-variable="sample"]').click();
  await page.locator('[data-group="dv"][data-variable="zone"]').click();
  for (const value of ['disc', 'medium', 'strain', 'distribution', 'preparation']) {
    await page.locator(`[data-group="cv"][data-variable="${value}"]`).click();
  }
  for (const value of ['distribution', 'sterile', 'sameConditions']) {
    await page.locator(`[data-multi="assumptions"][value="${value}"]`).check();
  }
  await page.locator('#controlPlan').fill('相同紙碟載體但不含抗生素，保持相同種類的細菌、培養基及觀察條件。');
  await page.locator('#designDescription').fill('X、Y、Z 及空白對照分別放於四個象限，遠離邊緣並保持間距；每片平板相同。');
  await page.locator('#saveDesign').click();
  await expect(page.locator('#designStatus')).not.toBeEmpty();
  await expect(page.locator('#repeatChoice')).toHaveCount(0);
  await expect(page.locator('#plannedReplicates')).not.toHaveAttribute('placeholder');
  await expect(page.locator('#plannedReplicateReason')).not.toHaveAttribute('placeholder');
  await page.locator('#plannedReplicates').fill('2');
  await page.locator('#plannedReplicateReason').fill('用兩片新平板初步比較一致性，同一圈重讀不算獨立重複。');
  if (wrongAnswers) {
    await page.locator('#prediction').selectOption('none');
    await page.locator('#largestPrediction').selectOption('na');
    await page.locator('[data-group="iv"][data-variable="sample"]').click();
    await page.locator('[data-group="iv"][data-variable="zone"]').click();
    await page.locator('[data-group="dv"][data-variable="zone"]').click();
    await page.locator('[data-group="dv"][data-variable="strain"]').click();
    for (const value of ['disc', 'medium', 'strain', 'distribution', 'preparation']) {
      await page.locator(`[data-group="cv"][data-variable="${value}"]`).click();
    }
    await page.locator('[data-group="cv"][data-variable="zone"]').click();
    for (const value of ['distribution', 'sterile', 'sameConditions']) {
      await page.locator(`[data-multi="assumptions"][value="${value}"]`).uncheck();
    }
    await page.locator('[data-multi="assumptions"][value="death"]').check();
  }
  await page.locator('#designNext').click();
  await expect(page.locator('#phase-3')).toBeVisible();
}

async function preparePlate(page, index) {
  await page.locator(`[data-plate="${index}"]`).click();
  if (index === 0) {
    await page.locator('#addBacteria').click();
    await page.locator('#assistSpread').click();
    await page.locator('#assistDiscs').click();
  } else {
    await page.locator('#standardRepeat').click();
  }
  await page.locator('#incubate').click();
  await expect.poll(async () => (await current(page))?.plates[index]?.completed,
    { timeout: 15000 }).toBe(true);
  const plate = (await current(page)).plates[index];
  await expect(page.locator('#measurementRows input[data-reading="X"]')).toBeEnabled();
  for (const sample of SAMPLES) {
    await page.locator(`#measurementRows [data-visible="${sample}"]`).selectOption(
      ['X', 'Z'].includes(sample) ? 'yes' : 'no');
    await page.locator(`#measurementRows [data-reading="${sample}"]`).fill(
      Number(plate.result[sample]).toFixed(1));
  }
  await page.locator('#confirmReadings').click();
  await expect.poll(async () => {
    const state = await current(page);
    return SAMPLES.every(sample => Boolean(state?.measurements[plate.id]?.[sample]?.confirmedAt));
  }).toBe(true);
  return plate.result;
}

async function analyseInvestigation(page, { beforeSubmit } = {}) {
  await page.locator('#experimentNext').click();
  await expect(page.locator('#phase-4')).toBeVisible();
  const state = await current(page);
  for (const sample of SAMPLES) {
    const mean = (state.plates.reduce((sum, plate) =>
      sum + Number(state.measurements[plate.id][sample].value), 0) / 3).toFixed(1);
    await page.locator(`[data-mean="${sample}"]`).fill(mean);
    await page.locator(`[data-bar="${sample}"]`).fill(mean);
  }
  await page.locator('#confirmGraph').click();
  await expect(page.locator('#graphStatus')).not.toBeEmpty();
  const explanations = {
    analysisControl: '空白對照三次均沒有紙碟外可見圈，總直徑為紙碟的 6 mm，可排除載體影響。',
    analysisConsistent: 'X 與 Z 三次均有外圍可見圈；Y 及空白對照均沒有。',
    analysisVariation: '三片平板的數值稍有變化，但 X、Z 的可見圈趨勢一致，對照仍為 6 mm。',
    analysisMethod: '先檢查細菌分布、污染、紙碟位置、製備及共同觀察條件，再考慮增加新平板。',
    analysisHypothesis: '部分樣本有可見清晰區，與對照不同，支持我的可測試預測。',
    analysisRepeatPlan: '我原定兩次，活動實做三次；多一片可檢查一致性，但三次不保證可靠。',
    analysisRepeatValue: '新平板提供獨立結果，能看到變異；同一圈反覆讀數不算獨立重複。',
    conclusion: '在本模型條件下，三片獨立平板的 X、Z 有可見圈，Y 與載體對照沒有，支持局部可見生長受抑制；不能確定細菌全部死亡、作用機制、臨床最佳治療或所有 MRSA 的反應。',
  };
  for (const [id, value] of Object.entries(explanations)) await page.locator('#' + id).fill(value);
  await page.locator('#analysisDeath').selectOption('cannot');
  await page.locator('#analysisClinical').selectOption('cannot');
  await page.locator('#knowledgeBacteria').selectOption('bacteria');
  await page.locator('#knowledgeResistance').selectOption('bacteria');
  await page.locator('#knowledgeLimits').selectOption('limited');
  if (beforeSubmit) await beforeSubmit();
  await page.locator('#submitInquiry').click();
  await expect(page.locator('#submitDialog')).toBeVisible();
  await page.locator('#confirmSubmit').click();
  await expect(page.locator('#learningSection')).toBeVisible();
  await expect(page.locator('#learningContent')).toContainText('學習重溫備註');
  await expect(page.locator('#learningContent')).toContainText('單個細菌通常不能直接看見');
}

test('student completes an evidence-based inquiry, preserves language-independent data, and exports bilingual PDFs', async ({ page }) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant-HK');
  await login(page);
  await screenshot(page, 'artifacts/vl4-desktop-context.png');
  await planInvestigation(page);
  const first = await preparePlate(page, 0);

  // Revisions must retain the first reading and keep the generated observation fixed.
  await page.locator('[data-reading="X"]').fill((first.X + 0.3).toFixed(1));
  await page.locator('#confirmReadings').click();
  let saved = await current(page);
  expect(saved.measurements['plate-1'].X.first.value).toBe(first.X.toFixed(1));
  expect(saved.measurements['plate-1'].X.value).toBe((first.X + 0.3).toFixed(1));
  expect(saved.measurements['plate-1'].X.revisions).toHaveLength(1);
  expect(saved.plates[0].result).toEqual(first);

  // Settle answer debouncing; switching the interface must not record a student edit.
  await page.waitForTimeout(500);
  const beforeLanguage = await storageSnapshot(page);
  await page.locator('.topbar [data-language]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-reading="X"]')).toHaveValue((first.X + 0.3).toFixed(1));
  await page.waitForTimeout(500);
  expect(await storageSnapshot(page)).toEqual(beforeLanguage);
  await page.locator('.topbar [data-language]').click();
  await page.waitForTimeout(500);
  expect(await storageSnapshot(page)).toEqual(beforeLanguage);

  await preparePlate(page, 1);
  await preparePlate(page, 2);
  await page.locator('[data-plate="0"]').click();
  expect((await current(page)).plates[0].result).toEqual(first);
  await screenshot(page, 'artifacts/vl4-desktop-lab.png');
  await analyseInvestigation(page);
  saved = await current(page);
  expect(saved.original.answers.prediction).toBe('X_Z');
  expect(saved.original.answers.largestPrediction).toBe('Z');
  expect(saved.original.plannedReplicates).toBe(2);
  expect(saved.answers.plannedReplicates).toBe('2');
  expect(saved.actualReplicates).toBe(3);
  expect(saved.plates.filter(plate => plate.completed)).toHaveLength(3);
  expect(saved.plates[0].result).toEqual(first);
  await expect(page.locator('#prediction')).toBeDisabled();
  await expect(page.locator('#observation')).toBeDisabled();
  await expect(page.locator('#downloadPDF')).toBeDisabled();

  await page.locator('#reflection').fill('我保留部分樣本能抑制生長的假說：X、Z 三次均有圈而對照沒有。我原建議兩次，實際三次有助比較變異，但仍不能保證全部細菌死亡或最佳治療。');
  await page.locator('#saveReflection').click();
  await expect(page.locator('#reflection')).toBeDisabled();
  await expect(page.locator('#downloadPDF')).toBeEnabled();
  saved = await current(page);
  expect(saved.submittedAt).toBeTruthy();
  expect(saved.reflectionSubmittedAt).toBeTruthy();
  expect(saved.original.answers.observation).toContain('黴菌附近');
  const activeSeconds = Object.values(saved.timing).reduce((sum, value) => sum + value, 0);
  expect(activeSeconds).toBeGreaterThan(0);
  expect(activeSeconds).toBeLessThan(120);

  for (const [lang, name] of [['zh-Hant-HK', 'zh'], ['en', 'en']]) {
    if (name === 'en') await page.locator('.topbar [data-language]').click();
    const popupPromise = page.waitForEvent('popup');
    await page.locator('#downloadPDF').click();
    const popup = await popupPromise;
    await expect(popup.locator('.vl4-report')).toBeVisible();
    await expect(popup.locator('html')).toHaveAttribute('lang', lang);
    await expect(popup.locator('body')).toContainText('黴菌附近少或沒有可見細菌菌落。');
    await expect(popup.locator('body')).toContainText(saved.id);
    if (name === 'en') await expect(popup.locator('body')).toContainText('Your original research plan');
    else await expect(popup.locator('body')).toContainText('你的原始研究計劃');
    const path = `artifacts/vl4-student-${name}.pdf`;
    await popup.pdf({ path, format: 'A4', printBackground: true });
    expect((await stat(path)).size).toBeGreaterThan(5000);
    await popup.close();
  }
  await assertNoOverflow(page);
  expect(errors).toEqual([]);
});

async function svgScreenPoint(page, id, x, y) {
  return page.evaluate(({ id, x, y }) => {
    const point = new DOMPoint(x, y).matrixTransform(document.getElementById(id).getScreenCTM());
    return { x: point.x, y: point.y };
  }, { id, x, y });
}

async function dragSVG(page, id, from, to) {
  await page.locator('#' + id).scrollIntoViewIfNeeded();
  const start = await svgScreenPoint(page, id, ...from);
  const finish = await svgScreenPoint(page, id, ...to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(finish.x, finish.y, { steps: 8 });
  await page.mouse.up();
}

test('manual spreading, handle rotation and disc placement use plate coordinates consistently', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/');
  await login(page);
  await planInvestigation(page);
  await page.locator('#addBacteria').click();
  await page.locator('#selectSpreader').click();
  await dragSVG(page, 'plateSVG', [117.4, 173.2], [190.6, 173.2]);
  let state = await current(page);
  const baseline = state.plates[0].coverage;
  expect(baseline.length).toBeGreaterThan(0);
  await dragSVG(page, 'plateSVG', [324, 76], [324, 324]);
  state = await current(page);
  expect(state.plates[0].rotation).toBeCloseTo(90, 1);
  expect(state.plates[0].coverage).toEqual(baseline);
  await dragSVG(page, 'plateSVG', [226.8, 117.4], [226.8, 190.6]);
  state = await current(page);
  expect(state.plates[0].coverage).toEqual(baseline);
  expect(state.plates[0].result).toBeNull();

  for (const [sample, world] of Object.entries({ X: [270, 130], Y: [270, 270], Z: [130, 130], C: [130, 270] })) {
    await page.locator(`[data-disc="${sample}"]`).click();
    await page.locator('#plateSVG').scrollIntoViewIfNeeded();
    const point = await svgScreenPoint(page, 'plateSVG', ...world);
    await page.mouse.click(point.x, point.y);
    expect((await current(page)).plates[0].discPositions[sample]).toBeTruthy();
  }
  expect((await current(page)).plates[0].discPositions).toEqual({
    X: { x: 130, y: 130 }, Y: { x: 270, y: 130 }, Z: { x: 130, y: 270 }, C: { x: 270, y: 270 },
  });
  const resultsBefore = (await current(page)).plates.map(plate => plate.result);
  await page.locator('#incubate').click();
  expect((await current(page)).plates.map(plate => plate.result)).toEqual(resultsBefore);
  await expect(page.locator('#toast')).toBeVisible();
  await page.locator('#assistSpread').click();
  await page.locator('#incubate').click();
  await expect.poll(async () => (await current(page)).plates[0].completed).toBe(true);
  const fixed = (await current(page)).plates[0].result;
  await dragSVG(page, 'plateSVG', [75, 355], [105, 325]);
  await page.waitForTimeout(500);
  state = await current(page);
  expect(state.events.some(event => event.type === 'ruler_moved')).toBe(true);
  expect(state.plates[0].result).toEqual(fixed);
});

test('completion gates reject missing data and invalid Enter readings while complete incorrect answers remain submitable', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/');
  await login(page);
  await page.locator('#orientationNext').click();
  await expect(page.locator('#phase-1')).toBeVisible();
  await expect(page.locator('#observation')).toBeFocused();
  await expect(page.locator('#toast')).toBeVisible();
  await planInvestigation(page, { wrongAnswers: true });
  await page.locator('#experimentNext').click();
  await expect(page.locator('#phase-3')).toBeVisible();
  await expect(page.locator('[data-reading="X"]')).toBeDisabled();
  const first = await preparePlate(page, 0);
  for (const invalid of ['', '5.9', '6.01']) {
    await page.locator('[data-reading="X"]').fill(invalid);
    await page.locator('[data-reading="X"]').press('Enter');
    await expect(page.locator('[data-reading="X"]')).toBeFocused();
    await expect(page.locator('#phase-3')).toBeVisible();
  }
  await page.locator('[data-reading="X"]').fill(first.X.toFixed(1));
  await page.locator('[data-reading="X"]').press('Enter');
  await expect(page.locator('[data-reading="Y"]')).toBeFocused();
  await page.locator('[data-reading="C"]').press('Enter');
  await expect(page.locator('#confirmReadings')).toBeFocused();
  await page.locator('#confirmReadings').click();
  await preparePlate(page, 1);
  await preparePlate(page, 2);
  await analyseInvestigation(page, { beforeSubmit: async () => {
    await page.locator('[data-mean="X"]').fill('6.01');
    await page.locator('[data-mean="X"]').press('Enter');
    await expect(page.locator('[data-mean="X"]')).toBeFocused();
    await page.locator('[data-mean="X"]').fill('6.0');
    await page.locator('[data-mean="X"]').press('Enter');
    await expect(page.locator('[data-mean="Y"]')).toBeFocused();
    await page.locator('[data-bar="X"]').fill('6.01');
    await page.locator('[data-bar="X"]').press('Enter');
    await expect(page.locator('[data-bar="X"]')).toBeFocused();
    for (const sample of SAMPLES) await page.locator(`[data-bar="${sample}"]`).fill('6.0');
    await page.locator('[data-bar="C"]').press('Enter');
    await expect(page.locator('#confirmGraph')).toBeFocused();
    await page.locator('#confirmGraph').click();
    await page.locator('#analysisDeath').selectOption('can');
    await page.locator('#analysisClinical').selectOption('can');
    await page.locator('#knowledgeBacteria').selectOption('viruses');
    await page.locator('#knowledgeResistance').selectOption('body');
    await page.locator('#knowledgeLimits').selectOption('best');
  } });
  const state = await current(page);
  expect(state.submittedAt).toBeTruthy();
  expect(state.original.answers.prediction).toBe('none');
  expect(state.original.answers.largestPrediction).toBe('na');
  expect(state.original.answers.iv).toEqual(['zone']);
  expect(state.original.answers.assumptions).toEqual(['death']);
  expect(state.answers.knowledgeBacteria).toBe('viruses');
  expect(state.means.X).toBe('6.0');
  expect(state.graph.values.X).toBe(6);
  await page.locator('#accountButton').click();
  await login(page, { name: '教師', className: 'S4', email: 'tzechingchan0605@gmail.com' });
  await page.locator(`[data-view="${state.id}"]`).click();
  await expect(page.locator('#teacherReport')).toContainText('最佳患者治療藥物及劑量');
});

test('graph hovering leaves confirmed answers unchanged and optional extension preserves its first prediction', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/');
  await login(page);
  await planInvestigation(page);
  for (let i = 0; i < 3; i++) await preparePlate(page, i);
  await analyseInvestigation(page, { beforeSubmit: async () => {
    await page.waitForTimeout(500);
    await page.locator('#studentGraph').scrollIntoViewIfNeeded();
    const before = await storageSnapshot(page);
    const bars = await page.locator('[data-bar]').evaluateAll(inputs => inputs.map(input => input.value));
    const point = await svgScreenPoint(page, 'studentGraph', 115, 200);
    await page.mouse.move(point.x, point.y);
    await expect(page.locator('#graphHint')).not.toBeEmpty();
    await page.waitForTimeout(500);
    expect(await storageSnapshot(page)).toEqual(before);
    expect(await page.locator('[data-bar]').evaluateAll(inputs => inputs.map(input => input.value))).toEqual(bars);

    await page.locator('#startExtension').click();
    await expect(page.locator('#extensionFields')).toBeVisible();
    await page.locator('#submitInquiry').click();
    await expect(page.locator('#submitDialog')).toBeHidden();
    await page.locator('#ext-prediction').fill('同一样本的較高紙碟含量可能出現較大圈。');
    await page.locator('#ext-reason').fill('擴散到瓊脂中的樣本量可能不同。');
    await page.locator('#ext-fairComparison').fill('只改變預設紙碟含量，保持同一樣本、細菌種類、培養基、紙碟大小及觀察條件。');
    await page.locator('#viewExtension').click();
    let state = await current(page);
    const original = state.extension.original;
    const result = state.extension.results;
    expect(result).toEqual({ low: 12, medium: 18, high: 23 });
    await page.locator('#ext-prediction').fill('修訂的預測，但首次預測需要保留。');
    await page.locator('#viewExtension').click();
    state = await current(page);
    expect(state.extension.original).toEqual(original);
    expect(state.extension.results).toEqual(result);
    await page.locator('#ext-analysis').fill('預設含量增加時模型圈較大；這不會轉成患者劑量或臨床治療建議。');
  } });
  const state = await current(page);
  expect(state.submittedAt).toBeTruthy();
  expect(state.extension.original.prediction).toContain('較高紙碟含量');
  expect(state.extension.prediction).toContain('修訂');
  await expect(page.locator('#ext-analysis')).toBeDisabled();
});

test('account changes and reloads start blank inquiries without merging records for the same email', async ({ page }) => {
  await page.goto('/');
  await login(page);
  await page.locator('#observation').fill('第一位學生的原始觀察');
  await page.waitForTimeout(500);
  const firstId = (await current(page)).id;
  await page.locator('#accountButton').click();
  await expect(page.locator('#profileName')).toHaveValue('');
  await expect(page.locator('#profileEmail')).toHaveValue('');
  await login(page, { name: '另一位同學', className: 'S4X1-06', email: 'other@school.edu.hk' });
  const secondId = (await current(page)).id;
  expect(secondId).not.toBe(firstId);
  await expect(page.locator('#observation')).toHaveValue('');
  await page.locator('#accountButton').click();
  await login(page);
  const thirdId = (await current(page)).id;
  expect(new Set([firstId, secondId, thirdId]).size).toBe(3);
  const saved = await records(page);
  expect(saved.filter(record => record.profile.email === PROFILE.email)).toHaveLength(2);
  expect(saved.find(record => record.id === firstId).answers.observation).toBe('第一位學生的原始觀察');
  await page.locator('.topbar [data-language]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(page.locator('#loginDialog')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant-HK');
  await expect(page.locator('#profileName')).toHaveValue('');
  await expect(page.locator('#profileEmail')).toHaveValue('');
  await expect(page.locator('#main')).toBeHidden();
  expect((await records(page)).map(record => record.id)).toEqual(saved.map(record => record.id));
});

test('teacher demonstration operates without creating student records or upload snapshots', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/');
  await login(page);
  await page.locator('#accountButton').click();
  const before = await storageSnapshot(page);
  await login(page, { name: '教師', className: 'S4', email: 'tzechingchan0605@gmail.com' });
  await expect(page.locator('#teacherDialog')).toBeVisible();
  await page.locator('#teacherDemo').click();
  await expect(page.locator('#demoBanner')).toBeVisible();
  await planInvestigation(page);
  await page.locator('#addBacteria').click();
  await page.locator('#assistSpread').click();
  await page.locator('#assistDiscs').click();
  await page.locator('#incubate').click();
  await expect(page.locator('#measurementRows input[data-reading="X"]')).toBeEnabled({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.locator('.topbar [data-language]').click();
  await page.waitForTimeout(500);
  expect(await storageSnapshot(page)).toEqual(before);
  await page.locator('#teacherBack').click();
  await expect(page.locator('#teacherDialog')).toBeVisible();
  expect(await storageSnapshot(page)).toEqual(before);
});

test('360px mobile supports login language switching and assisted plate preparation without page overflow', async ({ page }) => {
  test.setTimeout(45000);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await assertNoOverflow(page);
  const language = page.locator('#loginDialog [data-language]');
  await language.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await screenshot(page, 'artifacts/vl4-mobile-login-en.png');
  await language.click();
  await login(page);
  await assertNoOverflow(page);
  await planInvestigation(page);
  await assertNoOverflow(page);
  await preparePlate(page, 0);
  await assertNoOverflow(page);
  await page.locator('#plateSVG').scrollIntoViewIfNeeded();
  await screenshot(page, 'artifacts/vl4-mobile-lab.png');
  const plate = await page.locator('#plateSVG').boundingBox();
  expect(plate.width).toBeLessThanOrEqual(328);
  const button = await page.locator('#assistSpread').boundingBox();
  expect(button.height).toBeGreaterThanOrEqual(44);
  const fixed = (await current(page)).plates[0].result;
  await page.locator('#toggleZoom').click();
  await expect(page.locator('#plateSVG')).not.toHaveAttribute('viewBox', '0 0 400 460');
  await assertNoOverflow(page);
  await page.locator('#rulerSample').selectOption('Z');
  await page.locator('#plateSVG').scrollIntoViewIfNeeded();
  await screenshot(page, 'artifacts/vl4-mobile-measurement.png');
  expect((await current(page)).plates[0].result).toEqual(fixed);
  await page.locator('#toggleZoom').click();
  await expect(page.locator('#plateSVG')).toHaveAttribute('viewBox', '0 0 400 460');
  await page.locator('.topbar [data-language]').click();
  await assertNoOverflow(page);
  await expect(page.locator('[data-reading="Y"]')).toHaveValue('6.0');
});

test('damaged local student records are retained instead of silently overwritten', async ({ page }) => {
  const damaged = '{"student_data":"preserve this damaged backup"';
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value),
    { key: RECORDS, value: damaged });
  await page.goto('/');
  await login(page);
  await page.locator('#observation').fill('資料損壞時的新回答不得覆蓋舊紀錄。');
  await page.waitForTimeout(500);
  expect(await page.evaluate(key => localStorage.getItem(key), RECORDS)).toBe(damaged);
  await expect(page.locator('#localStatus')).not.toBeEmpty();
  await expect(page.locator('#cloudStatus')).not.toHaveAttribute('data-state', 'synced');
});
