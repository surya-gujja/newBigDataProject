export default class Clone {
  constructor({
    file,
    startLine,
    endLine,
    otherFile,
    otherStart,
    otherEnd,
    length,
    snippet
  }) {
    this.file = file;
    this.startLine = startLine;
    this.endLine = endLine;
    this.otherFile = otherFile;
    this.otherStart = otherStart;
    this.otherEnd = otherEnd;
    this.length = length;
    this.snippet = snippet;
  }

  get id() {
    return [
      this.file,
      this.startLine,
      this.endLine,
      this.otherFile,
      this.otherStart,
      this.otherEnd
    ].join(':');
  }
}
