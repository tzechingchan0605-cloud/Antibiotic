import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODULE_ID, TEACHER_EMAIL, SAMPLES, GRID, DISC_MM, DEFAULT_POSITIONS,
  freshRecord, captureOriginal, validReplicates, toPlatePoint, addCoverage,
  coverageFraction, placementIssue, generateResult, independentRepeat,
  validDecimal, confirmMeasurement, allMeasurements, ownMean, canonicalRecord
} from '../model.js';

const student = { name: '陳同學', className: 'S4X1-05', email: 'student@school.edu.hk' };
const fresh = () => freshRecord(student);
const reading = (value, visible = 'yes', note = '') => ({ value: String(value), visible, note });

test('first hypothesis and repeat plan survive revisions as independent snapshots', () => {
  const record = fresh();
  record.answers = {
    hypothesis: 'some', reason: '需要先比較', plannedReplicates: '4',
    plannedReplicateReason: '用新平板檢查一致性', cv: ['strain', 'discSize'],
    assumptions: ['comparable'], controlReason: '相同載體但沒有抗生素'
  };
  record.design = { image: 'data:image/png;base64,original', description: '原始設計', saved: true };
  captureOriginal(record);
  const original = structuredClone(record.original);
  record.answers.hypothesis = 'all';
  record.answers.reason = '修改理由';
  record.answers.plannedReplicates = '7';
  record.answers.plannedReplicateReason = '修訂安排';
  record.answers.cv.push('conditions');
  record.design.image = 'data:image/png;base64,revised';
  record.design.description = '修訂設計';
  captureOriginal(record);
  assert.deepEqual(record.original, original);
  assert.equal(record.original.plannedReplicates, 4);
  assert.equal(record.original.plannedReplicateReason, '用新平板檢查一致性');
  assert.equal(record.answers.plannedReplicates, '7');
  assert.equal(record.actualReplicates, 3);
});

