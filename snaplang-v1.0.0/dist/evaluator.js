"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Evaluator = void 0;
const environment_1 = require("./environment");
const stdlib_1 = require("./stdlib");
class ReturnSignal {
    value;
    constructor(value) {
        this.value = value;
    }
}
class BreakSignal {
}
class ContinueSignal {
}
class Evaluator {
    globals;
    output = [];
    constructor() {
        this.globals = (0, environment_1.createEnvironment)();
        this.registerGlobals();
    }
    getOutput() {
        return this.output.join("");
    }
    clearOutput() {
        this.output = [];
    }
    evaluateProgram(program) {
        let result = null;
        for (const stmt of program.statements) {
            result = this.evaluateStatement(stmt, this.globals);
        }
        return result;
    }
    registerGlobals() {
        (0, environment_1.defineVariable)(this.globals, "print", (0, environment_1.makeNativeFunction)("print", (...args) => {
            const text = args.map(environment_1.stringify).join(" ");
            this.output.push(text);
            process.stdout.write(text);
            return null;
        }), false, true);
        (0, environment_1.defineVariable)(this.globals, "println", (0, environment_1.makeNativeFunction)("println", (...args) => {
            const text = args.map(environment_1.stringify).join(" ");
            this.output.push(text + "\n");
            console.log(text);
            return null;
        }), false, true);
        (0, environment_1.defineVariable)(this.globals, "int", (0, environment_1.makeNativeFunction)("int", (value) => {
            if (typeof value === "number")
                return Math.trunc(value);
            if (typeof value === "string") {
                const n = parseInt(value, 10);
                return isNaN(n) ? null : n;
            }
            return null;
        }), false, true);
        (0, environment_1.defineVariable)(this.globals, "float", (0, environment_1.makeNativeFunction)("float", (value) => {
            if (typeof value === "number")
                return value;
            if (typeof value === "string") {
                const n = parseFloat(value);
                return isNaN(n) ? null : n;
            }
            return null;
        }), false, true);
        (0, environment_1.defineVariable)(this.globals, "string", (0, environment_1.makeNativeFunction)("string", (value) => (0, environment_1.stringify)(value)), false, true);
        (0, environment_1.defineVariable)(this.globals, "bool", (0, environment_1.makeNativeFunction)("bool", (value) => (0, environment_1.isTruthy)(value)), false, true);
        (0, environment_1.defineVariable)(this.globals, "typeof", (0, environment_1.makeNativeFunction)("typeof", (value) => {
            if (value === null || value === undefined)
                return "Nil";
            if (typeof value === "number")
                return Number.isInteger(value) ? "Int" : "Float";
            if (typeof value === "string")
                return "String";
            if (typeof value === "boolean")
                return "Bool";
            if (Array.isArray(value))
                return "List";
            if (value instanceof Map)
                return "Map";
            if (value instanceof Date)
                return "Date";
            if ((0, environment_1.isSnapFunction)(value) || (0, environment_1.isSnapNativeFunction)(value))
                return "Function";
            if (value && typeof value === "object" && "kind" in value) {
                const obj = value;
                if (obj.kind === "SnapStruct")
                    return "Struct";
                if (obj.kind === "SnapEnum")
                    return "Enum";
                if (obj.kind === "SnapInstance")
                    return obj.type;
            }
            return "Object";
        }), false, true);
        (0, environment_1.defineVariable)(this.globals, "assert", (0, environment_1.makeNativeFunction)("assert", (condition, message) => {
            if (!(0, environment_1.isTruthy)(condition)) {
                throw new environment_1.RuntimeError(message ? (0, environment_1.stringify)(message) : "断言失败");
            }
            return null;
        }), false, true);
        (0, environment_1.defineVariable)(this.globals, "exit", (0, environment_1.makeNativeFunction)("exit", (code) => {
            process.exit(typeof code === "number" ? code : 0);
        }), false, true);
    }
    evaluateStatement(stmt, env) {
        switch (stmt.kind) {
            case "Program":
                return this.evaluateProgram(stmt);
            case "VarDecl":
                return this.evaluateVarDecl(stmt, env);
            case "FunctionDecl":
                return this.evaluateFunctionDecl(stmt, env);
            case "BlockStmt":
                return this.evaluateBlock(stmt, env);
            case "ExprStmt":
                return this.evaluateExpression(stmt.expression, env);
            case "IfStmt":
                return this.evaluateIfStmt(stmt, env);
            case "ForStmt":
                return this.evaluateForStmt(stmt, env);
            case "WhileStmt":
                return this.evaluateWhileStmt(stmt, env);
            case "LoopStmt":
                return this.evaluateLoopStmt(stmt, env);
            case "ReturnStmt":
                throw new ReturnSignal(stmt.value ? this.evaluateExpression(stmt.value, env) : null);
            case "BreakStmt":
                throw new BreakSignal();
            case "ContinueStmt":
                throw new ContinueSignal();
            case "ImportStmt":
                return this.evaluateImportStmt(stmt, env);
            case "StructDecl":
                return this.evaluateStructDecl(stmt, env);
            case "EnumDecl":
                return this.evaluateEnumDecl(stmt, env);
            case "TypeDecl":
                return null;
            case "ThrowStmt":
                throw new environment_1.RuntimeError((0, environment_1.stringify)(this.evaluateExpression(stmt.value, env)));
            case "TryCatchStmt":
                return this.evaluateTryCatchStmt(stmt, env);
            default:
                throw new environment_1.RuntimeError(`未知的语句类型: ${stmt.kind}`);
        }
    }
    evaluateVarDecl(stmt, env) {
        const value = this.evaluateExpression(stmt.value, env);
        (0, environment_1.defineVariable)(env, stmt.name, value, stmt.mutable, stmt.isConst);
        return value;
    }
    evaluateFunctionDecl(stmt, env) {
        const func = {
            kind: "SnapFunction",
            name: stmt.name,
            params: stmt.params,
            body: stmt.body,
            closure: env,
            isNative: false,
        };
        (0, environment_1.defineVariable)(env, stmt.name, func, false, true);
        return func;
    }
    evaluateBlock(stmt, env) {
        const blockEnv = (0, environment_1.createEnvironment)(env);
        let result = null;
        for (const s of stmt.statements) {
            result = this.evaluateStatement(s, blockEnv);
        }
        return result;
    }
    evaluateIfStmt(stmt, env) {
        const condition = this.evaluateExpression(stmt.condition, env);
        if ((0, environment_1.isTruthy)(condition)) {
            return this.evaluateStatement(stmt.thenBranch, env);
        }
        else if (stmt.elseBranch) {
            return this.evaluateStatement(stmt.elseBranch, env);
        }
        return null;
    }
    evaluateForStmt(stmt, env) {
        const iterable = this.evaluateExpression(stmt.iterable, env);
        const loopEnv = (0, environment_1.createEnvironment)(env);
        let result = null;
        if (Array.isArray(iterable)) {
            for (let i = 0; i < iterable.length; i++) {
                (0, environment_1.defineVariable)(loopEnv, stmt.iterator, iterable[i], false, false);
                if (stmt.indexVar) {
                    (0, environment_1.defineVariable)(loopEnv, stmt.indexVar, i, false, false);
                }
                try {
                    result = this.evaluateStatement(stmt.body, loopEnv);
                }
                catch (e) {
                    if (e instanceof BreakSignal)
                        break;
                    if (e instanceof ContinueSignal)
                        continue;
                    throw e;
                }
            }
        }
        else if (iterable instanceof Map) {
            let i = 0;
            for (const [key, value] of iterable) {
                (0, environment_1.defineVariable)(loopEnv, stmt.iterator, value, false, false);
                if (stmt.indexVar) {
                    (0, environment_1.defineVariable)(loopEnv, stmt.indexVar, key, false, false);
                }
                try {
                    result = this.evaluateStatement(stmt.body, loopEnv);
                }
                catch (e) {
                    if (e instanceof BreakSignal)
                        break;
                    if (e instanceof ContinueSignal)
                        continue;
                    throw e;
                }
                i++;
            }
        }
        else if (typeof iterable === "string") {
            for (let i = 0; i < iterable.length; i++) {
                (0, environment_1.defineVariable)(loopEnv, stmt.iterator, iterable[i], false, false);
                if (stmt.indexVar) {
                    (0, environment_1.defineVariable)(loopEnv, stmt.indexVar, i, false, false);
                }
                try {
                    result = this.evaluateStatement(stmt.body, loopEnv);
                }
                catch (e) {
                    if (e instanceof BreakSignal)
                        break;
                    if (e instanceof ContinueSignal)
                        continue;
                    throw e;
                }
            }
        }
        else {
            throw new environment_1.RuntimeError(`for 循环需要可迭代对象，得到 ${(0, environment_1.stringify)(iterable)}`);
        }
        return result;
    }
    evaluateWhileStmt(stmt, env) {
        let result = null;
        while ((0, environment_1.isTruthy)(this.evaluateExpression(stmt.condition, env))) {
            try {
                result = this.evaluateStatement(stmt.body, env);
            }
            catch (e) {
                if (e instanceof BreakSignal)
                    break;
                if (e instanceof ContinueSignal)
                    continue;
                throw e;
            }
        }
        return result;
    }
    evaluateLoopStmt(stmt, env) {
        let result = null;
        while (true) {
            try {
                result = this.evaluateStatement(stmt.body, env);
            }
            catch (e) {
                if (e instanceof BreakSignal)
                    break;
                if (e instanceof ContinueSignal)
                    continue;
                throw e;
            }
        }
        return result;
    }
    evaluateImportStmt(stmt, env) {
        const moduleName = stmt.module;
        const module = (0, stdlib_1.createStdlibModule)(moduleName);
        if (module === null) {
            throw new environment_1.RuntimeError(`找不到模块 '${moduleName}'`);
        }
        const name = stmt.alias || moduleName.split(".").pop() || moduleName;
        (0, environment_1.defineVariable)(env, name, module, false, true);
        return module;
    }
    evaluateStructDecl(stmt, env) {
        const struct = { kind: "SnapStruct", name: stmt.name, fields: stmt.fields };
        (0, environment_1.defineVariable)(env, stmt.name, struct, false, true);
        // Create constructor-like native function
        const ctor = (0, environment_1.makeNativeFunction)(stmt.name, (...args) => {
            const instance = {
                kind: "SnapInstance",
                type: stmt.name,
                fields: new Map(),
                methods: new Map(),
            };
            for (let i = 0; i < stmt.fields.length; i++) {
                const field = stmt.fields[i];
                const value = i < args.length ? args[i] : (field.defaultValue ? this.evaluateExpression(field.defaultValue, env) : null);
                instance.fields.set(field.name, value);
            }
            return instance;
        });
        (0, environment_1.defineVariable)(env, stmt.name, ctor, false, true);
        return struct;
    }
    evaluateEnumDecl(stmt, env) {
        const enm = { kind: "SnapEnum", name: stmt.name, variants: stmt.variants };
        (0, environment_1.defineVariable)(env, stmt.name, enm, false, true);
        return enm;
    }
    evaluateTryCatchStmt(stmt, env) {
        try {
            return this.evaluateStatement(stmt.tryBody, env);
        }
        catch (e) {
            if (e instanceof environment_1.RuntimeError) {
                const catchEnv = (0, environment_1.createEnvironment)(env);
                if (stmt.catchVar) {
                    (0, environment_1.defineVariable)(catchEnv, stmt.catchVar, e.message, false, false);
                }
                if (stmt.catchBody) {
                    return this.evaluateStatement(stmt.catchBody, catchEnv);
                }
                return null;
            }
            throw e;
        }
    }
    evaluateExpression(expr, env) {
        switch (expr.kind) {
            case "LiteralExpr":
                return this.evaluateLiteral(expr, env);
            case "VarExpr":
                return (0, environment_1.getVariable)(env, expr.name);
            case "BinaryExpr":
                return this.evaluateBinaryExpr(expr, env);
            case "UnaryExpr":
                return this.evaluateUnaryExpr(expr, env);
            case "CallExpr":
                return this.evaluateCallExpr(expr, env);
            case "MemberExpr":
                return this.evaluateMemberExpr(expr, env);
            case "IndexExpr":
                return this.evaluateIndexExpr(expr, env);
            case "AssignExpr":
                return this.evaluateAssignExpr(expr, env);
            case "ArrayExpr":
                return expr.elements.map((e) => this.evaluateExpression(e, env));
            case "MapExpr": {
                const map = new Map();
                for (const entry of expr.entries) {
                    map.set(entry.key, this.evaluateExpression(entry.value, env));
                }
                return map;
            }
            case "LambdaExpr":
                return this.evaluateLambdaExpr(expr, env);
            case "MatchExpr":
                return this.evaluateMatchExpr(expr, env);
            case "TernaryExpr":
                return (0, environment_1.isTruthy)(this.evaluateExpression(expr.condition, env))
                    ? this.evaluateExpression(expr.thenExpr, env)
                    : this.evaluateExpression(expr.elseExpr, env);
            default:
                throw new environment_1.RuntimeError(`未知的表达式类型: ${expr.kind}`);
        }
    }
    evaluateLiteral(expr, env) {
        if (typeof expr.value === "string") {
            return this.interpolateString(expr.value, env);
        }
        return expr.value;
    }
    interpolateString(value, env) {
        return value.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, name) => {
            try {
                return (0, environment_1.stringify)((0, environment_1.getVariable)(env, name));
            }
            catch {
                return `{${name}}`;
            }
        });
    }
    evaluateBinaryExpr(expr, env) {
        const left = this.evaluateExpression(expr.left, env);
        if (expr.operator === "and") {
            return (0, environment_1.isTruthy)(left) && (0, environment_1.isTruthy)(this.evaluateExpression(expr.right, env));
        }
        if (expr.operator === "or") {
            return (0, environment_1.isTruthy)(left) || (0, environment_1.isTruthy)(this.evaluateExpression(expr.right, env));
        }
        const right = this.evaluateExpression(expr.right, env);
        switch (expr.operator) {
            case "+":
                if (typeof left === "number" && typeof right === "number")
                    return left + right;
                if (typeof left === "string" || typeof right === "string")
                    return (0, environment_1.stringify)(left) + (0, environment_1.stringify)(right);
                if (Array.isArray(left) && Array.isArray(right))
                    return [...left, ...right];
                throw new environment_1.RuntimeError(`运算符 '+' 不支持 ${(0, environment_1.stringify)(left)} 和 ${(0, environment_1.stringify)(right)}`);
            case "-":
                if (typeof left === "number" && typeof right === "number")
                    return left - right;
                throw new environment_1.RuntimeError(`运算符 '-' 不支持 ${(0, environment_1.stringify)(left)} 和 ${(0, environment_1.stringify)(right)}`);
            case "*":
                if (typeof left === "number" && typeof right === "number")
                    return left * right;
                if (typeof left === "string" && typeof right === "number")
                    return left.repeat(Math.max(0, right));
                throw new environment_1.RuntimeError(`运算符 '*' 不支持 ${(0, environment_1.stringify)(left)} 和 ${(0, environment_1.stringify)(right)}`);
            case "/":
                if (typeof left === "number" && typeof right === "number") {
                    if (right === 0)
                        throw new environment_1.RuntimeError("除零错误");
                    return left / right;
                }
                throw new environment_1.RuntimeError(`运算符 '/' 不支持 ${(0, environment_1.stringify)(left)} 和 ${(0, environment_1.stringify)(right)}`);
            case "%":
                if (typeof left === "number" && typeof right === "number")
                    return left % right;
                throw new environment_1.RuntimeError(`运算符 '%' 不支持 ${(0, environment_1.stringify)(left)} 和 ${(0, environment_1.stringify)(right)}`);
            case "**":
                if (typeof left === "number" && typeof right === "number")
                    return Math.pow(left, right);
                throw new environment_1.RuntimeError(`运算符 '**' 不支持 ${(0, environment_1.stringify)(left)} 和 ${(0, environment_1.stringify)(right)}`);
            case "==":
                return left === right;
            case "!=":
                return left !== right;
            case "<":
                if (typeof left === "number" && typeof right === "number")
                    return left < right;
                if (typeof left === "string" && typeof right === "string")
                    return left < right;
                throw new environment_1.RuntimeError(`运算符 '<' 不支持 ${(0, environment_1.stringify)(left)} 和 ${(0, environment_1.stringify)(right)}`);
            case ">":
                if (typeof left === "number" && typeof right === "number")
                    return left > right;
                if (typeof left === "string" && typeof right === "string")
                    return left > right;
                throw new environment_1.RuntimeError(`运算符 '>' 不支持 ${(0, environment_1.stringify)(left)} 和 ${(0, environment_1.stringify)(right)}`);
            case "<=":
                if (typeof left === "number" && typeof right === "number")
                    return left <= right;
                if (typeof left === "string" && typeof right === "string")
                    return left <= right;
                throw new environment_1.RuntimeError(`运算符 '<=' 不支持 ${(0, environment_1.stringify)(left)} 和 ${(0, environment_1.stringify)(right)}`);
            case ">=":
                if (typeof left === "number" && typeof right === "number")
                    return left >= right;
                if (typeof left === "string" && typeof right === "string")
                    return left >= right;
                throw new environment_1.RuntimeError(`运算符 '>=' 不支持 ${(0, environment_1.stringify)(left)} 和 ${(0, environment_1.stringify)(right)}`);
            default:
                throw new environment_1.RuntimeError(`未知运算符 '${expr.operator}'`);
        }
    }
    evaluateUnaryExpr(expr, env) {
        const operand = this.evaluateExpression(expr.operand, env);
        switch (expr.operator) {
            case "-":
                if (typeof operand === "number")
                    return -operand;
                throw new environment_1.RuntimeError(`运算符 '-' 不支持 ${(0, environment_1.stringify)(operand)}`);
            case "not":
            case "!":
                return !(0, environment_1.isTruthy)(operand);
            default:
                throw new environment_1.RuntimeError(`未知一元运算符 '${expr.operator}'`);
        }
    }
    evaluateCallExpr(expr, env) {
        const callee = this.evaluateExpression(expr.callee, env);
        const args = expr.args.map((a) => this.evaluateExpression(a, env));
        if ((0, environment_1.isSnapNativeFunction)(callee)) {
            return callee.fn(...args);
        }
        if ((0, environment_1.isSnapFunction)(callee)) {
            const funcEnv = (0, environment_1.createEnvironment)(callee.closure || this.globals);
            for (let i = 0; i < callee.params.length; i++) {
                const param = callee.params[i];
                if (param.isRest) {
                    (0, environment_1.defineVariable)(funcEnv, param.name, args.slice(i), false, false);
                }
                else {
                    const value = i < args.length ? args[i] : (param.defaultValue ? this.evaluateExpression(param.defaultValue, env) : null);
                    (0, environment_1.defineVariable)(funcEnv, param.name, value, false, false);
                }
            }
            try {
                this.evaluateStatement(callee.body, funcEnv);
                return null;
            }
            catch (e) {
                if (e instanceof ReturnSignal)
                    return e.value;
                throw e;
            }
        }
        throw new environment_1.RuntimeError(`'${(0, environment_1.stringify)(callee)}' 不是可调用的函数`);
    }
    evaluateMemberExpr(expr, env) {
        const object = this.evaluateExpression(expr.object, env);
        if (object === null || object === undefined) {
            throw new environment_1.RuntimeError(`无法访问 nil 对象的成员 '${expr.property}'`);
        }
        // SnapInstance
        if (object && typeof object === "object" && "kind" in object && object.kind === "SnapInstance") {
            const instance = object;
            if (instance.fields.has(expr.property))
                return instance.fields.get(expr.property);
            if (instance.methods.has(expr.property))
                return instance.methods.get(expr.property);
            throw new environment_1.RuntimeError(`实例 '${instance.type}' 没有成员 '${expr.property}'`);
        }
        // Map (module / dict)
        if (object instanceof Map) {
            if (object.has(expr.property)) {
                const value = object.get(expr.property);
                if ((0, environment_1.isSnapFunction)(value) || (0, environment_1.isSnapNativeFunction)(value))
                    return value;
                // Wrap non-function values so repeated member access is consistent
                return value;
            }
            return this.callMapMethod(object, expr.property);
        }
        // Array
        if (Array.isArray(object)) {
            return this.callArrayMethod(object, expr.property);
        }
        // String
        if (typeof object === "string") {
            return this.callStringMethod(object, expr.property);
        }
        // Date
        if (object instanceof Date) {
            return this.callDateMethod(object, expr.property);
        }
        // Plain object (from native modules)
        if (object && typeof object === "object" && !(object instanceof Date) && !(object instanceof Map) && !Array.isArray(object)) {
            const obj = object;
            if (expr.property in obj)
                return obj[expr.property];
        }
        throw new environment_1.RuntimeError(`类型 '${typeof object}' 没有成员 '${expr.property}'`);
    }
    evaluateIndexExpr(expr, env) {
        const object = this.evaluateExpression(expr.object, env);
        const index = this.evaluateExpression(expr.index, env);
        if (Array.isArray(object)) {
            if (typeof index !== "number")
                throw new environment_1.RuntimeError("数组索引必须是数字");
            if (index < 0 || index >= object.length)
                throw new environment_1.RuntimeError(`数组索引越界: ${index}`);
            return object[index];
        }
        if (object instanceof Map) {
            if (typeof index !== "string")
                throw new environment_1.RuntimeError("Map 键必须是字符串");
            return object.has(index) ? object.get(index) : null;
        }
        if (typeof object === "string") {
            if (typeof index !== "number")
                throw new environment_1.RuntimeError("字符串索引必须是数字");
            if (index < 0 || index >= object.length)
                throw new environment_1.RuntimeError(`字符串索引越界: ${index}`);
            return object[index];
        }
        throw new environment_1.RuntimeError(`类型 '${typeof object}' 不支持索引访问`);
    }
    evaluateAssignExpr(expr, env) {
        const value = this.evaluateExpression(expr.value, env);
        if (expr.target.kind === "VarExpr") {
            (0, environment_1.setVariable)(env, expr.target.name, value);
            return value;
        }
        if (expr.target.kind === "MemberExpr") {
            const object = this.evaluateExpression(expr.target.object, env);
            const prop = expr.target.property;
            if (object && typeof object === "object" && "kind" in object && object.kind === "SnapInstance") {
                object.fields.set(prop, value);
                return value;
            }
            if (object instanceof Map) {
                object.set(prop, value);
                return value;
            }
            if (object && typeof object === "object" && !(object instanceof Date) && !(object instanceof Map) && !Array.isArray(object)) {
                object[prop] = value;
                return value;
            }
        }
        if (expr.target.kind === "IndexExpr") {
            const object = this.evaluateExpression(expr.target.object, env);
            const index = this.evaluateExpression(expr.target.index, env);
            if (Array.isArray(object)) {
                if (typeof index !== "number")
                    throw new environment_1.RuntimeError("数组索引必须是数字");
                object[index] = value;
                return value;
            }
            if (object instanceof Map) {
                if (typeof index !== "string")
                    throw new environment_1.RuntimeError("Map 键必须是字符串");
                object.set(index, value);
                return value;
            }
        }
        throw new environment_1.RuntimeError("赋值目标无效");
    }
    evaluateLambdaExpr(expr, env) {
        const func = {
            kind: "SnapFunction",
            name: "<lambda>",
            params: expr.params,
            body: expr.body.kind === "BlockStmt" ? expr.body : { kind: "BlockStmt", statements: [{ kind: "ReturnStmt", value: expr.body, line: expr.line, column: expr.column }], line: expr.line, column: expr.column },
            closure: env,
            isNative: false,
        };
        return func;
    }
    evaluateMatchExpr(expr, env) {
        const value = this.evaluateExpression(expr.value, env);
        for (const arm of expr.arms) {
            const pattern = this.evaluateExpression(arm.pattern, env);
            if (this.matchPattern(pattern, value)) {
                if (arm.guard && !(0, environment_1.isTruthy)(this.evaluateExpression(arm.guard, env)))
                    continue;
                return this.evaluateExpression(arm.body, env);
            }
        }
        throw new environment_1.RuntimeError("match 表达式没有匹配的分支");
    }
    matchPattern(pattern, value) {
        return pattern === value;
    }
    callArrayMethod(arr, method) {
        const binaryOp = (op) => (a, b) => {
            if (typeof a === "number" && typeof b === "number") {
                if (op === "+")
                    return a + b;
                if (op === "-")
                    return a - b;
                if (op === "*")
                    return a * b;
            }
            return 0;
        };
        const methods = {
            length: () => arr.length,
            push: (...args) => { arr.push(...args); return arr; },
            pop: () => arr.pop() ?? null,
            shift: () => arr.shift() ?? null,
            unshift: (...args) => { arr.unshift(...args); return arr; },
            get: (index) => (typeof index === "number" ? arr[index] ?? null : null),
            set: (index, value) => { if (typeof index === "number")
                arr[index] = value; return arr; },
            slice: (start, end) => arr.slice(typeof start === "number" ? start : 0, typeof end === "number" ? end : undefined),
            concat: (other) => Array.isArray(other) ? [...arr, ...other] : arr,
            indexOf: (item) => arr.indexOf(item),
            includes: (item) => arr.includes(item),
            join: (sep) => arr.join(typeof sep === "string" ? sep : ","),
            reverse: () => { arr.reverse(); return arr; },
            sort: (fn) => { arr.sort((a, b) => (fn && (0, environment_1.isSnapFunction)(fn) ? Number(this.callSnapFunction(fn, [a, b])) : a - b)); return arr; },
            filter: (fn) => arr.filter((x) => (0, environment_1.isTruthy)(this.callSnapFunction(fn, [x]))),
            map: (fn) => arr.map((x) => this.callSnapFunction(fn, [x])),
            reduce: (fn, initial) => arr.reduce((acc, x) => this.callSnapFunction(fn, [acc, x]), initial ?? 0),
            find: (fn) => arr.find((x) => (0, environment_1.isTruthy)(this.callSnapFunction(fn, [x]))) ?? null,
            some: (fn) => arr.some((x) => (0, environment_1.isTruthy)(this.callSnapFunction(fn, [x]))),
            every: (fn) => arr.every((x) => (0, environment_1.isTruthy)(this.callSnapFunction(fn, [x]))),
            sum: () => arr.reduce((a, b) => (typeof a === "number" && typeof b === "number" ? a + b : a), 0),
            avg: () => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
            min: () => Math.min(...arr),
            max: () => Math.max(...arr),
        };
        const fn = methods[method];
        if (!fn)
            throw new environment_1.RuntimeError(`数组没有方法 '${method}'`);
        return (0, environment_1.makeNativeFunction)(method, fn);
    }
    callMapMethod(map, method) {
        const methods = {
            get: (key) => (typeof key === "string" ? map.get(key) ?? null : null),
            set: (key, value) => { if (typeof key === "string")
                map.set(key, value); return map; },
            has: (key) => (typeof key === "string" ? map.has(key) : false),
            delete: (key) => { if (typeof key === "string")
                map.delete(key); return map; },
            keys: () => Array.from(map.keys()),
            values: () => Array.from(map.values()),
            size: () => map.size,
        };
        const fn = methods[method];
        if (!fn)
            throw new environment_1.RuntimeError(`Map 没有方法 '${method}'`);
        return (0, environment_1.makeNativeFunction)(method, fn);
    }
    callStringMethod(str, method) {
        const methods = {
            length: () => str.length,
            trim: () => str.trim(),
            upper: () => str.toUpperCase(),
            lower: () => str.toLowerCase(),
            capitalize: () => str.charAt(0).toUpperCase() + str.slice(1),
            contains: (sub) => str.includes((0, environment_1.stringify)(sub)),
            startsWith: (sub) => str.startsWith((0, environment_1.stringify)(sub)),
            endsWith: (sub) => str.endsWith((0, environment_1.stringify)(sub)),
            indexOf: (sub) => str.indexOf((0, environment_1.stringify)(sub)),
            replace: (oldVal, newVal) => str.replace((0, environment_1.stringify)(oldVal), (0, environment_1.stringify)(newVal)),
            replaceAll: (oldVal, newVal) => str.split((0, environment_1.stringify)(oldVal)).join((0, environment_1.stringify)(newVal)),
            split: (sep) => str.split((0, environment_1.stringify)(sep)),
            repeat: (count) => str.repeat(Math.max(0, typeof count === "number" ? count : 0)),
            padStart: (len, char) => str.padStart(typeof len === "number" ? len : 0, typeof char === "string" ? char : " "),
            padEnd: (len, char) => str.padEnd(typeof len === "number" ? len : 0, typeof char === "string" ? char : " "),
            substring: (start, end) => str.substring(typeof start === "number" ? start : 0, typeof end === "number" ? end : undefined),
        };
        const fn = methods[method];
        if (!fn)
            throw new environment_1.RuntimeError(`字符串没有方法 '${method}'`);
        return (0, environment_1.makeNativeFunction)(method, fn);
    }
    callDateMethod(date, method) {
        const methods = {
            year: () => date.getFullYear(),
            month: () => date.getMonth() + 1,
            day: () => date.getDate(),
            hour: () => date.getHours(),
            minute: () => date.getMinutes(),
            second: () => date.getSeconds(),
            weekday: () => date.getDay(),
            timestamp: () => Math.floor(date.getTime() / 1000),
            timestampMs: () => date.getTime(),
            toISOString: () => date.toISOString(),
        };
        const fn = methods[method];
        if (!fn)
            throw new environment_1.RuntimeError(`Date 没有方法 '${method}'`);
        return (0, environment_1.makeNativeFunction)(method, fn);
    }
    callSnapFunction(fn, args) {
        const funcEnv = (0, environment_1.createEnvironment)(fn.closure || this.globals);
        for (let i = 0; i < fn.params.length; i++) {
            const param = fn.params[i];
            if (param.isRest) {
                (0, environment_1.defineVariable)(funcEnv, param.name, args.slice(i), false, false);
            }
            else {
                const value = i < args.length ? args[i] : (param.defaultValue ? null : null);
                (0, environment_1.defineVariable)(funcEnv, param.name, value, false, false);
            }
        }
        try {
            this.evaluateStatement(fn.body, funcEnv);
            return null;
        }
        catch (e) {
            if (e instanceof ReturnSignal)
                return e.value;
            throw e;
        }
    }
}
exports.Evaluator = Evaluator;
//# sourceMappingURL=evaluator.js.map