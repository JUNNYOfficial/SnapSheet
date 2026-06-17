import type { Token, ASTNode } from '../types';

export class Parser {
  private tokens: Token[];
  private pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  parse(): ASTNode {
    if (this.current().type === 'EQ') {
      this.pos++;
    }
    return this.parseExpression();
  }

  private parseExpression(): ASTNode {
    return this.parseAdditive();
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    while (this.current().type === 'PLUS' || this.current().type === 'MINUS') {
      const op = this.current().type === 'PLUS' ? '+' : '-';
      this.pos++;
      const right = this.parseMultiplicative();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parsePrimary();
    while (this.current().type === 'MULTIPLY' || this.current().type === 'DIVIDE') {
      const op = this.current().type === 'MULTIPLY' ? '*' : '/';
      this.pos++;
      const right = this.parsePrimary();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  private parsePrimary(): ASTNode {
    const token = this.current();

    if (token.type === 'NUMBER') {
      this.pos++;
      return { type: 'number', value: parseFloat(token.value) };
    }

    if (token.type === 'CELL_REF') {
      this.pos++;
      return { type: 'cell', ref: token.value };
    }

    if (token.type === 'RANGE') {
      this.pos++;
      const [start, end] = token.value.split(':');
      return { type: 'range', start, end };
    }

    if (token.type === 'FUNCTION') {
      return this.parseFunction();
    }

    if (token.type === 'LPAREN') {
      this.pos++;
      const expr = this.parseExpression();
      if (this.current().type === 'RPAREN') {
        this.pos++;
      }
      return expr;
    }

    this.pos++;
    return { type: 'number', value: 0 };
  }

  private parseFunction(): ASTNode {
    const name = this.current().value;
    this.pos++;

    if (this.current().type !== 'LPAREN') {
      return { type: 'cell', ref: name };
    }
    this.pos++;

    const args: ASTNode[] = [];
    if (this.current().type !== 'RPAREN') {
      args.push(this.parseExpression());
      while (this.current().type === 'COMMA') {
        this.pos++;
        args.push(this.parseExpression());
      }
    }

    if (this.current().type === 'RPAREN') {
      this.pos++;
    }

    return { type: 'function', name: name.toUpperCase(), args };
  }

  private current(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '' };
  }
}
