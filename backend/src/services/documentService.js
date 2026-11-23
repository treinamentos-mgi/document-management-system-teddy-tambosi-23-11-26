const crypto = require('node:crypto');
const path = require('node:path');
const { isSupportedFile, MAX_FILE_SIZE } = require('../config/documentPolicy');
const { AppError } = require('../errors/appError');

function toPublicDocument(document) {
  const { storageKey, ...publicDocument } = document;
  return publicDocument;
}

function sanitizeOriginalName(originalName) {
  const normalizedName = String(originalName || '').replace(/\\/g, '/');
  const baseName = path.basename(normalizedName).replace(/[\u0000-\u001f\u007f]/g, '');
  return baseName || 'document';
}

class DocumentService {
  constructor(documentRepository, fileRepository) {
    this.documentRepository = documentRepository;
    this.fileRepository = fileRepository;
  }

  async createDocument(owner, file) {
    if (!file) {
      throw new AppError(400, 'FILE_REQUIRED', "Envie um arquivo no campo 'file'.");
    }

    try {
      if (file.size === 0) {
        throw new AppError(400, 'FILE_REQUIRED', 'O arquivo não pode estar vazio.');
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new AppError(413, 'FILE_TOO_LARGE', 'O arquivo excede o limite de 10 MiB.');
      }
      if (!isSupportedFile(file.originalname, file.mimetype)) {
        throw new AppError(415, 'FILE_TYPE_NOT_ALLOWED', 'Tipo de arquivo não permitido.');
      }

      const document = {
        id: crypto.randomUUID(),
        originalName: sanitizeOriginalName(file.originalname),
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
        owner,
        storageKey: file.filename,
      };

      await this.documentRepository.save(document);
      return toPublicDocument(document);
    } catch (error) {
      await this.fileRepository.remove(file.filename).catch(() => {});
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'UPLOAD_FAILED', 'Não foi possível salvar o documento.');
    }
  }

  async listDocuments(owner) {
    try {
      const documents = await this.documentRepository.findByOwner(owner);
      return documents.map(toPublicDocument);
    } catch (error) {
      throw new AppError(500, 'DOCUMENT_LIST_FAILED', 'Não foi possível listar os documentos.');
    }
  }

  async getDownload(owner, id) {
    let document;
    try {
      document = await this.documentRepository.findById(id);
    } catch (error) {
      throw new AppError(500, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.');
    }

    if (!document || document.owner !== owner) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }

    try {
      if (!(await this.fileRepository.exists(document.storageKey))) {
        throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
      }
      return {
        document: toPublicDocument(document),
        filePath: this.fileRepository.getPath(document.storageKey),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.');
    }
  }
}

module.exports = { DocumentService, sanitizeOriginalName, toPublicDocument };