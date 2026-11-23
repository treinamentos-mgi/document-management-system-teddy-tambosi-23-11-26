const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const app = require('../src/app');
const { createApp } = app;

async function createTestServer(t) {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const server = createApp({ storageDir }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDir, { recursive: true, force: true });
  });

  return { storageDir, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('envia, lista e baixa um documento somente para o dono', async (t) => {
  const { baseUrl, storageDir } = await createTestServer(t);
  const form = new FormData();
  form.append('file', new Blob(['conteudo do documento'], { type: 'text/plain' }), 'notas.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: form,
  });
  assert.strictEqual(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.strictEqual(document.originalName, 'notas.txt');
  assert.strictEqual(document.owner, 'usuario-1');
  assert.strictEqual(document.size, Buffer.byteLength('conteudo do documento'));
  assert.ok(!Object.hasOwn(document, 'storageKey'));

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.deepStrictEqual((await listResponse.json()).documents.map(({ id }) => id), [document.id]);

  const hiddenResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'usuario-2' },
  });
  assert.strictEqual(hiddenResponse.status, 404);
  assert.strictEqual((await hiddenResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), 'conteudo do documento');
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);

  const storedFiles = await fs.readdir(storageDir);
  assert.strictEqual(storedFiles.length, 1);
  assert.notStrictEqual(storedFiles[0], 'notas.txt');
});

test('rejeita usuário ausente e tipo de arquivo não permitido', async (t) => {
  const { baseUrl } = await createTestServer(t);
  const missingUserResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(missingUserResponse.status, 400);
  assert.strictEqual((await missingUserResponse.json()).error.code, 'USER_ID_REQUIRED');

  const form = new FormData();
  form.append('file', new Blob(['conteudo'], { type: 'application/octet-stream' }), 'arquivo.exe');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: form,
  });
  assert.strictEqual(uploadResponse.status, 415);
  assert.strictEqual((await uploadResponse.json()).error.code, 'FILE_TYPE_NOT_ALLOWED');
});
