"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeError = void 0;
exports.createEnvironment = createEnvironment;
exports.defineVariable = defineVariable;
exports.getVariable = getVariable;
exports.setVariable = setVariable;
exports.isTruthy = isTruthy;
exports.stringify = stringify;
exports.isSnapFunction = isSnapFunction;
exports.isSnapNativeFunction = isSnapNativeFunction;
exports.makeNativeFunction = makeNativeFunction;
function createEnvironment(parent) {
    return {
        variables: new Map(),
        parent,
    };
}
function defineVariable(env, name, value, mutable = true, isConst = false) {
    env.variables.set(name, { value, mutable, isConst });
}
function getVariable(env, name) {
    const current = env.variables.get(name);
    if (current)
        return current.value;
    if (env.parent)
        return getVariable(env.parent, name);
    throw new RuntimeError(`未定义的标识符 '${name}'`);
}
function setVariable(env, name, value) {
    const current = env.variables.get(name);
    if (current) {
        if (current.isConst) {
            throw new RuntimeError(`不能重新赋值常量 '${name}'`);
        }
        if (!current.mutable) {
            throw new RuntimeError(`不能重新赋值不可变变量 '${name}'，请使用 var 声明可变变量`);
        }
        current.value = value;
        return;
    }
    if (env.parent) {
        setVariable(env.parent, name, value);
        return;
    }
    throw new RuntimeError(`未定义的标识符 '${name}'`);
}
function isTruthy(value) {
    if (value === null || value === undefined || value === false || value === 0 || value === "")
        return false;
    if (Array.isArray(value) && value.length === 0)
        return false;
    if (value instanceof Map && value.size === 0)
        return false;
    return true;
}
function stringify(value) {
    if (value === null)
        return "nil";
    if (value === undefined)
        return "nil";
    if (typeof value === "boolean")
        return value ? "true" : "false";
    if (typeof value === "number")
        return value.toString();
    if (typeof value === "string")
        return value;
    if (Array.isArray(value)) {
        return "[" + value.map(stringify).join(", ") + "]";
    }
    if (value instanceof Map) {
        const entries = [];
        value.forEach((v, k) => entries.push(`${k}: ${stringify(v)}`));
        return "{" + entries.join(", ") + "}";
    }
    if (isSnapFunction(value) || isSnapNativeFunction(value))
        return `<fn ${value.name}>`;
    if (value instanceof Date)
        return value.toISOString();
    if (value && typeof value === "object" && "kind" in value) {
        const obj = value;
        if (obj.kind === "SnapStruct")
            return `<struct ${obj.name}>`;
        if (obj.kind === "SnapEnum")
            return `<enum ${obj.name}>`;
        if (obj.kind === "SnapInstance")
            return `<${obj.type} instance>`;
    }
    return String(value);
}
function isSnapFunction(value) {
    return value !== null && typeof value === "object" && "kind" in value && value.kind === "SnapFunction";
}
function isSnapNativeFunction(value) {
    return value !== null && typeof value === "object" && "kind" in value && value.kind === "SnapNativeFunction";
}
function makeNativeFunction(name, fn) {
    return { kind: "SnapNativeFunction", name, fn, isNative: true };
}
class RuntimeError extends Error {
    constructor(message) {
        super(`[运行时错误] ${message}`);
        this.name = "RuntimeError";
    }
}
exports.RuntimeError = RuntimeError;
//# sourceMappingURL=environment.js.map