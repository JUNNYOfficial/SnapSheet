"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMathModule = createMathModule;
const environment_1 = require("../environment");
function createMathModule() {
    const module = new Map();
    module.set("PI", Math.PI);
    module.set("E", Math.E);
    module.set("TAU", Math.PI * 2);
    module.set("INFINITY", Infinity);
    module.set("NEG_INFINITY", -Infinity);
    module.set("NAN", NaN);
    const add = (name, fn) => module.set(name, (0, environment_1.makeNativeFunction)(name, fn));
    add("abs", (x) => requireNumber(x, "abs") && Math.abs(x));
    add("ceil", (x) => requireNumber(x, "ceil") && Math.ceil(x));
    add("floor", (x) => requireNumber(x, "floor") && Math.floor(x));
    add("round", (x) => requireNumber(x, "round") && Math.round(x));
    add("trunc", (x) => requireNumber(x, "trunc") && Math.trunc(x));
    add("sign", (x) => requireNumber(x, "sign") && Math.sign(x));
    add("pow", (base, exp) => requireNumber(base, "pow") && requireNumber(exp, "pow") && Math.pow(base, exp));
    add("sqrt", (x) => requireNumber(x, "sqrt") && Math.sqrt(x));
    add("cbrt", (x) => requireNumber(x, "cbrt") && Math.cbrt(x));
    add("exp", (x) => requireNumber(x, "exp") && Math.exp(x));
    add("log", (x) => requireNumber(x, "log") && Math.log(x));
    add("log10", (x) => requireNumber(x, "log10") && Math.log10(x));
    add("log2", (x) => requireNumber(x, "log2") && Math.log2(x));
    add("sin", (x) => requireNumber(x, "sin") && Math.sin(x));
    add("cos", (x) => requireNumber(x, "cos") && Math.cos(x));
    add("tan", (x) => requireNumber(x, "tan") && Math.tan(x));
    add("asin", (x) => requireNumber(x, "asin") && Math.asin(x));
    add("acos", (x) => requireNumber(x, "acos") && Math.acos(x));
    add("atan", (x) => requireNumber(x, "atan") && Math.atan(x));
    add("atan2", (y, x) => requireNumber(y, "atan2") && requireNumber(x, "atan2") && Math.atan2(y, x));
    add("sinh", (x) => requireNumber(x, "sinh") && Math.sinh(x));
    add("cosh", (x) => requireNumber(x, "cosh") && Math.cosh(x));
    add("tanh", (x) => requireNumber(x, "tanh") && Math.tanh(x));
    add("clamp", (value, min, max) => {
        requireNumber(value, "clamp");
        requireNumber(min, "clamp");
        requireNumber(max, "clamp");
        return Math.max(min, Math.min(value, max));
    });
    add("mod", (a, b) => requireNumber(a, "mod") && requireNumber(b, "mod") && a % b);
    add("random", () => Math.random());
    add("randomInt", (min, max) => {
        requireNumber(min, "randomInt");
        requireNumber(max, "randomInt");
        return Math.floor(Math.random() * (max - min + 1)) + min;
    });
    add("gcd", (a, b) => {
        requireNumber(a, "gcd");
        requireNumber(b, "gcd");
        let x = Math.abs(a);
        let y = Math.abs(b);
        while (y !== 0) {
            const t = y;
            y = x % y;
            x = t;
        }
        return x;
    });
    add("lcm", (a, b) => {
        const g = module.get("gcd");
        return (a * b) / g.fn(a, b);
    });
    return module;
}
function requireNumber(value, name) {
    if (typeof value !== "number") {
        throw new environment_1.RuntimeError(`math.${name} 需要数字参数，得到 ${typeof value}`);
    }
    return true;
}
//# sourceMappingURL=math.js.map