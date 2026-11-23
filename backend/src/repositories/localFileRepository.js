const fs = require('node:fs/promises');
const path = require('node:path');

class LocalFileRepository {
  constructor(storageDir) {
    this.storageDir = path.resolve(storageDir);
  }

  getPath(storageKey) {
    if (!storageKey || path.basename(storageKey) !== storageKey || storageKey.includes('\\')) {
      throw new Error('Invalid storage key');
    }

    const filePath = path.resolve(this.storageDir, storageKey);
    if (!filePath.startsWith(`${this.storageDir}${path.sep}`)) {
      throw new Error('Invalid storage key');
    }

    return filePath;
  }

  async exists(storageKey) {
    try {
      await fs.access(this.getPath(storageKey));
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async remove(storageKey) {
    try {
      await fs.unlink(this.getPath(storageKey));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

module.exports = { LocalFileRepository };