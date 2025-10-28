import CloneStorage from './CloneStorage.js';
import FileStorage from './FileStorage.js';
import SourceLine from './SourceLine.js';

const DEFAULT_CHUNK_SIZE = 5;

export default class CloneDetector {
  constructor({ chunkSize = DEFAULT_CHUNK_SIZE } = {}) {
    this.chunkSize = chunkSize;
  }

  process(file) {
    this.#filterLines(file);
    this.#splitIntoChunks(file);
    this.#detectMatches(file);
    FileStorage.addFile(file);
    return file;
  }

  #filterLines(file) {
    const lines = [];
    const rawLines = file.contents.split(/\r?\n/);
    let insideBlock = false;

    rawLines.forEach((rawLine, index) => {
      let text = rawLine;
      const trimmed = rawLine.trim();

      if (insideBlock) {
        if (trimmed.includes('*/')) {
          insideBlock = false;
        }
        text = '';
      } else if (trimmed.startsWith('/*')) {
        insideBlock = !trimmed.includes('*/');
        text = '';
      } else if (trimmed.startsWith('//') || trimmed.length === 0) {
        text = '';
      }

      lines.push(new SourceLine(text, index + 1));
    });

    file.lines = lines;
    return lines;
  }

  #splitIntoChunks(file) {
    const meaningful = file.lines.filter((line) => line.normalised.length > 0);
    file.meaningfulLines = meaningful;
    const chunks = [];

    for (let i = 0; i <= meaningful.length - this.chunkSize; i += 1) {
      const lines = meaningful.slice(i, i + this.chunkSize);
      const signature = lines.map((line) => line.normalised).join('\n');
      const chunk = {
        lines,
        signature,
        startLine: lines[0].number,
        endLine: lines[lines.length - 1].number,
        index: i
      };
      chunks.push(chunk);
    }

    file.chunks = chunks;
    return chunks;
  }

  #detectMatches(file) {
    const consolidated = new Map();

    for (const chunk of file.chunks) {
      const candidates = FileStorage.findChunkMatches(chunk.signature);
      for (const { file: otherFile, chunk: otherChunk } of candidates) {
        if (otherFile.name === file.name && otherChunk.startLine === chunk.startLine) {
          continue;
        }

        const expanded = this.#expandClone(file, chunk, otherFile, otherChunk);
        const key = this.#cloneKey(expanded);

        const existing = consolidated.get(key);
        if (!existing || expanded.length > existing.length) {
          consolidated.set(key, expanded);
        }
      }
    }

    const instances = [];
    for (const cloneData of consolidated.values()) {
      const stored = CloneStorage.addClone(cloneData);
      instances.push(stored);
    }

    file.instances = instances;
    return instances;
  }

  #expandClone(file, chunk, otherFile, otherChunk) {
    const fileLines = this.#ensureMeaningfulLines(file);
    const otherLines = this.#ensureMeaningfulLines(otherFile);

    let startIndex = chunk.index;
    let otherStartIndex = otherChunk.index;
    let length = chunk.lines.length;

    while (startIndex > 0 && otherStartIndex > 0) {
      const prevLine = fileLines[startIndex - 1];
      const prevOther = otherLines[otherStartIndex - 1];
      if (prevLine.normalised !== prevOther.normalised) {
        break;
      }
      startIndex -= 1;
      otherStartIndex -= 1;
      length += 1;
    }

    while (
      startIndex + length < fileLines.length &&
      otherStartIndex + length < otherLines.length
    ) {
      const nextLine = fileLines[startIndex + length];
      const nextOther = otherLines[otherStartIndex + length];
      if (nextLine.normalised !== nextOther.normalised) {
        break;
      }
      length += 1;
    }

    const matchedLines = fileLines.slice(startIndex, startIndex + length);
    const otherMatchedLines = otherLines.slice(otherStartIndex, otherStartIndex + length);

    if (matchedLines.length === 0 || otherMatchedLines.length === 0) {
      return {
        file: file.name,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        otherFile: otherFile.name,
        otherStart: otherChunk.startLine,
        otherEnd: otherChunk.endLine,
        length: chunk.lines.length,
        snippet: chunk.lines.map((line) => line.text).join('\n')
      };
    }

    const totalLength = matchedLines.length;

    return {
      file: file.name,
      startLine: matchedLines[0].number,
      endLine: matchedLines[matchedLines.length - 1].number,
      otherFile: otherFile.name,
      otherStart: otherMatchedLines[0].number,
      otherEnd: otherMatchedLines[otherMatchedLines.length - 1].number,
      length: totalLength,
      snippet: matchedLines.map((line) => line.text).join('\n')
    };
  }

  #cloneKey(data) {
    const first = [data.file, data.startLine, data.endLine].join(':');
    const second = [data.otherFile, data.otherStart, data.otherEnd].join(':');

    return first <= second ? `${first}|${second}` : `${second}|${first}`;
  }

  #ensureMeaningfulLines(file) {
    if (!file.meaningfulLines) {
      file.meaningfulLines = (file.lines ?? [])
        .filter((line) => line.normalised?.length > 0);
    }
    return file.meaningfulLines ?? [];
  }
}
