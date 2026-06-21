"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = exports.ParserError = void 0;
const lexer_1 = require("./lexer");
class ParserError extends Error {
    line;
    column;
    constructor(message, line, column) {
        super(`[语法错误] 第 ${line} 行, 第 ${column} 列: ${message}`);
        this.line = line;
        this.column = column;
        this.name = "ParserError";
    }
}
exports.ParserError = ParserError;
// ===================== Parser =====================
class Parser {
    tokens;
    pos = 0;
    constructor(tokens) {
        this.tokens = tokens;
    }
    parse() {
        const statements = [];
        while (!this.isAtEnd()) {
            this.skipNewlines();
            if (this.isAtEnd())
                break;
            statements.push(this.parseDeclaration());
        }
        return { kind: "Program", statements };
    }
    parseDeclaration() {
        this.skipNewlines();
        if (this.match(lexer_1.TokenType.LET))
            return this.parseVarDecl(false, false);
        if (this.match(lexer_1.TokenType.VAR))
            return this.parseVarDecl(true, false);
        if (this.match(lexer_1.TokenType.CONST))
            return this.parseVarDecl(false, true);
        if (this.match(lexer_1.TokenType.FN))
            return this.parseFunctionDecl();
        if (this.match(lexer_1.TokenType.STRUCT))
            return this.parseStructDecl();
        if (this.match(lexer_1.TokenType.ENUM))
            return this.parseEnumDecl();
        if (this.match(lexer_1.TokenType.TYPE))
            return this.parseTypeDecl();
        if (this.match(lexer_1.TokenType.IMPORT))
            return this.parseImportStmt();
        return this.parseStatement();
    }
    parseVarDecl(mutable, isConst) {
        const { line, column } = this.previous();
        const name = this.consume(lexer_1.TokenType.IDENT, "变量声明后应跟标识符").value;
        let typeAnnotation;
        if (this.match(lexer_1.TokenType.COLON)) {
            typeAnnotation = this.parseTypeAnnotation();
        }
        let value = { kind: "LiteralExpr", value: null, line, column };
        if (this.match(lexer_1.TokenType.ASSIGN)) {
            value = this.parseExpression();
        }
        else if (!isConst) {
            value = { kind: "LiteralExpr", value: null, line, column };
        }
        else {
            this.error("常量声明必须初始化");
        }
        this.consumeStatementEnd();
        return { kind: "VarDecl", name, value, mutable, isConst, typeAnnotation, line, column };
    }
    parseFunctionDecl() {
        const { line, column } = this.previous();
        const name = this.consume(lexer_1.TokenType.IDENT, "函数声明后应跟函数名").value;
        this.consume(lexer_1.TokenType.LPAREN, "函数名后应跟 '('");
        const params = [];
        if (!this.check(lexer_1.TokenType.RPAREN)) {
            do {
                const isRest = this.match(lexer_1.TokenType.ELLIPSIS);
                const paramName = this.consume(lexer_1.TokenType.IDENT, "参数名应为标识符").value;
                let typeAnnotation;
                if (this.match(lexer_1.TokenType.COLON)) {
                    typeAnnotation = this.parseTypeAnnotation();
                }
                let defaultValue;
                if (this.match(lexer_1.TokenType.ASSIGN)) {
                    defaultValue = this.parseExpression();
                }
                params.push({ name: paramName, typeAnnotation, defaultValue, isRest });
            } while (this.match(lexer_1.TokenType.COMMA));
        }
        this.consume(lexer_1.TokenType.RPAREN, "参数列表后应跟 ')'");
        let returnType;
        if (this.match(lexer_1.TokenType.ARROW)) {
            returnType = this.parseTypeAnnotation();
        }
        let body;
        if (this.match(lexer_1.TokenType.ASSIGN)) {
            const expr = this.parseExpression();
            body = { kind: "BlockStmt", statements: [{ kind: "ReturnStmt", value: expr, line, column }], line, column };
        }
        else {
            body = this.parseBlock();
        }
        return { kind: "FunctionDecl", name, params, body, returnType, line, column };
    }
    parseStructDecl() {
        const { line, column } = this.previous();
        const name = this.consume(lexer_1.TokenType.IDENT, "结构体声明后应跟名称").value;
        this.consume(lexer_1.TokenType.LBRACE, "结构体名称后应跟 '{'");
        const fields = [];
        this.skipNewlines();
        while (!this.check(lexer_1.TokenType.RBRACE) && !this.isAtEnd()) {
            const fieldName = this.consume(lexer_1.TokenType.IDENT, "字段名应为标识符").value;
            let typeAnnotation;
            if (this.match(lexer_1.TokenType.COLON)) {
                typeAnnotation = this.parseTypeAnnotation();
            }
            let defaultValue;
            if (this.match(lexer_1.TokenType.ASSIGN)) {
                defaultValue = this.parseExpression();
            }
            fields.push({ name: fieldName, typeAnnotation, defaultValue });
            this.skipNewlines();
        }
        this.consume(lexer_1.TokenType.RBRACE, "结构体字段后应跟 '}'");
        return { kind: "StructDecl", name, fields, line, column };
    }
    parseEnumDecl() {
        const { line, column } = this.previous();
        const name = this.consume(lexer_1.TokenType.IDENT, "枚举声明后应跟名称").value;
        this.consume(lexer_1.TokenType.LBRACE, "枚举名称后应跟 '{'");
        const variants = [];
        this.skipNewlines();
        while (!this.check(lexer_1.TokenType.RBRACE) && !this.isAtEnd()) {
            const variantName = this.consume(lexer_1.TokenType.IDENT, "枚举变体名应为标识符").value;
            variants.push({ name: variantName });
            this.skipNewlines();
        }
        this.consume(lexer_1.TokenType.RBRACE, "枚举变体后应跟 '}'");
        return { kind: "EnumDecl", name, variants, line, column };
    }
    parseTypeDecl() {
        const { line, column } = this.previous();
        const name = this.consume(lexer_1.TokenType.IDENT, "类型别名声明后应跟名称").value;
        this.consume(lexer_1.TokenType.ASSIGN, "类型别名后应跟 '='");
        const typeExpr = this.parseTypeAnnotation();
        this.consumeStatementEnd();
        return { kind: "TypeDecl", name, typeExpr, line, column };
    }
    parseImportStmt() {
        const { line, column } = this.previous();
        let module;
        let names;
        let alias;
        let isRelative = false;
        if (this.check(lexer_1.TokenType.STRING)) {
            module = this.advance().value;
            isRelative = true;
            if (this.match(lexer_1.TokenType.AS)) {
                alias = this.consume(lexer_1.TokenType.IDENT, "as 后应跟别名").value;
            }
        }
        else if (this.check(lexer_1.TokenType.IDENT)) {
            const parts = [this.advance().value];
            while (this.match(lexer_1.TokenType.DOT)) {
                parts.push(this.consume(lexer_1.TokenType.IDENT, "模块路径应为标识符").value);
            }
            module = parts.join(".");
            if (this.match(lexer_1.TokenType.AS)) {
                alias = this.consume(lexer_1.TokenType.IDENT, "as 后应跟别名").value;
            }
        }
        else {
            this.error("import 后应跟模块名或字符串路径");
        }
        this.consumeStatementEnd();
        return { kind: "ImportStmt", module, names, alias, isRelative, line, column };
    }
    parseStatement() {
        this.skipNewlines();
        const { line, column } = this.peek();
        if (this.match(lexer_1.TokenType.IF))
            return this.parseIfStmt();
        if (this.match(lexer_1.TokenType.FOR))
            return this.parseForStmt();
        if (this.match(lexer_1.TokenType.WHILE))
            return this.parseWhileStmt();
        if (this.match(lexer_1.TokenType.LOOP))
            return this.parseLoopStmt();
        if (this.match(lexer_1.TokenType.RETURN))
            return this.parseReturnStmt();
        if (this.match(lexer_1.TokenType.BREAK)) {
            this.consumeStatementEnd();
            return { kind: "BreakStmt", line, column };
        }
        if (this.match(lexer_1.TokenType.CONTINUE)) {
            this.consumeStatementEnd();
            return { kind: "ContinueStmt", line, column };
        }
        if (this.match(lexer_1.TokenType.TRY))
            return this.parseTryCatchStmt();
        if (this.match(lexer_1.TokenType.THROW)) {
            const value = this.parseExpression();
            this.consumeStatementEnd();
            return { kind: "ThrowStmt", value, line, column };
        }
        if (this.check(lexer_1.TokenType.LBRACE))
            return this.parseBlock();
        return this.parseExpressionStmt();
    }
    parseIfStmt() {
        const { line, column } = this.previous();
        const condition = this.parseExpression();
        const thenBranch = this.parseBlockOrStatement();
        let elseBranch;
        if (this.match(lexer_1.TokenType.ELSE)) {
            if (this.check(lexer_1.TokenType.IF)) {
                this.advance();
                elseBranch = this.parseIfStmt();
            }
            else {
                elseBranch = this.parseBlockOrStatement();
            }
        }
        return { kind: "IfStmt", condition, thenBranch, elseBranch, line, column };
    }
    parseForStmt() {
        const { line, column } = this.previous();
        const first = this.consume(lexer_1.TokenType.IDENT, "for 后应跟迭代变量").value;
        let iterator = first;
        let indexVar;
        if (this.match(lexer_1.TokenType.COMMA)) {
            indexVar = first;
            iterator = this.consume(lexer_1.TokenType.IDENT, "迭代变量应为标识符").value;
        }
        this.consume(lexer_1.TokenType.IN, "for 变量后应跟 in");
        const iterable = this.parseExpression();
        const body = this.parseBlockOrStatement();
        return { kind: "ForStmt", iterator, indexVar, iterable, body, line, column };
    }
    parseWhileStmt() {
        const { line, column } = this.previous();
        const condition = this.parseExpression();
        const body = this.parseBlockOrStatement();
        return { kind: "WhileStmt", condition, body, line, column };
    }
    parseLoopStmt() {
        const { line, column } = this.previous();
        const body = this.parseBlockOrStatement();
        return { kind: "LoopStmt", body, line, column };
    }
    parseReturnStmt() {
        const { line, column } = this.previous();
        let value;
        if (!this.checkStatementEnd()) {
            value = this.parseExpression();
            this.consumeStatementEnd();
        }
        else {
            this.consumeStatementEnd();
        }
        return { kind: "ReturnStmt", value, line, column };
    }
    parseTryCatchStmt() {
        const { line, column } = this.previous();
        const tryBody = this.parseBlock();
        let catchVar;
        let catchBody;
        if (this.match(lexer_1.TokenType.CATCH)) {
            if (this.check(lexer_1.TokenType.IDENT)) {
                catchVar = this.advance().value;
            }
            catchBody = this.parseBlockOrStatement();
        }
        return { kind: "TryCatchStmt", tryBody, catchVar, catchBody, line, column };
    }
    parseBlockOrStatement() {
        this.skipNewlines();
        if (this.check(lexer_1.TokenType.LBRACE))
            return this.parseBlock();
        return this.parseStatement();
    }
    parseBlock() {
        const { line, column } = this.consume(lexer_1.TokenType.LBRACE, "代码块应以 '{' 开始");
        const statements = [];
        this.skipNewlines();
        while (!this.check(lexer_1.TokenType.RBRACE) && !this.isAtEnd()) {
            statements.push(this.parseDeclaration());
            this.skipNewlines();
        }
        this.consume(lexer_1.TokenType.RBRACE, "代码块应以 '}' 结束");
        return { kind: "BlockStmt", statements, line, column };
    }
    parseExpressionStmt() {
        const { line, column } = this.peek();
        const expression = this.parseExpression();
        this.consumeStatementEnd();
        return { kind: "ExprStmt", expression, line, column };
    }
    parseExpression() {
        return this.parseAssignment();
    }
    parseAssignment() {
        const expr = this.parseTernary();
        if (this.match(lexer_1.TokenType.ASSIGN) ||
            this.match(lexer_1.TokenType.PLUS_ASSIGN) ||
            this.match(lexer_1.TokenType.MINUS_ASSIGN) ||
            this.match(lexer_1.TokenType.STAR_ASSIGN) ||
            this.match(lexer_1.TokenType.SLASH_ASSIGN) ||
            this.match(lexer_1.TokenType.PERCENT_ASSIGN)) {
            const { line, column } = this.previous();
            const operator = this.previous().value;
            const value = this.parseAssignment();
            return { kind: "AssignExpr", target: expr, operator, value, line, column };
        }
        return expr;
    }
    parseTernary() {
        const expr = this.parseOr();
        if (this.match(lexer_1.TokenType.ELSE)) {
            // `if cond then a else b` handled in parseOr via then detection
            // This is for standalone ternary-like
            const { line, column } = this.previous();
            const elseExpr = this.parseTernary();
            return { kind: "TernaryExpr", condition: expr, thenExpr: expr, elseExpr, line, column };
        }
        return expr;
    }
    parseOr() {
        let expr = this.parseAnd();
        while (this.match(lexer_1.TokenType.OR)) {
            const { line, column } = this.previous();
            const right = this.parseAnd();
            expr = { kind: "BinaryExpr", left: expr, operator: "or", right, line, column };
        }
        return expr;
    }
    parseAnd() {
        let expr = this.parseEquality();
        while (this.match(lexer_1.TokenType.AND)) {
            const { line, column } = this.previous();
            const right = this.parseEquality();
            expr = { kind: "BinaryExpr", left: expr, operator: "and", right, line, column };
        }
        return expr;
    }
    parseEquality() {
        let expr = this.parseComparison();
        while (this.match(lexer_1.TokenType.EQ) || this.match(lexer_1.TokenType.NE)) {
            const { line, column } = this.previous();
            const operator = this.previous().value;
            const right = this.parseComparison();
            expr = { kind: "BinaryExpr", left: expr, operator, right, line, column };
        }
        return expr;
    }
    parseComparison() {
        let expr = this.parseTerm();
        while (this.match(lexer_1.TokenType.LT) ||
            this.match(lexer_1.TokenType.GT) ||
            this.match(lexer_1.TokenType.LE) ||
            this.match(lexer_1.TokenType.GE)) {
            const { line, column } = this.previous();
            const operator = this.previous().value;
            const right = this.parseTerm();
            expr = { kind: "BinaryExpr", left: expr, operator, right, line, column };
        }
        return expr;
    }
    parseTerm() {
        let expr = this.parseFactor();
        while (this.match(lexer_1.TokenType.PLUS) || this.match(lexer_1.TokenType.MINUS)) {
            const { line, column } = this.previous();
            const operator = this.previous().value;
            const right = this.parseFactor();
            expr = { kind: "BinaryExpr", left: expr, operator, right, line, column };
        }
        return expr;
    }
    parseFactor() {
        let expr = this.parsePower();
        while (this.match(lexer_1.TokenType.STAR) || this.match(lexer_1.TokenType.SLASH) || this.match(lexer_1.TokenType.PERCENT)) {
            const { line, column } = this.previous();
            const operator = this.previous().value;
            const right = this.parsePower();
            expr = { kind: "BinaryExpr", left: expr, operator, right, line, column };
        }
        return expr;
    }
    parsePower() {
        let expr = this.parseUnary();
        while (this.match(lexer_1.TokenType.POWER)) {
            const { line, column } = this.previous();
            const right = this.parseUnary();
            expr = { kind: "BinaryExpr", left: expr, operator: "**", right, line, column };
        }
        return expr;
    }
    parseUnary() {
        if (this.match(lexer_1.TokenType.MINUS) || this.match(lexer_1.TokenType.NOT) || this.match(lexer_1.TokenType.BANG)) {
            const { line, column } = this.previous();
            const operator = this.previous().value;
            const operand = this.parseUnary();
            return { kind: "UnaryExpr", operator, operand, line, column };
        }
        return this.parsePostfix();
    }
    parsePostfix() {
        let expr = this.parsePrimary();
        while (true) {
            if (this.match(lexer_1.TokenType.LPAREN)) {
                const { line, column } = this.previous();
                const args = [];
                if (!this.check(lexer_1.TokenType.RPAREN)) {
                    do {
                        args.push(this.parseExpression());
                    } while (this.match(lexer_1.TokenType.COMMA));
                }
                this.consume(lexer_1.TokenType.RPAREN, "函数调用参数后应跟 ')'");
                expr = { kind: "CallExpr", callee: expr, args, line, column };
            }
            else if (this.match(lexer_1.TokenType.LBRACKET)) {
                const { line, column } = this.previous();
                const index = this.parseExpression();
                this.consume(lexer_1.TokenType.RBRACKET, "索引后应跟 ']'");
                expr = { kind: "IndexExpr", object: expr, index, line, column };
            }
            else if (this.match(lexer_1.TokenType.DOT)) {
                const { line, column } = this.previous();
                const property = this.consume(lexer_1.TokenType.IDENT, "成员访问后应跟属性名").value;
                expr = { kind: "MemberExpr", object: expr, property, line, column };
            }
            else if (this.match(lexer_1.TokenType.OPTIONAL_CHAIN)) {
                const { line, column } = this.previous();
                const property = this.consume(lexer_1.TokenType.IDENT, "可选链后应跟属性名").value;
                expr = { kind: "MemberExpr", object: expr, property, line, column }; // evaluator handles nil
            }
            else {
                break;
            }
        }
        return expr;
    }
    parsePrimary() {
        this.skipNewlines();
        const { line, column } = this.peek();
        if (this.match(lexer_1.TokenType.TRUE))
            return { kind: "LiteralExpr", value: true, line, column };
        if (this.match(lexer_1.TokenType.FALSE))
            return { kind: "LiteralExpr", value: false, line, column };
        if (this.match(lexer_1.TokenType.NIL_KW))
            return { kind: "LiteralExpr", value: null, line, column };
        if (this.match(lexer_1.TokenType.INT)) {
            return { kind: "LiteralExpr", value: parseInt(this.previous().value, 10), line, column };
        }
        if (this.match(lexer_1.TokenType.FLOAT)) {
            return { kind: "LiteralExpr", value: parseFloat(this.previous().value), line, column };
        }
        if (this.match(lexer_1.TokenType.STRING)) {
            return { kind: "LiteralExpr", value: this.interpolateString(this.previous().value), line, column };
        }
        if (this.match(lexer_1.TokenType.IDENT)) {
            return { kind: "VarExpr", name: this.previous().value, line, column };
        }
        if (this.match(lexer_1.TokenType.LPAREN)) {
            const expr = this.parseExpression();
            this.consume(lexer_1.TokenType.RPAREN, "括号表达式后应跟 ')'");
            return expr;
        }
        if (this.match(lexer_1.TokenType.LBRACKET)) {
            return this.parseArrayOrMap(line, column);
        }
        if (this.match(lexer_1.TokenType.LBRACE)) {
            return this.parseBlockExpression(line, column);
        }
        if (this.match(lexer_1.TokenType.PIPE)) {
            return this.parseLambda(line, column);
        }
        if (this.match(lexer_1.TokenType.IF)) {
            return this.parseIfExpression(line, column);
        }
        if (this.match(lexer_1.TokenType.MATCH)) {
            return this.parseMatchExpression(line, column);
        }
        this.error(`意外的 token '${this.peek().value}' (${this.peek().type})`);
    }
    parseArrayOrMap(line, column) {
        const elements = [];
        const entries = [];
        let isMap = false;
        this.skipNewlines();
        while (!this.check(lexer_1.TokenType.RBRACKET) && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.check(lexer_1.TokenType.RBRACKET))
                break;
            if (this.check(lexer_1.TokenType.IDENT) && this.peekNext().type === lexer_1.TokenType.COLON) {
                isMap = true;
                const key = this.advance().value;
                this.advance(); // :
                const value = this.parseExpression();
                entries.push({ key, value });
            }
            else if (this.check(lexer_1.TokenType.STRING) && this.peekNext().type === lexer_1.TokenType.COLON) {
                isMap = true;
                const key = this.advance().value;
                this.advance(); // :
                const value = this.parseExpression();
                entries.push({ key, value });
            }
            else {
                elements.push(this.parseExpression());
            }
            this.skipNewlines();
            if (!this.match(lexer_1.TokenType.COMMA)) {
                // newline as separator: continue loop if next token is not ]
                this.skipNewlines();
                if (this.check(lexer_1.TokenType.RBRACKET))
                    break;
            }
        }
        this.consume(lexer_1.TokenType.RBRACKET, "数组/字典字面量后应跟 ']'");
        if (isMap) {
            return { kind: "MapExpr", entries, line, column };
        }
        return { kind: "ArrayExpr", elements, line, column };
    }
    parseBlockExpression(line, column) {
        const statements = [];
        this.skipNewlines();
        while (!this.check(lexer_1.TokenType.RBRACE) && !this.isAtEnd()) {
            statements.push(this.parseDeclaration());
            this.skipNewlines();
        }
        this.consume(lexer_1.TokenType.RBRACE, "块表达式后应跟 '}'");
        return { kind: "LiteralExpr", value: null, line, column }; // Block expr not fully used
    }
    parseLambda(line, column) {
        const params = [];
        if (!this.check(lexer_1.TokenType.PIPE)) {
            do {
                const name = this.consume(lexer_1.TokenType.IDENT, "Lambda 参数应为标识符").value;
                params.push({ name });
            } while (this.match(lexer_1.TokenType.COMMA));
        }
        this.consume(lexer_1.TokenType.PIPE, "Lambda 参数后应跟 '|'");
        let body;
        if (this.check(lexer_1.TokenType.LBRACE)) {
            body = this.parseBlock();
        }
        else {
            body = this.parseExpression();
        }
        return { kind: "LambdaExpr", params, body, line, column };
    }
    parseIfExpression(line, column) {
        const condition = this.parseExpression();
        this.consume(lexer_1.TokenType.ARROW, "if 表达式条件后应跟 '->'"); // Simplification: if cond -> expr else expr
        const thenExpr = this.parseExpression();
        let elseExpr = { kind: "LiteralExpr", value: null, line, column };
        if (this.match(lexer_1.TokenType.ELSE)) {
            elseExpr = this.parseExpression();
        }
        return { kind: "TernaryExpr", condition, thenExpr, elseExpr, line, column };
    }
    parseMatchExpression(line, column) {
        const value = this.parseExpression();
        this.consume(lexer_1.TokenType.LBRACE, "match 后应跟 '{'");
        const arms = [];
        this.skipNewlines();
        while (!this.check(lexer_1.TokenType.RBRACE) && !this.isAtEnd()) {
            const pattern = this.parseExpression();
            let guard;
            if (this.match(lexer_1.TokenType.IF)) {
                guard = this.parseExpression();
            }
            this.consume(lexer_1.TokenType.FAT_ARROW, "match 分支后应跟 '=>'");
            const body = this.parseExpression();
            arms.push({ pattern, guard, body });
            this.skipNewlines();
        }
        this.consume(lexer_1.TokenType.RBRACE, "match 分支后应跟 '}'");
        return { kind: "MatchExpr", value, arms, line, column };
    }
    parseTypeAnnotation() {
        let result = "";
        while (!this.checkStatementEnd() &&
            !this.check(lexer_1.TokenType.ASSIGN) &&
            !this.check(lexer_1.TokenType.COMMA) &&
            !this.check(lexer_1.TokenType.RPAREN) &&
            !this.check(lexer_1.TokenType.RBRACKET) &&
            !this.check(lexer_1.TokenType.RBRACE) &&
            !this.isAtEnd()) {
            result += this.advance().value;
        }
        return result.trim();
    }
    interpolateString(value) {
        return value.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, name) => {
            // Defer to runtime by wrapping in a special marker? For simplicity, leave as-is and handle in evaluator
            return `{${name}}`;
        });
    }
    consumeStatementEnd() {
        this.skipNewlines();
        if (this.check(lexer_1.TokenType.SEMICOLON)) {
            this.advance();
        }
        // newlines are statement terminators, handled by skipping
    }
    checkStatementEnd() {
        return this.check(lexer_1.TokenType.SEMICOLON) || this.check(lexer_1.TokenType.NEWLINE) || this.check(lexer_1.TokenType.RBRACE) || this.check(lexer_1.TokenType.EOF);
    }
    skipNewlines() {
        while (this.check(lexer_1.TokenType.NEWLINE)) {
            this.advance();
        }
    }
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }
    check(type) {
        if (this.isAtEnd())
            return false;
        return this.peek().type === type;
    }
    checkNext(type) {
        if (this.pos + 1 >= this.tokens.length)
            return false;
        return this.tokens[this.pos + 1].type === type;
    }
    advance() {
        if (!this.isAtEnd())
            this.pos++;
        return this.previous();
    }
    peek() {
        return this.tokens[this.pos];
    }
    peekNext() {
        if (this.pos + 1 >= this.tokens.length)
            return this.tokens[this.tokens.length - 1];
        return this.tokens[this.pos + 1];
    }
    previous() {
        return this.tokens[this.pos - 1];
    }
    isAtEnd() {
        return this.peek().type === lexer_1.TokenType.EOF;
    }
    consume(type, message) {
        if (this.check(type))
            return this.advance();
        this.error(message);
    }
    error(message) {
        const { line, column } = this.peek();
        throw new ParserError(message, line, column);
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map