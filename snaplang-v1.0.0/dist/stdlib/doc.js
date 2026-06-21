"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDocModule = createDocModule;
const environment_1 = require("../environment");
const fs = __importStar(require("fs"));
function createDocModule() {
    const module = new Map();
    module.set("create", (0, environment_1.makeNativeFunction)("create", () => createDocumentProxy()));
    module.set("open", (0, environment_1.makeNativeFunction)("open", (filePath) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("doc.open 路径必须是字符串");
        const content = fs.readFileSync(filePath, "utf-8");
        return createDocumentProxy(content);
    }));
    return module;
}
function createDocument(initialContent = "") {
    return {
        kind: "Document",
        content: initialContent,
        paragraphs: initialContent ? initialContent.split(/\r?\n\r?\n/) : [],
    };
}
function createDocumentProxy(initialContent = "") {
    const doc = createDocument(initialContent);
    const proxy = new Map();
    proxy.set("addParagraph", (0, environment_1.makeNativeFunction)("addParagraph", (text, style) => {
        const t = text !== undefined ? (0, environment_1.stringify)(text) : "";
        const s = typeof style === "string" ? style : "Normal";
        if (s === "Heading1")
            doc.content += `# ${t}\n\n`;
        else if (s === "Heading2")
            doc.content += `## ${t}\n\n`;
        else if (s === "Heading3")
            doc.content += `### ${t}\n\n`;
        else
            doc.content += `${t}\n\n`;
        doc.paragraphs.push(t);
        return proxy;
    }));
    proxy.set("addHeading", (0, environment_1.makeNativeFunction)("addHeading", (text, level) => {
        const t = (0, environment_1.stringify)(text);
        const l = typeof level === "number" ? Math.max(1, Math.min(6, level)) : 1;
        doc.content += `${"#".repeat(l)} ${t}\n\n`;
        return proxy;
    }));
    proxy.set("addText", (0, environment_1.makeNativeFunction)("addText", (text) => {
        doc.content += (0, environment_1.stringify)(text);
        return proxy;
    }));
    proxy.set("addLine", (0, environment_1.makeNativeFunction)("addLine", () => {
        doc.content += "\n";
        return proxy;
    }));
    proxy.set("addTable", (0, environment_1.makeNativeFunction)("addTable", (rows, cols, data) => {
        const r = typeof rows === "number" ? rows : 0;
        const c = typeof cols === "number" ? cols : 0;
        const d = Array.isArray(data) ? data : [];
        let table = "";
        for (let i = 0; i < r; i++) {
            const row = [];
            const rowData = Array.isArray(d[i]) ? d[i] : [];
            for (let j = 0; j < c; j++) {
                const value = rowData[j] !== undefined ? (0, environment_1.stringify)(rowData[j]) : "";
                row.push(value);
            }
            table += `| ${row.join(" | ")} |\n`;
            if (i === 0) {
                table += `| ${row.map(() => "---").join(" | ")} |\n`;
            }
        }
        doc.content += table + "\n";
        return proxy;
    }));
    proxy.set("addList", (0, environment_1.makeNativeFunction)("addList", (items, ordered) => {
        if (!Array.isArray(items))
            throw new environment_1.RuntimeError("addList 需要数组");
        const isOrdered = isTruthy(ordered);
        items.forEach((item, index) => {
            const prefix = isOrdered ? `${index + 1}.` : "-";
            doc.content += `${prefix} ${(0, environment_1.stringify)(item)}\n`;
        });
        doc.content += "\n";
        return proxy;
    }));
    proxy.set("addImage", (0, environment_1.makeNativeFunction)("addImage", (src, alt) => {
        doc.content += `![${(0, environment_1.stringify)(alt)}](${(0, environment_1.stringify)(src)})\n\n`;
        return proxy;
    }));
    proxy.set("replace", (0, environment_1.makeNativeFunction)("replace", (oldText, newText) => {
        doc.content = doc.content.split((0, environment_1.stringify)(oldText)).join((0, environment_1.stringify)(newText));
        return proxy;
    }));
    proxy.set("replaceAll", (0, environment_1.makeNativeFunction)("replaceAll", (oldText, newText) => {
        doc.content = doc.content.split((0, environment_1.stringify)(oldText)).join((0, environment_1.stringify)(newText));
        return proxy;
    }));
    proxy.set("content", (0, environment_1.makeNativeFunction)("content", () => doc.content));
    proxy.set("text", (0, environment_1.makeNativeFunction)("text", () => doc.content));
    proxy.set("paragraphs", (0, environment_1.makeNativeFunction)("paragraphs", () => doc.paragraphs));
    proxy.set("save", (0, environment_1.makeNativeFunction)("save", (filePath) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("save 路径必须是字符串");
        fs.writeFileSync(filePath, doc.content);
        return true;
    }));
    proxy.set("toHTML", (0, environment_1.makeNativeFunction)("toHTML", () => markdownToHTML(doc.content)));
    return proxy;
}
function isTruthy(value) {
    if (value === null || value === undefined || value === false || value === 0 || value === "")
        return false;
    if (Array.isArray(value) && value.length === 0)
        return false;
    return true;
}
function markdownToHTML(md) {
    let html = md
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
        .replace(/\*(.*)\*/gim, "<em>$1</em>")
        .replace(/\n/gim, "<br>");
    return `<!DOCTYPE html><html><body>${html}</body></html>`;
}
//# sourceMappingURL=doc.js.map