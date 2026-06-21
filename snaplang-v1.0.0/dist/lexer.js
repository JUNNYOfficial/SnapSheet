"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = exports.LexerError = exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    // Literals
    TokenType["INT"] = "INT";
    TokenType["FLOAT"] = "FLOAT";
    TokenType["STRING"] = "STRING";
    TokenType["BOOL"] = "BOOL";
    TokenType["NIL"] = "NIL";
    // Identifiers
    TokenType["IDENT"] = "IDENT";
    // Keywords
    TokenType["LET"] = "LET";
    TokenType["VAR"] = "VAR";
    TokenType["CONST"] = "CONST";
    TokenType["FN"] = "FN";
    TokenType["IF"] = "IF";
    TokenType["ELSE"] = "ELSE";
    TokenType["FOR"] = "FOR";
    TokenType["WHILE"] = "WHILE";
    TokenType["LOOP"] = "LOOP";
    TokenType["RETURN"] = "RETURN";
    TokenType["BREAK"] = "BREAK";
    TokenType["CONTINUE"] = "CONTINUE";
    TokenType["IMPORT"] = "IMPORT";
    TokenType["FROM"] = "FROM";
    TokenType["AS"] = "AS";
    TokenType["MODULE"] = "MODULE";
    TokenType["STRUCT"] = "STRUCT";
    TokenType["ENUM"] = "ENUM";
    TokenType["TYPE"] = "TYPE";
    TokenType["MATCH"] = "MATCH";
    TokenType["TRY"] = "TRY";
    TokenType["CATCH"] = "CATCH";
    TokenType["THROW"] = "THROW";
    TokenType["AND"] = "AND";
    TokenType["OR"] = "OR";
    TokenType["NOT"] = "NOT";
    TokenType["IN"] = "IN";
    TokenType["TRUE"] = "TRUE";
    TokenType["FALSE"] = "FALSE";
    TokenType["NIL_KW"] = "NIL_KW";
    // Operators
    TokenType["PLUS"] = "PLUS";
    TokenType["MINUS"] = "MINUS";
    TokenType["STAR"] = "STAR";
    TokenType["SLASH"] = "SLASH";
    TokenType["PERCENT"] = "PERCENT";
    TokenType["POWER"] = "POWER";
    TokenType["FLOOR_DIV"] = "FLOOR_DIV";
    TokenType["ASSIGN"] = "ASSIGN";
    TokenType["PLUS_ASSIGN"] = "PLUS_ASSIGN";
    TokenType["MINUS_ASSIGN"] = "MINUS_ASSIGN";
    TokenType["STAR_ASSIGN"] = "STAR_ASSIGN";
    TokenType["SLASH_ASSIGN"] = "SLASH_ASSIGN";
    TokenType["PERCENT_ASSIGN"] = "PERCENT_ASSIGN";
    TokenType["EQ"] = "EQ";
    TokenType["NE"] = "NE";
    TokenType["LT"] = "LT";
    TokenType["GT"] = "GT";
    TokenType["LE"] = "LE";
    TokenType["GE"] = "GE";
    TokenType["ARROW"] = "ARROW";
    TokenType["FAT_ARROW"] = "FAT_ARROW";
    TokenType["PIPE"] = "PIPE";
    TokenType["NIL_COALESCE"] = "NIL_COALESCE";
    TokenType["OPTIONAL_CHAIN"] = "OPTIONAL_CHAIN";
    TokenType["RANGE"] = "RANGE";
    TokenType["RANGE_INCLUSIVE"] = "RANGE_INCLUSIVE";
    TokenType["ELLIPSIS"] = "ELLIPSIS";
    // Delimiters
    TokenType["LPAREN"] = "LPAREN";
    TokenType["RPAREN"] = "RPAREN";
    TokenType["LBRACKET"] = "LBRACKET";
    TokenType["RBRACKET"] = "RBRACKET";
    TokenType["LBRACE"] = "LBRACE";
    TokenType["RBRACE"] = "RBRACE";
    TokenType["COMMA"] = "COMMA";
    TokenType["COLON"] = "COLON";
    TokenType["SEMICOLON"] = "SEMICOLON";
    TokenType["DOT"] = "DOT";
    TokenType["BANG"] = "BANG";
    // Special
    TokenType["NEWLINE"] = "NEWLINE";
    TokenType["EOF"] = "EOF";
})(TokenType || (exports.TokenType = TokenType = {}));
class LexerError extends Error {
    line;
    column;
    constructor(message, line, column) {
        super(`[词法错误] 第 ${line} 行, 第 ${column} 列: ${message}`);
        this.line = line;
        this.column = column;
        this.name = "LexerError";
    }
}
exports.LexerError = LexerError;
const KEYWORDS = {
    let: TokenType.LET,
    var: TokenType.VAR,
    const: TokenType.CONST,
    fn: TokenType.FN,
    if: TokenType.IF,
    else: TokenType.ELSE,
    for: TokenType.FOR,
    while: TokenType.WHILE,
    loop: TokenType.LOOP,
    return: TokenType.RETURN,
    break: TokenType.BREAK,
    continue: TokenType.CONTINUE,
    import: TokenType.IMPORT,
    from: TokenType.FROM,
    as: TokenType.AS,
    module: TokenType.MODULE,
    struct: TokenType.STRUCT,
    enum: TokenType.ENUM,
    type: TokenType.TYPE,
    match: TokenType.MATCH,
    try: TokenType.TRY,
    catch: TokenType.CATCH,
    throw: TokenType.THROW,
    and: TokenType.AND,
    or: TokenType.OR,
    not: TokenType.NOT,
    in: TokenType.IN,
    true: TokenType.TRUE,
    false: TokenType.FALSE,
    nil: TokenType.NIL_KW,
};
class Lexer {
    source;
    pos = 0;
    line = 1;
    column = 1;
    tokens = [];
    constructor(source) {
        this.source = source;
    }
    tokenize() {
        while (!this.isAtEnd()) {
            this.scanToken();
        }
        this.tokens.push({ type: TokenType.EOF, value: "", line: this.line, column: this.column });
        return this.tokens;
    }
    scanToken() {
        const startLine = this.line;
        const startCol = this.column;
        const c = this.advance();
        const addToken = (type, value = c) => {
            this.tokens.push({ type, value, line: startLine, column: startCol });
        };
        switch (c) {
            // Whitespace
            case " ":
            case "\r":
            case "\t":
                break;
            case "\n":
                this.tokens.push({ type: TokenType.NEWLINE, value: "\n", line: startLine, column: startCol });
                this.line++;
                this.column = 1;
                break;
            // Single-char operators/delimiters
            case "(":
                addToken(TokenType.LPAREN);
                break;
            case ")":
                addToken(TokenType.RPAREN);
                break;
            case "[":
                addToken(TokenType.LBRACKET);
                break;
            case "]":
                addToken(TokenType.RBRACKET);
                break;
            case "{":
                addToken(TokenType.LBRACE);
                break;
            case "}":
                addToken(TokenType.RBRACE);
                break;
            case ",":
                addToken(TokenType.COMMA);
                break;
            case ";":
                addToken(TokenType.SEMICOLON);
                break;
            case "|":
                addToken(TokenType.PIPE);
                break;
            case "@":
                // Skip annotations for now
                this.skipAnnotation();
                break;
            // Multi-char operators
            case "+":
                addToken(this.match("=") ? TokenType.PLUS_ASSIGN : TokenType.PLUS);
                break;
            case "-":
                if (this.match(">"))
                    addToken(TokenType.ARROW);
                else if (this.match("="))
                    addToken(TokenType.MINUS_ASSIGN);
                else
                    addToken(TokenType.MINUS);
                break;
            case "*":
                addToken(this.match("*") ? TokenType.POWER : this.match("=") ? TokenType.STAR_ASSIGN : TokenType.STAR);
                break;
            case "/":
                if (this.match("/")) {
                    this.skipLineComment();
                }
                else if (this.match("*")) {
                    this.skipBlockComment();
                }
                else {
                    addToken(this.match("=") ? TokenType.SLASH_ASSIGN : TokenType.SLASH);
                }
                break;
            case "%":
                addToken(this.match("=") ? TokenType.PERCENT_ASSIGN : TokenType.PERCENT);
                break;
            case "=":
                addToken(this.match("=") ? TokenType.EQ : TokenType.ASSIGN);
                break;
            case "!":
                addToken(this.match("=") ? TokenType.NE : TokenType.BANG);
                break;
            case "<":
                if (this.match("="))
                    addToken(TokenType.LE);
                else if (this.match("-"))
                    addToken(TokenType.ARROW);
                else
                    addToken(TokenType.LT);
                break;
            case ">":
                addToken(this.match("=") ? TokenType.GE : TokenType.GT);
                break;
            case ":":
                addToken(TokenType.COLON);
                break;
            case ".":
                if (this.match(".")) {
                    if (this.match("."))
                        addToken(TokenType.ELLIPSIS);
                    else
                        addToken(TokenType.RANGE);
                }
                else {
                    addToken(TokenType.DOT);
                }
                break;
            case "?":
                if (this.match("?"))
                    addToken(TokenType.NIL_COALESCE);
                else if (this.match("."))
                    addToken(TokenType.OPTIONAL_CHAIN);
                else
                    this.error("无法识别的字符 '?'");
                break;
            // Strings
            case '"':
            case "'":
            case "`":
                this.readString(c);
                break;
            // Numbers
            default:
                if (this.isDigit(c)) {
                    this.readNumber(c);
                }
                else if (this.isAlpha(c)) {
                    this.readIdentifier(c);
                }
                else {
                    this.error(`无法识别的字符 '${c}'`);
                }
                break;
        }
    }
    advance() {
        const c = this.source[this.pos];
        this.pos++;
        this.column++;
        return c;
    }
    peek() {
        if (this.isAtEnd())
            return "\0";
        return this.source[this.pos];
    }
    peekNext() {
        if (this.pos + 1 >= this.source.length)
            return "\0";
        return this.source[this.pos + 1];
    }
    match(expected) {
        if (this.isAtEnd())
            return false;
        if (this.source[this.pos] !== expected)
            return false;
        this.pos++;
        this.column++;
        return true;
    }
    isAtEnd() {
        return this.pos >= this.source.length;
    }
    isDigit(c) {
        return c >= "0" && c <= "9";
    }
    isAlpha(c) {
        return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
    }
    isAlphaNumeric(c) {
        return this.isAlpha(c) || this.isDigit(c);
    }
    readString(quote) {
        const startLine = this.line;
        const startCol = this.column - 1;
        let value = "";
        while (this.peek() !== quote && !this.isAtEnd()) {
            if (this.peek() === "\\" && quote !== "`") {
                this.advance();
                const escaped = this.advance();
                switch (escaped) {
                    case "n":
                        value += "\n";
                        break;
                    case "t":
                        value += "\t";
                        break;
                    case "r":
                        value += "\r";
                        break;
                    case "\\":
                        value += "\\";
                        break;
                    case '"':
                        value += '"';
                        break;
                    case "'":
                        value += "'";
                        break;
                    default:
                        value += escaped;
                }
            }
            else if (this.peek() === "\n") {
                if (quote !== "`") {
                    this.error("字符串不能跨行，请使用反引号 ` 表示多行字符串");
                }
                value += this.advance();
                this.line++;
                this.column = 1;
            }
            else {
                value += this.advance();
            }
        }
        if (this.isAtEnd()) {
            this.error("未终止的字符串字面量");
        }
        this.advance(); // closing quote
        this.tokens.push({ type: TokenType.STRING, value, line: startLine, column: startCol });
    }
    readNumber(first) {
        const startLine = this.line;
        const startCol = this.column - 1;
        let value = first;
        while (this.isDigit(this.peek())) {
            value += this.advance();
        }
        if (this.peek() === "." && this.isDigit(this.peekNext())) {
            value += this.advance();
            while (this.isDigit(this.peek())) {
                value += this.advance();
            }
        }
        if (this.peek() === "e" || this.peek() === "E") {
            value += this.advance();
            if (this.peek() === "+" || this.peek() === "-") {
                value += this.advance();
            }
            while (this.isDigit(this.peek())) {
                value += this.advance();
            }
        }
        const isFloat = value.includes(".") || value.includes("e") || value.includes("E");
        this.tokens.push({
            type: isFloat ? TokenType.FLOAT : TokenType.INT,
            value,
            line: startLine,
            column: startCol,
        });
    }
    readIdentifier(first) {
        const startLine = this.line;
        const startCol = this.column - 1;
        let value = first;
        while (this.isAlphaNumeric(this.peek())) {
            value += this.advance();
        }
        const type = KEYWORDS[value] || TokenType.IDENT;
        this.tokens.push({ type, value, line: startLine, column: startCol });
    }
    skipLineComment() {
        while (this.peek() !== "\n" && !this.isAtEnd()) {
            this.advance();
        }
    }
    skipBlockComment() {
        let depth = 1;
        while (depth > 0 && !this.isAtEnd()) {
            if (this.peek() === "/" && this.peekNext() === "*") {
                this.advance();
                this.advance();
                depth++;
            }
            else if (this.peek() === "*" && this.peekNext() === "/") {
                this.advance();
                this.advance();
                depth--;
            }
            else {
                if (this.advance() === "\n") {
                    this.line++;
                    this.column = 1;
                }
            }
        }
    }
    skipAnnotation() {
        while (!this.isAtEnd() && this.peek() !== "\n" && this.peek() !== " ") {
            this.advance();
        }
    }
    error(message) {
        throw new LexerError(message, this.line, this.column);
    }
}
exports.Lexer = Lexer;
//# sourceMappingURL=lexer.js.map