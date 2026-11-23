const express = require('express');
const path = require('node:path');
const { createDocumentController } = require('./controllers/documentController');
const { createDocumentRoutes } = require('./routes/documentRoutes');
const { DocumentRepository } = require('./repositories/documentRepository');
const { LocalFileRepository } = require('./repositories/localFileRepository');
const { DocumentService } = require('./services/documentService');

const PORT = process.env.PORT || 3000;
const STORAGE_DIR = path.join(__dirname, '..', 'storage');

function createApp({ storageDir = STORAGE_DIR } = {}) {
  const documentRepository = new DocumentRepository();
  const fileRepository = new LocalFileRepository(storageDir);
  const documentService = new DocumentService(documentRepository, fileRepository);
  const documentController = createDocumentController(documentService);
  const app = express();

  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/', createDocumentRoutes({ controller: documentController, storageDir }));
  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite de 10 MiB.' },
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: { code: 'FILE_COUNT_EXCEEDED', message: 'Envie somente um arquivo no campo file.' },
      });
    }

    const status = error.statusCode || 500;
    const code = error.code || 'INTERNAL_SERVER_ERROR';
    const message = status < 500 ? error.message : 'Ocorreu um erro interno.';

    return res.status(status).json({ error: { code, message } });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => console.log(`DMS backend ouvindo na porta ${PORT}`));
}

app.createApp = createApp;
module.exports = app;
