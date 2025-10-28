import Clone from './Clone.js';

class CloneStorage {
  constructor() {
    this._clones = new Map();
  }

  addClone(data) {
    const clone = data instanceof Clone ? data : new Clone(data);
    const key = CloneStorage.#canonicalKey(clone);
    const existing = this._clones.get(key);
    if (!existing || clone.length > existing.length) {
      this._clones.set(key, clone);
      return clone;
    }
    return existing;
  }

  all() {
    return Array.from(this._clones.values());
  }

  clear() {
    this._clones.clear();
  }

  static #canonicalKey(clone) {
    const first = [clone.file, clone.startLine, clone.endLine];
    const second = [clone.otherFile, clone.otherStart, clone.otherEnd];

    if (CloneStorage.#compareTuple(first, second) <= 0) {
      return `${first.join(':')}|${second.join(':')}`;
    }

    return `${second.join(':')}|${first.join(':')}`;
  }

  static #compareTuple([nameA, startA, endA], [nameB, startB, endB]) {
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    if (startA < startB) return -1;
    if (startA > startB) return 1;
    if (endA < endB) return -1;
    if (endA > endB) return 1;
    return 0;
  }
}

const instance = new CloneStorage();
export default instance;
