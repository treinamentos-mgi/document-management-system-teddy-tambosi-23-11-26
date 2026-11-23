const path = require('node:path');

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function isSupportedFile(originalName, mimeType) {
  const extension = path.extname(originalName).toLowerCase();
  return ALLOWED_TYPES[extension] === mimeType;
}

module.exports = { ALLOWED_TYPES, MAX_FILE_SIZE, isSupportedFile };