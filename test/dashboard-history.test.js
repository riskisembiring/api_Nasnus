import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createHistoryHandlers, encodeDashboard, decodeDashboard } from '../api/dashboardHistoryService.js';

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('complete dashboard survives multiple chunks and nested arrays', () => {
  const data = { fileName: 'Kirim.xlsx', slides: [{ tableRows: [[1, null, '日本語']] }], rawDashboard: { rows: [{ value: randomBytes(700000).toString('hex') }] } };
  const chunks = encodeDashboard(data);
  assert.ok(chunks.length > 1);
  assert.deepEqual(decodeDashboard(chunks), data);
});

test('list returns metadata and pagination', async () => {
  const data = [{ id: 'a'.repeat(20), fileName: 'Kirim.xlsx', totalRows: 808 }];
  const handlers = createHistoryHandlers({ async list(page, size) {
    assert.equal(page, 2); assert.equal(size, 3); return { data, total: 7 };
  } });
  const res = response();
  await handlers.list({ url: '/api/dashboard/history?page=2&pageSize=3' }, res);
  assert.deepEqual(res.body, { data, pagination: { page: 2, pageSize: 3, total: 7, totalPages: 3, hasPreviousPage: true, hasNextPage: true } });
});

test('invalid pagination never reads storage', async () => {
  const handlers = createHistoryHandlers({ list() { assert.fail('unexpected storage read'); } });
  for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=x', 'pageSize=101', 'pageSize=0', 'page=']) {
    const res = response();
    await handlers.list({ url: `/api/dashboard/history?${query}` }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('empty history has a usable first page', async () => {
  const handlers = createHistoryHandlers({ async list() { return { data: [], total: 0 }; } });
  const res = response();
  await handlers.list({ url: '/api/dashboard/history' }, res);
  assert.equal(res.body.pagination.totalPages, 1);
  assert.equal(res.body.pagination.hasNextPage, false);
  assert.equal(res.body.pagination.hasPreviousPage, false);
});

test('detail returns all data and handles missing or invalid IDs', async () => {
  const result = { history: { id: 'a'.repeat(20) }, data: { slides: [{ tableRows: [1, 2] }], rawDashboard: { rows: [1, 2, 3] } } };
  const handlers = createHistoryHandlers({ async get(id) { return id === result.history.id ? result : null; } });
  for (const [id, status] of [[result.history.id, 200], ['b'.repeat(20), 404], ['bad', 400]]) {
    const res = response();
    await handlers.detail({ params: { id } }, res);
    assert.equal(res.statusCode, status);
    if (status === 200) assert.deepEqual(res.body, result);
  }
});
