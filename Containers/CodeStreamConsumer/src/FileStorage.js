class FileStorage {
  constructor() {
    this._files = [];
    this._chunkIndex = new Map();
  }

  addFile(file) {
    this._files.push(file);
    for (const chunk of file.chunks) {
      const occurrences = this._chunkIndex.get(chunk.signature) ?? [];
      occurrences.push({
        file,
        chunk
      });
      this._chunkIndex.set(chunk.signature, occurrences);
    }
  }

  getAllFiles() {
    return [...this._files];
  }

  findChunkMatches(signature) {
    return this._chunkIndex.get(signature) ?? [];
  }

  clear() {
    this._files = [];
    this._chunkIndex = new Map();
  }
}

const instance = new FileStorage();
export default instance;
