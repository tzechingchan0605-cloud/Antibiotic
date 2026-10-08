import { test, expect } from '@playwright/test';

const CURRENT = 'vl4.antibiotics.current.v1';
const DEFAULT_LABELS = { NW: 'X', NE: 'Y', SW: 'Z', SE: 'C' };
const CENTRES = { NW: [130, 130], NE: [270, 130], SW: [130, 270], SE: [270, 270] };
const current = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), CURRENT);

async function startExperiment(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#profileName').fill('操作測試學生');
  await page.locator('#profileClass').fill('S4X1-07');
  await page.locator('#profileEmail').fill('procedure@school.edu.hk');
  await page.locator('#loginForm button[type="submit"]').click();
  await page.locator('#observation').fill('青黴菌附近出現清晰區，沒有可見細菌生長。');
  await page.locator('#orientationNext').click();
  await page.locator('#prediction').selectOption('X_Z');
  await page.locator('#largestPrediction').selectOption('Z');
  await page.locator('#reason').fill('樣本可在瓊脂板擴散，細菌生長可能受到影響。');
  await page.locator('[data-group="iv"][data-variable="sample"]').click();
  await page.locator('[data-group="dv"][data-variable="zone"]').click();
  await page.locator('[data-group="cv"][data-variable="disc"]').click();
  await page.locator('[data-multi="assumptions"][value="distribution"]').check();
  await page.locator('#controlPlan').fill('對照紙碟不含抗生素，其餘條件相同。');
  await page.locator('#designDescription').fill('在四個分格中間放置 X、Y、Z、C 紙碟。');
  await page.locator('#saveDesign').click();
  await page.locator('#plannedReplicates').selectOption('3');
  await page.locator('#plannedReplicateReason').fill('比較新瓊脂板的結果。');
  await page.locator('#designNext').click();
  await expect(page.locator('#phase-3')).toBeVisible();
}

async function screenPoint(page, x, y) {
  return page.evaluate(({ x, y }) => {
    const point = new DOMPoint(x, y).matrixTransform(document.getElementById('plateSVG').getScreenCTM());
    return { x: point.x, y: point.y };
  }, { x, y });
}

async function clickPlate(page, x = 200, y = 200) {
  await page.locator('#plateSVG').scrollIntoViewIfNeeded();
  const point = await screenPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function stroke(page, from, to) {
  await page.locator('#plateSVG').scrollIntoViewIfNeeded();
  const start = await screenPoint(page, ...from), end = await screenPoint(page, ...to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 45 });
  await page.mouse.up();
}

async function labelPlate(page, labels = DEFAULT_LABELS) {
  await page.locator('#flipPlate').click();
  await expect(page.locator('#selectMarker')).toBeEnabled();
  await page.locator('#selectMarker').click();
  await clickPlate(page);
  await expect(page.locator('#quadrantLabels')).toBeVisible();
  for (const [quadrant, sample] of Object.entries(labels)) {
    await page.locator(`#quadrantLabels select[data-quadrant="${quadrant}"]`).selectOption(sample);
  }
  await expect(page.locator('#plateProgress')).toHaveAttribute('data-step', '2');
}

async function inoculatePlate(page) {
  await page.locator('#flipPlate').click();
  await expect(page.locator('#selectDropper')).toBeEnabled();
  await page.locator('#selectDropper').click();
  await page.locator('#bacteriaBottle').click();
  await expect(page.locator('#toolCursor')).toHaveAttribute('data-loaded', 'true');
  await clickPlate(page);
  await expect(page.locator('#selectSpreader')).toBeEnabled();
}

async function manuallySpread(page) {
  await page.locator('#selectSpreader').click();
  for (let angle = 0; angle < 180; angle += 30) {
    if (await page.locator('#selectTweezers').isEnabled()) break;
    if (angle) {
      await page.locator('#rotateRight').click();
      await page.locator('#rotateRight').click();
    }
    await stroke(page, [200, 50], [200, 350]);
  }
  await expect(page.locator('#selectTweezers')).toBeEnabled();
}

async function worldCentre(page, quadrant) {
  const [x, y] = CENTRES[quadrant].map(coordinate => coordinate - 200);
  const rotation = Number(await page.locator('#plateSVG').getAttribute('data-rotation')) * Math.PI / 180;
  return [200 + x * Math.cos(rotation) - y * Math.sin(rotation),
    200 + x * Math.sin(rotation) + y * Math.cos(rotation)];
}

async function expectPlacementArrow(page,sample) {
  const target=page.locator(`[data-disc-target="${sample}"]`);
  await page.locator('#plateSVG').scrollIntoViewIfNeeded();
  await expect(page.locator('#benchGuide')).toBeVisible({timeout:8000});
  const circle=await target.boundingBox();
  const arrow=await page.locator('#benchGuide').boundingBox();
  expect(Math.abs(arrow.x+15-(circle.x+circle.width/2))).toBeLessThan(2);
  expect(Math.abs(arrow.y+34-(circle.y+circle.height/2))).toBeLessThan(2);
}

