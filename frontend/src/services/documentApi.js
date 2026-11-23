const API_BASE_URL = '/api';
const DEFAULT_ERROR_MESSAGE = 'Não foi possível concluir a operação.';

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function toApiError(response) {
  const payload = await response.json().catch(() => null);
  const { code = 'UNKNOWN_ERROR', message = DEFAULT_ERROR_MESSAGE } = payload?.error ?? {};
  return new ApiError(code, message, response.status);
}

async function sendRequest(path, userId, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { 'X-User-Id': userId, ...options.headers },
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Não foi possível conectar ao servidor.', 0);
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  return response;
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await sendRequest('/upload', userId, { method: 'POST', body: formData });
  const { document } = await response.json();
  return document;
}

export async function listDocuments(userId) {
  const response = await sendRequest('/documents', userId);
  const { documents } = await response.json();
  return documents;
}

export async function downloadDocument(userId, documentId) {
  const response = await sendRequest(`/documents/${encodeURIComponent(documentId)}/download`, userId);
  return response.blob();
}
