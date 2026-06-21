"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimeModule = createTimeModule;
const environment_1 = require("../environment");
function createTimeModule() {
    const module = new Map();
    module.set("now", (0, environment_1.makeNativeFunction)("now", () => new Date()));
    module.set("today", (0, environment_1.makeNativeFunction)("today", () => new Date()));
    module.set("fromTimestamp", (0, environment_1.makeNativeFunction)("fromTimestamp", (seconds) => {
        if (typeof seconds !== "number")
            throw new environment_1.RuntimeError("fromTimestamp 需要数字");
        return new Date(seconds * 1000);
    }));
    module.set("fromTimestampMs", (0, environment_1.makeNativeFunction)("fromTimestampMs", (ms) => {
        if (typeof ms !== "number")
            throw new environment_1.RuntimeError("fromTimestampMs 需要数字");
        return new Date(ms);
    }));
    module.set("parse", (0, environment_1.makeNativeFunction)("parse", (input) => {
        if (typeof input !== "string")
            throw new environment_1.RuntimeError("parse 需要字符串");
        const date = new Date(input);
        if (isNaN(date.getTime()))
            throw new environment_1.RuntimeError(`无法解析日期: ${input}`);
        return date;
    }));
    module.set("sleep", (0, environment_1.makeNativeFunction)("sleep", (ms) => {
        if (typeof ms !== "number")
            throw new environment_1.RuntimeError("sleep 需要数字");
        const start = Date.now();
        while (Date.now() - start < ms) {
            // Busy wait for simplicity
        }
        return null;
    }));
    module.set("format", (0, environment_1.makeNativeFunction)("format", (date, template) => {
        if (!(date instanceof Date))
            throw new environment_1.RuntimeError("format 第一个参数必须是 Date");
        if (typeof template !== "string")
            throw new environment_1.RuntimeError("format 模板必须是字符串");
        return formatDate(date, template);
    }));
    return module;
}
function pad(n, len = 2) {
    return n.toString().padStart(len, "0");
}
function formatDate(date, template) {
    const map = {
        YYYY: date.getFullYear().toString(),
        MM: pad(date.getMonth() + 1),
        DD: pad(date.getDate()),
        HH: pad(date.getHours()),
        mm: pad(date.getMinutes()),
        ss: pad(date.getSeconds()),
    };
    return template.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => map[match] || match);
}
//# sourceMappingURL=time.js.map