async function placeLabelledDiscs(page, labels = DEFAULT_LABELS) {
  for (const [quadrant, sample] of Object.entries(labels)) {
    await page.locator('#selectTweezers').click();
    await page.locator('#alcoholBeaker').click();
    await page.locator('#alcoholLamp').click();
    await page.locator(`#discTray [data-tray-disc="${sample}"]`).click();
    await clickPlate(page, ...await worldCentre(page, quadrant));
    await expect(page.locator(`#discTray [data-tray-disc="${sample}"]`)).toBeDisabled();
  }
  await expect(page.locator('#sealPlate')).toBeEnabled();
}

async function manualFirstPlate(page, labels = DEFAULT_LABELS) {
  await labelPlate(page, labels);
  await inoculatePlate(page);
  await manuallySpread(page);
  await placeLabelledDiscs(page, labels);
  await page.locator('#sealPlate').click();
  await expect(page.locator('[data-plate="1"]')).toBeEnabled();
}

test('stage guidance, marker labelling and loaded dropper prevent skipping preparation steps', async ({ page }) => {
  await startExperiment(page);
  await expect(page.locator('#procedureList > li')).toHaveCount(8);
  await expect(page.locator('#procedureList [data-procedure-step="1"]')).toHaveClass(/current/);
  for (const selector of ['#selectMarker', '#selectDropper', '#selectSpreader', '#selectTweezers',
    '#sealPlate', '#setTemperature', '#setDuration', '#incubate', '[data-plate="1"]', '[data-plate="2"]']) {
    await expect(page.locator(selector)).toBeDisabled();
  }
  await expect(page.locator('[data-auto="0"]')).toHaveCount(0);
  await expect(page.locator('#assistSpread')).toBeHidden();
  await page.locator('#flipPlate').scrollIntoViewIfNeeded();
  await expect(page.locator('#benchGuide')).toBeVisible({ timeout: 8000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#flipPlate').click();
  await expect(page.locator('#benchAnimation')).toBeVisible();
  await expect(page.locator('#benchAnimation')).toHaveAttribute('data-animation', 'flip');
  await expect(page.locator('#plateSVG')).toHaveAttribute('data-orientation', 'bottom');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#selectMarker').click();
  await clickPlate(page);
  await expect(page.locator('#quadrantLabels')).toBeVisible();
  const northWest = page.locator('#quadrantLabels [data-quadrant="NW"]');
  await northWest.selectOption('X');
  await northWest.selectOption('');
  await expect(northWest).toHaveValue('X');
  await expect(page.locator('#toast')).toHaveText('請選擇 X、Y、Z 或 C 作為分格標示。');
  // A duplicate label must never advance the protocol or replace a valid label.
  const northEast = page.locator('#quadrantLabels [data-quadrant="NE"]');
  const duplicate = northEast.locator('option[value="X"]');
  if ((await duplicate.getAttribute('disabled')) !== null) {
    await expect(duplicate).toHaveAttribute('disabled', '');
  } else {
    await northEast.selectOption('X');
    await expect(northEast).not.toHaveValue('X');
  }
  expect((await current(page)).plates[0].preparation.quadrantLabels.NW).toBe('X');
  await expect(page.locator('#plateProgress')).toHaveAttribute('data-step', '1');
  for (const [quadrant, sample] of Object.entries({ NE: 'Y', SW: 'Z', SE: 'C' })) {
    await page.locator(`#quadrantLabels [data-quadrant="${quadrant}"]`).selectOption(sample);
  }
  await expect(page.locator('#procedureList [data-procedure-step="2"]')).toHaveClass(/current/);
  await page.locator('#flipPlate').click();
  await expect(page.locator('#selectDropper')).toBeEnabled();
  await page.locator('#selectDropper').click();
  await clickPlate(page);
  expect((await current(page)).plates[0].inoculated).toBe(false);
  await page.locator('#bacteriaBottle').click();
  await page.locator('#plateSVG').scrollIntoViewIfNeeded();
  const centre = await screenPoint(page, 200, 200);
  await page.mouse.move(centre.x, centre.y);
  await expect(page.locator('#toolCursor')).toHaveAttribute('data-tool', 'dropper');
  await expect(page.locator('#toolCursor')).toHaveAttribute('data-loaded', 'true');
  await expect(page.locator('#toolCursor')).toBeVisible();
  await clickPlate(page, 290, 200);
  expect((await current(page)).plates[0].inoculated).toBe(false);
  expect((await current(page)).plates[0].preparation.dropperLoaded).toBe(true);
  await clickPlate(page);
  await expect(page.locator('#procedureList [data-procedure-step="3"]')).toHaveClass(/current/);
  const state = await current(page);
  expect(state.plates[0].inoculated).toBe(true);
  expect(state.plates[0].preparation.dropperLoaded).toBe(false);
  expect(state.plates.every(plate => plate.result === null)).toBe(true);
});

test('vertical spreading and rotated labels require matching sterile disc placement before plate unlock', async ({ page }) => {
  test.setTimeout(90000);
  await startExperiment(page);
  const labels = { NW: 'Z', NE: 'C', SW: 'X', SE: 'Y' };
  await labelPlate(page, labels);
  await inoculatePlate(page);
  await page.locator('#selectSpreader').click();
  await stroke(page, [200, 100], [200, 300]);
  const baseline = (await current(page)).plates[0].coverage;
  await stroke(page, [200, 200], [300, 200]);
  expect((await current(page)).plates[0].coverage).toEqual(baseline);
  await expect(page.locator('#selectTweezers')).toBeDisabled();
  // A new vertical stroke exposes a different area only after rotating the plate.
  await page.locator('#rotateRight').click();
  await page.locator('#rotateRight').click();
  await stroke(page, [200, 50], [200, 350]);
  expect((await current(page)).plates[0].coverage.length).toBeGreaterThan(baseline.length);
  for (let turn = 0; turn < 5 && !(await page.locator('#selectTweezers').isEnabled()); turn++) {
    await page.locator('#rotateRight').click();
    await page.locator('#rotateRight').click();
    await stroke(page, [200, 50], [200, 350]);
  }
  await expect(page.locator('#selectTweezers')).toBeEnabled();
  const toolSelectionsBefore = (await current(page)).events.filter(event =>
    event.type === 'tool_selected' && event.details.tool === 'tweezers').length;
  await page.locator('#selectTweezers').click();
  expect((await current(page)).events.filter(event =>
    event.type === 'tool_selected' && event.details.tool === 'tweezers'))
    .toHaveLength(toolSelectionsBefore + 1);
  await expect(page.locator('#discTray [data-tray-disc="X"]')).toBeDisabled();
  await expect(page.locator('#alcoholLamp')).toBeDisabled();
  await page.locator('#alcoholBeaker').click();
  await page.locator('#alcoholLamp').click();
  await page.locator('#discTray [data-tray-disc="X"]').click();
  expect((await current(page)).events.filter(event =>
    event.type === 'sterile_forceps_disc_selected' && event.details.sample === 'X')).toHaveLength(1);
  await expect(page.locator('#toolCursor')).toHaveAttribute('data-loaded', 'true');
  await expectPlacementArrow(page,'X');
  await clickPlate(page, ...await worldCentre(page, 'NW'));
  expect((await current(page)).plates[0].discPositions.X).toBeUndefined();
  await expect(page.locator('#sealPlate')).toBeDisabled();
  await clickPlate(page, ...await worldCentre(page, 'SW'));
  await expect(page.locator('#selectTweezers')).toBeEnabled();
  expect((await current(page)).plates[0].discPositions.X).toEqual({ x: 130, y: 270 });
  for (const [quadrant, sample] of Object.entries({ NW: 'Z', NE: 'C', SE: 'Y' })) {
    await page.locator('#selectTweezers').click();
    await page.locator('#alcoholBeaker').click();
    await page.locator('#alcoholLamp').click();
    await page.locator(`#discTray [data-tray-disc="${sample}"]`).click();
    await expectPlacementArrow(page,sample);
    await clickPlate(page, ...await worldCentre(page, quadrant));
  }
  await expect(page.locator('#procedureList [data-procedure-step="5"]')).toHaveClass(/current/);
  await expect(page.locator('[data-plate="1"]')).toBeDisabled();
  await page.locator('#sealPlate').click();
  await expect(page.locator('[data-plate="1"]')).toBeEnabled();
  const plate = (await current(page)).plates[0];
  expect(plate.preparation).toMatchObject({ covered: true, inverted: true, orientation: 'bottom', ready: true });
  expect(plate.operations.filter(operation => operation.type === 'disc_placed')).toHaveLength(4);
  expect(plate.operations.filter(operation => operation.type === 'disc_placed')
    .every(operation => operation.sterileTweezers)).toBe(true);
  expect(plate.preparation.sterilizationCycles).toBe(4);
  expect(await page.locator('#discTray .tray-disc').allTextContents()).toEqual(['','','','']);
  expect(plate.result).toBeNull();
});

test('later assistance prepares independent plates and incubation waits for all three covered plates', async ({ page }) => {
  test.setTimeout(60000);
  await startExperiment(page);
  await manualFirstPlate(page);
  await expect(page.locator('#incubate')).toBeDisabled();
  await expect(page.locator('[data-auto="2"]')).toBeDisabled();
  const first = (await current(page)).plates[0];
  await page.locator('[data-plate="1"]').click();
  await labelPlate(page);
  await inoculatePlate(page);
  await expect(page.locator('#assistSpread')).toBeVisible();
  await expect(page.locator('#assistSpread')).toBeEnabled();
  await page.locator('#assistSpread').click();
  await expect(page.locator('#selectTweezers')).toBeEnabled();
  await placeLabelledDiscs(page);
  await page.locator('#sealPlate').click();
  await expect(page.locator('[data-plate="2"]')).toBeEnabled();
  await expect(page.locator('#incubate')).toBeDisabled();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('[data-auto="2"]').click();
  await expect(page.locator('#benchAnimation')).toBeVisible();
  await expect(page.locator('#benchAnimation')).toHaveAttribute('data-animation', 'auto');
  await expect(page.locator('#setTemperature')).toBeEnabled();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let state = await current(page);
  expect(state.plates.every(plate => plate.preparation.ready)).toBe(true);
  expect(state.plates.map(plate => plate.result)).toEqual([null, null, null]);
  expect(state.plates[0]).toEqual(first);
  expect(new Set(state.plates.map(plate => plate.seed)).size).toBe(3);
  expect(state.plates[1].operations.some(operation => operation.type === 'assisted_uniform_spread')).toBe(true);
  expect(state.plates[2].operations.some(operation => operation.type === 'standardized_new_plate')).toBe(true);
  await page.locator('#setTemperature').click();
  await expect(page.locator('#incubate')).toBeDisabled();
  await page.locator('#setDuration').click();
  await expect(page.locator('#incubate')).toBeEnabled();
  await page.locator('#incubate').click();
  await expect.poll(async () => (await current(page)).plates.every(plate => plate.completed)).toBe(true);
  expect(await page.locator('#procedureList').evaluate(list=>list.previousElementSibling.classList.contains('measurement-tools'))).toBe(true);
  state = await current(page);
  expect(state.experiment.incubator).toEqual({ temperature: 30, hours: 24 });
  expect(state.experiment.incubatedAt).toBeTruthy();
  const fixed = state.plates.map(plate => plate.result);
  await page.locator('[data-plate="0"]').click();
  const resultBefore=(await current(page)).plates[0].result;
  const centre=await worldCentre(page,'NW');
  const target={x:centre[0]-resultBefore.X,y:centre[1]};
  await stroke(page,[80,362],[target.x+20,target.y+12]);
  await expect(page.locator('[data-ruler]')).toHaveAttribute('data-snapped','X');
  await stroke(page,[target.x+20,target.y+12],[target.x+24,target.y+18]);
  const adjusted=await page.locator('[data-ruler]').getAttribute('transform');
  const coordinates=adjusted.match(/translate\(([^ ]+) ([^)]+)\)/).slice(1).map(Number);
  expect(coordinates[0]).toBeCloseTo(target.x+4,1);
  expect(coordinates[1]).toBeCloseTo(target.y,1);
  await stroke(page,[target.x+20,target.y+18],[target.x+70,target.y+18]);
  await expect(page.locator('[data-ruler]')).toHaveAttribute('data-snapped','X');
  const horizontal=await page.locator('[data-ruler]').getAttribute('transform');
  const horizontalCoordinates=horizontal.match(/translate\(([^ ]+) ([^)]+)\)/).slice(1).map(Number);
  expect(horizontalCoordinates[0]).toBeCloseTo(Math.min(310,target.x+54),1);
  expect(horizontalCoordinates[1]).toBeCloseTo(target.y,1);
  await stroke(page,[horizontalCoordinates[0]+20,target.y+12],[horizontalCoordinates[0]+20,target.y+45]);
  await expect(page.locator('[data-ruler]')).toHaveAttribute('data-snapped','');
  const freeTransform=await page.locator('[data-ruler]').getAttribute('transform');
  const free=freeTransform.match(/translate\(([^ ]+) ([^)]+)\)/).slice(1).map(Number);
  const next=await worldCentre(page,'SW');
  await stroke(page,[free[0]+20,free[1]+12],[next[0]-resultBefore.Z+20,next[1]+12]);
  await expect(page.locator('[data-ruler]')).toHaveAttribute('data-snapped','Z');
  expect((await current(page)).plates[0].result).toEqual(resultBefore);
  await page.locator('.topbar [data-language]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#incubate')).toBeDisabled();
  await page.waitForTimeout(400);
  expect((await current(page)).plates.map(plate => plate.result)).toEqual(fixed);
});
