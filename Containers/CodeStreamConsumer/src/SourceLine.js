export default class SourceLine {
  constructor(text, number) {
    this.text = text;
    this.number = number;
  }

  get normalised() {
    return SourceLine.normalise(this.text);
  }

  static normalise(text) {
    const strippedStrings = text
      .replace(/"(?:\\.|[^\\"])*"/g, '"STR"')
      .replace(/'(?:\\.|[^\\'])*'/g, "'CHR'");

    const replacedNumbers = strippedStrings.replace(/\b\d+(?:\.\d+)?\b/g, 'NUM');

    const replacedIdentifiers = replacedNumbers.replace(
      /[A-Za-z_][A-Za-z0-9_]*/g,
      (token) => (SourceLine.#keywords.has(token) ? token : 'ID')
    );

    return replacedIdentifiers.replace(/\s+/g, ' ').trim();
  }

  static #keywords = new Set([
    'abstract',
    'assert',
    'boolean',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'class',
    'const',
    'continue',
    'default',
    'do',
    'double',
    'else',
    'enum',
    'extends',
    'false',
    'final',
    'finally',
    'float',
    'for',
    'goto',
    'if',
    'implements',
    'import',
    'instanceof',
    'int',
    'interface',
    'long',
    'native',
    'new',
    'null',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'short',
    'static',
    'strictfp',
    'super',
    'switch',
    'synchronized',
    'this',
    'throw',
    'throws',
    'transient',
    'true',
    'try',
    'void',
    'volatile',
    'while'
  ]);
}