test('replicate proposal accepts positive safe integers without imposing three', () => {
  for (const value of [1, 2, 3, 4, 50, '1', '3', '07', Number.MAX_SAFE_INTEGER]) {
    assert.equal(validReplicates(value), true, String(value));
  }
  for (const value of [0, -1, 1.5, '', ' ', ' 3 ', '1.0', '2e2', 'Infinity', 'abc',
    null, undefined, true, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(validReplicates(value), false, String(value));
  }
});

test('rotation maps the same agar location to identical plate-local coverage', () => {
  const local = { x: 252, y: 140 };
  const baseline = fresh().plates[0];
  addCoverage(baseline, local);
  assert.ok(baseline.coverage.length > 0);
  for (const rotation of [0, 90, 180, -90, 37, 360]) {
    const angle = rotation * Math.PI / 180;
    const screen = {
      x: 200 + (local.x - 200) * Math.cos(angle) - (local.y - 200) * Math.sin(angle),
      y: 200 + (local.x - 200) * Math.sin(angle) + (local.y - 200) * Math.cos(angle)
    };
    const mapped = toPlatePoint(screen, rotation);
    assert.ok(Math.abs(mapped.x - local.x) < 1e-9);
    assert.ok(Math.abs(mapped.y - local.y) < 1e-9);
    const plate = fresh().plates[0];
    plate.rotation = rotation;
    addCoverage(plate, mapped);
    assert.deepEqual(plate.coverage, baseline.coverage, `rotation ${rotation}`);
  }
});

test('coverage counts agar cells once, excluding movement outside the plate', () => {
  const plate = fresh().plates[0];
  addCoverage(plate, { x: 200, y: 200 });
  const covered = [...plate.coverage];
  addCoverage(plate, { x: 200, y: 200 });
  addCoverage(plate, { x: -500, y: -500 });
  assert.deepEqual(plate.coverage, covered);
  assert.equal(coverageFraction(plate), covered.length / GRID.length);
  for (const point of GRID) addCoverage(plate, point, 1);
  assert.equal(coverageFraction(plate), 1);
});

test('standardized repetition prepares a separate plate without copying its outcomes', () => {
  const record = fresh(), [first, second] = record.plates;
  first.seed = 12345;
  second.seed = 54321;
  first.inoculated = true;
  first.rotation = 37;
  first.coverage = [1, 2, 3, 4];
  first.discPositions = structuredClone(DEFAULT_POSITIONS);
  const firstResult = structuredClone(generateResult(first));
  const secondId = second.id, secondSeed = second.seed;
  independentRepeat(first, second);
  assert.notEqual(second.id, first.id);
  assert.equal(second.id, secondId);
  assert.equal(second.seed, secondSeed);
  assert.notEqual(second.seed, first.seed);
  assert.equal(second.completed, false);
  assert.equal(second.result, null);
  assert.deepEqual(second.discPositions, first.discPositions);
  assert.deepEqual(second.coverage, first.coverage);
  assert.equal(second.operations.at(-1).sourcePlateId, first.id);
  second.coverage.push(7);
  second.discPositions.X.x += 2;
  assert.deepEqual(first.coverage, [1, 2, 3, 4]);
  assert.equal(first.discPositions.X.x, DEFAULT_POSITIONS.X.x);
  const secondResult = generateResult(second);
  assert.notDeepEqual(secondResult, firstResult);
  assert.deepEqual(first.result, firstResult);
  assert.equal(secondResult.C, DISC_MM);
  assert.equal(secondResult.Y, DISC_MM);
});

test('a generated result remains fixed after remeasurement, rotation, and serialization', () => {
  const record = fresh(), plate = record.plates[0];
  const result = structuredClone(generateResult(plate));
  plate.rotation = 170;
  plate.seed = (plate.seed + 1) >>> 0;
  confirmMeasurement(record, plate.id, 'X', reading(result.X));
  confirmMeasurement(record, plate.id, 'X', reading(result.X + 0.1));
  assert.deepEqual(generateResult(plate), result);
  const restored = JSON.parse(JSON.stringify(record));
  assert.deepEqual(generateResult(restored.plates[0]), result);
});

test('standardized repeats require a completed source plate', () => {
  const [first, second] = fresh().plates;
  assert.throws(() => independentRepeat(first, second), /incomplete/);
  assert.equal(second.inoculated, false);
  assert.equal(second.result, null);
});

test('disc placement checks spacing and plate edge without revealing sample results', () => {
  const plate = fresh().plates[0];
  assert.equal(placementIssue(plate, 'X', { x: 320, y: 200 }), 'edge');
  assert.equal(placementIssue(plate, 'X', { x: 315, y: 200 }), null);
  plate.discPositions.X = { x: 130, y: 130 };
  assert.equal(placementIssue(plate, 'Y', { x: 140, y: 130 }), 'close');
  assert.equal(placementIssue(plate, 'Y', DEFAULT_POSITIONS.Y), null);
  assert.equal(placementIssue(plate, 'X', { x: 130, y: 130 }), null);
  for (const sample of SAMPLES) {
    const candidate = fresh().plates[0];
    assert.equal(placementIssue(candidate, sample, { x: 320, y: 200 }), 'edge');
  }
});

test('no external inhibition zone has valid total diameter six, never zero', () => {
  const record = fresh(), id = record.plates[0].id;
  assert.equal(validDecimal('6', DISC_MM, 40), true);
  assert.equal(validDecimal('0', DISC_MM, 40), false);
  confirmMeasurement(record, id, 'C', reading(6, 'no', '紙碟外沒有可見清晰區'));
  assert.equal(record.measurements[id].C.last.value, '6');
  assert.equal(record.measurements[id].C.last.visible, 'no');
  assert.throws(() => confirmMeasurement(record, id, 'C', reading(0, 'no')), /invalid/);
  for (const invalid of ['5.9', '40.1', '6.01', '-6', '', 'abc', '1e1']) {
    assert.throws(() => confirmMeasurement(record, id, 'X', reading(invalid)), /invalid/, invalid);
  }
  assert.throws(() => confirmMeasurement(record, id, 'X', reading(18, 'maybe')), /invalid/);
});

test('readings retain first/latest values and meaningful revision history', () => {
  const record = fresh(), id = record.plates[0].id;
  confirmMeasurement(record, id, 'X', reading(18, 'yes', '第一次'));
  const first = structuredClone(record.measurements[id].X.first);
  confirmMeasurement(record, id, 'X', reading(18, 'yes', '第一次'));
  assert.equal(record.measurements[id].X.revisions.length, 0);
  confirmMeasurement(record, id, 'X', reading(18.5, 'yes', '重新量度'));
  const item = record.measurements[id].X;
  assert.deepEqual(item.first, first);
  assert.equal(item.value, '18.5');
  assert.equal(item.last.value, '18.5');
  assert.equal(item.last.note, '重新量度');
  assert.equal(item.revisions.length, 1);
  assert.equal(item.revisions[0].previous.value, '18');
  assert.equal(item.revisions[0].next.value, '18.5');
  confirmMeasurement(record, id, 'X', reading(18.5, 'no', '分類修訂'));
  assert.deepEqual(record.measurements[id].X.first, first);
  assert.equal(record.measurements[id].X.revisions.length, 2);
  record.submittedAt = '2026-10-07T00:00:00.000Z';
  const locked = structuredClone(record.measurements);
  assert.throws(() => confirmMeasurement(record, id, 'X', reading(19)), /locked/);
  assert.deepEqual(record.measurements, locked);
});

test('averages use student readings rather than fixed model diameters', () => {
  const record = fresh();
  const studentValues = { X: [12, 15, 18], Y: [6, 6, 6], Z: [20, 25, 30], C: [6, 6, 6] };
  record.plates.forEach((plate, index) => {
    generateResult(plate);
    for (const sample of SAMPLES) {
      confirmMeasurement(record, plate.id, sample,
        reading(studentValues[sample][index], studentValues[sample][index] === 6 ? 'no' : 'yes'));
    }
  });
  assert.equal(allMeasurements(record), true);
  assert.equal(ownMean(record, 'X'), 15);
  assert.equal(ownMean(record, 'Z'), 25);
  assert.equal(ownMean(record, 'C'), 6);
  assert.notEqual(ownMean(record, 'X'), record.plates.reduce((sum, p) => sum + p.result.X, 0) / 3);
  confirmMeasurement(record, record.plates[0].id, 'X', reading(18));
  assert.equal(ownMean(record, 'X'), 17);
  delete record.measurements[record.plates[2].id].C.confirmedAt;
  assert.equal(allMeasurements(record), false);
});

test('canonical import rejects unrelated modules, teacher accounts, and demos', () => {
  const record = fresh();
  assert.equal(record.moduleId, MODULE_ID);
  assert.equal(canonicalRecord(null), null);
  assert.equal(canonicalRecord({ ...record, moduleId: 'VL_BIO_TRANSPIRATION' }), null);
  assert.equal(canonicalRecord({ ...record, moduleId: 'VL2' }), null);
  assert.equal(canonicalRecord({ ...record, moduleId: 'FOREIGN_MODULE' }), null);
  assert.equal(canonicalRecord({ ...record, demo: true }), null);
  assert.equal(canonicalRecord({ ...record, profile: { ...student, email: ` ${TEACHER_EMAIL.toUpperCase()} ` } }), null);
  assert.equal(canonicalRecord({ ...record, role: 'teacher' }), null);
  const imported = canonicalRecord(record);
  assert.deepEqual(imported, record);
  imported.answers.hypothesis = 'mutated import';
  assert.equal(record.answers.hypothesis, undefined);
});

test('compatible legacy VL4 metadata is upgraded without discarding evidence; malformed imports are rejected',()=>{
 const record=fresh();
 const legacy=structuredClone(record);delete legacy.schemaVersion;delete legacy.version;delete legacy.demo;
 legacy.profile.classInfo=legacy.profile.className;delete legacy.profile.className;
 const imported=canonicalRecord(legacy);
 assert.equal(imported.schemaVersion,1);assert.equal(imported.version,1);assert.equal(imported.demo,false);
 assert.equal(imported.profile.className,'S4X1-05');assert.deepEqual(imported.plates,record.plates);
 assert.equal(legacy.schemaVersion,undefined);
 for(const bad of [{...record,id:'../bad'},{...record,schemaVersion:999},{...record,version:-1},{...record,plates:[null]},{...record,profile:{...record.profile,email:'not-an-email'}}])assert.equal(canonicalRecord(bad),null);
});
