"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Evaluator = exports.Parser = exports.Lexer = void 0;
exports.run = run;
const lexer_1 = require("./lexer");
Object.defineProperty(exports, "Lexer", { enumerable: true, get: function () { return lexer_1.Lexer; } });
const parser_1 = require("./parser");
Object.defineProperty(exports, "Parser", { enumerable: true, get: function () { return parser_1.Parser; } });
const evaluator_1 = require("./evaluator");
Object.defineProperty(exports, "Evaluator", { enumerable: true, get: function () { return evaluator_1.Evaluator; } });
function run(source) {
    try {
        const lexer = new lexer_1.Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new parser_1.Parser(tokens);
        const ast = parser.parse();
        const evaluator = new evaluator_1.Evaluator();
        const result = evaluator.evaluateProgram(ast);
        return { success: true, result };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, result: null, error: message };
    }
}
//# sourceMappingURL=index.js.map