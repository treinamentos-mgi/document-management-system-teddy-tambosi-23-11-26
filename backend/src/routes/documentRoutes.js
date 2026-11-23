const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const { isSupportedFile, MAX_FILE_SIZE } = require('../config/documentPolicy');
const { AppError } = require('../errors/appError');

function createDocumentRoutes({ controller, storageDir }) {
  const router = express.Router();
  const upload = multer({
    storage: multer.diskStorage({
      destination(req, file, callback) {
        fs.mkdir(storageDir, { recursive: true }, (error) => callback(error, storageDir));
      },
      filename(req, file, callback) {
        callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
      },
    }),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter(req, file, callback) {
      if (!isSupportedFile(file.originalname, file.mimetype)) {
        return callback(new AppError(415, 'FILE_TYPE_NOT_ALLOWED', 'Tipo de arquivo não permitido.'));
      }
      return callback(null, true);
    },
  });

  router.post('/upload', controller.requireUser, upload.single('file'), controller.upload);
  router.get('/documents', controller.requireUser, controller.list);
  router.get('/documents/:id/download', controller.requireUser, controller.download);

  return router;
}

module.exports = { createDocumentRoutes };