/**
 * @file engine/Parser.ts
 * @description 公式语法分析器。
 *              基于递归下降算法将 Lexer 生成的 Token 序列解析为 AST。
 *              支持四则运算、比较运算、函数调用、单元格引用与区域引用。
 *              被 Evaluator.ts 调用以执行公式求值。
 */

import { Lexer } from './Lexer';
import type { Token, TokenType, ASTNode } from '../types';

export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(input: string) {
    const lexer = new Lexer(input);
    this.tokens = lexer.tokenize();
  }

  parse(): ASTNode {
    const result = this.parseExpression();
    if (this.current().type !== 'EOF') {
      throw new Error('Unexpected token: ' + this.current().value);
    }
    return result;
  }

  private parseExpression(): ASTNode {
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    let left = this.parseTerm();
    while (
      this.current().type === 'GT' ||
      this.current().type === 'LT' ||
      this.current().type === 'GTE' ||
      this.current().type === 'LTE' ||
      this.current().type === 'EQ' ||
      this.current().type === 'NEQ'
    ) {
      const op = this.current().value as '>' | '<' | '>=' | '<=' | '=' | '<>';
      this.pos++;
      const right = this.parseTerm();
      left = { type: 'comparison', op, left, right };
    }
    return left;
  }

  private parseTerm(): ASTNode {
    let left = this.parseFactor();
    while (this.current().type === 'PLUS' || this.current().type === 'MINUS') {
      const op = this.current().type === 'PLUS' ? '+' : '-';
      this.pos++;
      const right = this.parseFactor();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  private parseFactor(): ASTNode {
    let left = this.parsePrimary();
    while (
      this.current().type === 'MULTIPLY' ||
      this.current().type === 'DIVIDE' ||
      this.current().type === 'AMPERSAND'
    ) {
      const op = this.current().type === 'MULTIPLY' ? '*' : this.current().type === 'DIVIDE' ? '/' : '&';
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

    if (token.type === 'STRING') {
      this.pos++;
      return { type: 'string', value: token.value };
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
      const name = token.value;
      this.pos++;
      this.expect('LPAREN');
      const args: ASTNode[] = [];
      if (this.current().type !== 'RPAREN') {
        args.push(this.parseExpression());
        while (this.current().type === 'COMMA') {
          this.pos++;
          args.push(this.parseExpression());
        }
      }
      this.expect('RPAREN');
      return { type: 'function', name, args };
    }

    if (token.type === 'LPAREN') {
      this.pos++;
      const expr = this.parseExpression();
      this.expect('RPAREN');
      return expr;
    }

    if (token.type === 'MINUS') {
      this.pos++;
      const primary = this.parsePrimary();
      if (primary.type === 'number') {
        return { type: 'number', value: -primary.value };
      }
      return { type: 'binary', op: '-', left: { type: 'number', value: 0 }, right: primary };
    }

    throw new Error('Unexpected token: ' + token.value);
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private expect(type: TokenType): void {
    if (this.current().type !== type) {
      throw new Error('Expected ' + type + ' but got ' + this.current().type);
    }
    this.pos++;
  }
}
