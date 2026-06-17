import type { Token } from '../types';

export class Lexer {
  private input: string;
  private pos: number;

  constructor(input: string) {
    this.input = input;
    this.pos = 0;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      if (char === ' ' || char === '\t') {
        this.pos++;
        continue;
      }

      if (char === '=') {
        tokens.push({ type: 'EQ', value: '=' });
        this.pos++;
        continue;
      }

      if (char === '+') {
        tokens.push({ type: 'PLUS', value: '+' });
        this.pos++;
        continue;
      }

      if (char === '-') {
        tokens.push({ type: 'MINUS', value: '-' });
        this.pos++;
        continue;
      }

      if (char === '*') {
        tokens.push({ type: 'MULTIPLY', value: '*' });
        this.pos++;
        continue;
      }

      if (char === '/') {
        tokens.push({ type: 'DIVIDE', value: '/' });
        this.pos++;
        continue;
      }

      if (char === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        this.pos++;
        continue;
      }

      if (char === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        this.pos++;
        continue;
      }

      if (char === ',') {
        tokens.push({ type: 'COMMA', value: ',' });
        this.pos++;
        continue;
      }

      if (this.isDigit(char) || (char === '.' && this.isDigit(this.peekNext()))) {
        tokens.push(this.readNumber());
        continue;
      }

      if (this.isAlpha(char)) {
        const word = this.readWord();
        if (/^[A-Z]+\d+$/.test(word)) {
          if (this.peek() === ':' && this.isAlpha(this.peekNext())) {
            const nextWord = this.readWordAhead();
            if (/^[A-Z]+\d+$/.test(nextWord)) {
              tokens.push({ type: 'RANGE', value: word + ':' + nextWord });
              continue;
            }
          }
          tokens.push({ type: 'CELL_REF', value: word });
        } else {
          tokens.push({ type: 'FUNCTION', value: word });
        }
        continue;
      }

      this.pos++;
    }

    tokens.push({ type: 'EOF', value: '' });
    return tokens;
  }

  private readNumber(): Token {
    let value = '';
    while (this.pos < this.input.length && (this.isDigit(this.input[this.pos]) || this.input[this.pos] === '.')) {
      value += this.input[this.pos];
      this.pos++;
    }
    return { type: 'NUMBER', value };
  }

  private readWord(): string {
    let value = '';
    while (this.pos < this.input.length && (this.isAlpha(this.input[this.pos]) || this.isDigit(this.input[this.pos]))) {
      value += this.input[this.pos];
      this.pos++;
    }
    return value;
  }

  private readWordAhead(): string {
    let tempPos = this.pos + 1;
    let value = '';
    while (tempPos < this.input.length && (this.isAlpha(this.input[tempPos]) || this.isDigit(this.input[tempPos]))) {
      value += this.input[tempPos];
      tempPos++;
    }
    this.pos = tempPos;
    return value;
  }

  private peek(): string {
    return this.pos < this.input.length ? this.input[this.pos] : '';
  }

  private peekNext(): string {
    return this.pos + 1 < this.input.length ? this.input[this.pos + 1] : '';
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z');
  }
}
