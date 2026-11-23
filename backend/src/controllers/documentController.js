const { AppError } = require('../errors/appError');

function createDocumentController(documentService) {
  function requireUser(req, res, next) {
    const userId = req.get('X-User-Id')?.trim();
    if (!userId || userId.length > 128 || /[\u0000-\u001f\u007f]/.test(userId)) {
      return next(new AppError(400, 'USER_ID_REQUIRED', 'Informe um X-User-Id válido.'));
    }

    req.userId = userId;
    return next();
  }

  async function upload(req, res) {
    const document = await documentService.createDocument(req.userId, req.file);
    res.status(201).json({ document });
  }

  async function list(req, res) {
    const documents = await documentService.listDocuments(req.userId);
    res.json({ documents });
  }

  async function download(req, res, next) {
    const result = await documentService.getDownload(req.userId, req.params.id);
    res.download(result.filePath, result.document.originalName, (error) => {
      if (error) {
        next(new AppError(500, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.'));
      }
    });
  }

  return { requireUser, upload, list, download };
}

module.exports = { createDocumentController };