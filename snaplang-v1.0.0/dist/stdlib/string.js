"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStringModule = createStringModule;
const environment_1 = require("../environment");
function createStringModule() {
    const module = new Map();
    module.set("join", (0, environment_1.makeNativeFunction)("join", (separator, ...items) => {
        const sep = (0, environment_1.stringify)(separator);
        return items.map(environment_1.stringify).join(sep);
    }));
    module.set("format", (0, environment_1.makeNativeFunction)("format", (template, ...args) => {
        if (typeof template !== "string")
            throw new environment_1.RuntimeError("format 模板必须是字符串");
        let i = 0;
        return template.replace(/\{\}/g, () => {
            if (i >= args.length)
                return "{}";
            return (0, environment_1.stringify)(args[i++]);
        });
    }));
    module.set("isBlank", (0, environment_1.makeNativeFunction)("isBlank", (s) => typeof s === "string" && s.trim().length === 0));
    module.set("isEmpty", (0, environment_1.makeNativeFunction)("isEmpty", (s) => typeof s === "string" && s.length === 0));
    module.set("repeat", (0, environment_1.makeNativeFunction)("repeat", (s, count) => {
        if (typeof s !== "string")
            throw new environment_1.RuntimeError("repeat 需要字符串");
        return s.repeat(Math.max(0, typeof count === "number" ? count : 0));
    }));
    module.set("reverse", (0, environment_1.makeNativeFunction)("reverse", (s) => {
        if (typeof s !== "string")
            throw new environment_1.RuntimeError("reverse 需要字符串");
        return s.split("").reverse().join("");
    }));
    module.set("lines", (0, environment_1.makeNativeFunction)("lines", (s) => {
        if (typeof s !== "string")
            throw new environment_1.RuntimeError("lines 需要字符串");
        return s.split(/\r?\n/);
    }));
    module.set("chars", (0, environment_1.makeNativeFunction)("chars", (s) => {
        if (typeof s !== "string")
            throw new environment_1.RuntimeError("chars 需要字符串");
        return s.split("");
    }));
    return module;
}
//# sourceMappingURL=string.js.map