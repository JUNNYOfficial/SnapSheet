import type { Token } from '../types';

export class Lexer {
  private pos = 0;
  private input: string;

  constructor(input: string) {
    this.input = input.startsWith('=') ? input.slice(1) : input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const token = this.nextToken();
      if (token) tokens.push(token);
    }
    tokens.push({ type: 'EOF', value: '' });
    return tokens;
  }

  private nextToken(): Token | null {
    this.skipWhitespace();
    if (this.pos >= this.input.length) return null;

    const ch = this.input[this.pos];

    if (ch === '+') {
      this.pos++;
      return { type: 'PLUS', value: '+' };
    }
    if (ch === '-') {
      this.pos++;
      return { type: 'MINUS', value: '-' };
    }
    if (ch === '*') {
      this.pos++;
      return { type: 'MULTIPLY', value: '*' };
    }
    if (ch === '/') {
      this.pos++;
      return { type: 'DIVIDE', value: '/' };
    }
    if (ch === '&') {
      this.pos++;
      return { type: 'AMPERSAND', value: '&' };
    }
    if (ch === '(') {
      this.pos++;
      return { type: 'LPAREN', value: '(' };
    }
    if (ch === ')') {
      this.pos++;
      return { type: 'RPAREN', value: ')' };
    }
    if (ch === ',') {
      this.pos++;
      return { type: 'COMMA', value: ',' };
    }
    if (ch === '=') {
      this.pos++;
      return { type: 'EQ', value: '=' };
    }
    if (ch === '>') {
      if (this.pos + 1 < this.input.length && this.input[this.pos + 1] === '=') {
        this.pos += 2;
        return { type: 'GTE', value: '>=' };
      }
      this.pos++;
      return { type: 'GT', value: '>' };
    }
    if (ch === '<') {
      if (this.pos + 1 < this.input.length && this.input[this.pos + 1] === '=') {
        this.pos += 2;
        return { type: 'LTE', value: '<=' };
      }
      if (this.pos + 1 < this.input.length && this.input[this.pos + 1] === '>') {
        this.pos += 2;
        return { type: 'NEQ', value: '<>' };
      }
      this.pos++;
      return { type: 'LT', value: '<' };
    }
    if (ch === '"' || ch === "'") {
      return this.readString(ch);
    }
    if (this.isDigit(ch) || ch === '.') {
      return this.readNumber();
    }
    if (this.isLetter(ch)) {
      return this.readIdentifier();
    }
    this.pos++;
    return null;
  }

  private readString(quote: string): Token {
    this.pos++;
    let value = '';
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      value += this.input[this.pos];
      this.pos++;
    }
    this.pos++;
    return { type: 'STRING', value };
  }

  private readNumber(): Token {
    let value = '';
    while (this.pos < this.input.length && (this.isDigit(this.input[this.pos]) || this.input[this.pos] === '.')) {
      value += this.input[this.pos];
      this.pos++;
    }
    return { type: 'NUMBER', value };
  }

  private readIdentifier(): Token {
    let value = '';
    let hasLetters = false;
    let hasDigits = false;
    const startPos = this.pos;

    while (this.pos < this.input.length && (this.isLetter(this.input[this.pos]) || this.isDigit(this.input[this.pos]))) {
      if (this.isLetter(this.input[this.pos])) hasLetters = true;
      if (this.isDigit(this.input[this.pos])) hasDigits = true;
      value += this.input[this.pos];
      this.pos++;
    }

    const isCellRef = hasLetters && hasDigits && /^[A-Z]+\d+$/.test(value);
    if (isCellRef) {
      if (this.pos < this.input.length && this.input[this.pos] === ':') {
        this.pos++;
        let secondRef = '';
        while (this.pos < this.input.length && (this.isLetter(this.input[this.pos]) || this.isDigit(this.input[this.pos]))) {
          secondRef += this.input[this.pos];
          this.pos++;
        }
        return { type: 'RANGE', value: value + ':' + secondRef };
      }
      return { type: 'CELL_REF', value };
    }

    if (this.pos < this.input.length && this.input[this.pos] === '(') {
      return { type: 'FUNCTION', value: value.toUpperCase() };
    }
    void startPos;
    return { type: 'STRING', value };
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isLetter(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
  }
}
