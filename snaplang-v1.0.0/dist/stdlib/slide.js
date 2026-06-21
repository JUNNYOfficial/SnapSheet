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
exports.createSlideModule = createSlideModule;
const environment_1 = require("../environment");
const fs = __importStar(require("fs"));
function createSlideModule() {
    const module = new Map();
    module.set("create", (0, environment_1.makeNativeFunction)("create", () => createPresentationProxy()));
    module.set("open", (0, environment_1.makeNativeFunction)("open", (filePath) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("slide.open 路径必须是字符串");
        const content = fs.readFileSync(filePath, "utf-8");
        return createPresentationProxy(content);
    }));
    return module;
}
function createPresentation() {
    return {
        kind: "Presentation",
        slides: [],
        current: 0,
    };
}
function createPresentationProxy(initialContent = "") {
    const ppt = createPresentation();
    const proxy = new Map();
    proxy.set("addSlide", (0, environment_1.makeNativeFunction)("addSlide", (title, layout) => {
        const t = title !== undefined ? (0, environment_1.stringify)(title) : "";
        const slide = { title: t, content: t ? `# ${t}\n\n` : "" };
        ppt.slides.push(slide);
        ppt.current = ppt.slides.length - 1;
        return createSlideProxy(ppt, ppt.current);
    }));
    proxy.set("currentSlide", (0, environment_1.makeNativeFunction)("currentSlide", () => {
        if (ppt.slides.length === 0)
            throw new environment_1.RuntimeError("演示文稿没有幻灯片");
        return createSlideProxy(ppt, ppt.current);
    }));
    proxy.set("slides", (0, environment_1.makeNativeFunction)("slides", () => ppt.slides.length));
    proxy.set("deleteSlide", (0, environment_1.makeNativeFunction)("deleteSlide", (index) => {
        const idx = typeof index === "number" ? index : ppt.current;
        ppt.slides.splice(idx, 1);
        if (ppt.current >= ppt.slides.length)
            ppt.current = Math.max(0, ppt.slides.length - 1);
        return proxy;
    }));
    proxy.set("save", (0, environment_1.makeNativeFunction)("save", (filePath) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("save 路径必须是字符串");
        fs.writeFileSync(filePath, presentationToMarkdown(ppt));
        return true;
    }));
    proxy.set("toMarkdown", (0, environment_1.makeNativeFunction)("toMarkdown", () => presentationToMarkdown(ppt)));
    proxy.set("toHTML", (0, environment_1.makeNativeFunction)("toHTML", () => presentationToHTML(ppt)));
    proxy.set("exportHTML", (0, environment_1.makeNativeFunction)("exportHTML", (filePath) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("exportHTML 路径必须是字符串");
        fs.writeFileSync(filePath, presentationToHTML(ppt));
        return true;
    }));
    return proxy;
}
function createSlideProxy(ppt, index) {
    const slide = ppt.slides[index];
    const proxy = new Map();
    proxy.set("index", (0, environment_1.makeNativeFunction)("index", () => index));
    proxy.set("title", (0, environment_1.makeNativeFunction)("title", () => slide.title));
    proxy.set("setTitle", (0, environment_1.makeNativeFunction)("setTitle", (title) => {
        slide.title = (0, environment_1.stringify)(title);
        slide.content = slide.content.replace(/^# .*\n\n/, `# ${slide.title}\n\n`);
        return proxy;
    }));
    proxy.set("addText", (0, environment_1.makeNativeFunction)("addText", (text) => {
        slide.content += `${(0, environment_1.stringify)(text)}\n\n`;
        return proxy;
    }));
    proxy.set("addHeading", (0, environment_1.makeNativeFunction)("addHeading", (text, level) => {
        const t = (0, environment_1.stringify)(text);
        const l = typeof level === "number" ? Math.max(1, Math.min(6, level)) : 2;
        slide.content += `${"#".repeat(l)} ${t}\n\n`;
        return proxy;
    }));
    proxy.set("addList", (0, environment_1.makeNativeFunction)("addList", (items, ordered) => {
        if (!Array.isArray(items))
            throw new environment_1.RuntimeError("addList 需要数组");
        const isOrdered = isTruthy(ordered);
        items.forEach((item, i) => {
            const prefix = isOrdered ? `${i + 1}.` : "-";
            slide.content += `${prefix} ${(0, environment_1.stringify)(item)}\n`;
        });
        slide.content += "\n";
        return proxy;
    }));
    proxy.set("addTable", (0, environment_1.makeNativeFunction)("addTable", (rows, cols, data) => {
        const r = typeof rows === "number" ? rows : 0;
        const c = typeof cols === "number" ? cols : 0;
        const d = Array.isArray(data) ? data : [];
        for (let i = 0; i < r; i++) {
            const row = [];
            const rowData = Array.isArray(d[i]) ? d[i] : [];
            for (let j = 0; j < c; j++) {
                const value = rowData[j] !== undefined ? (0, environment_1.stringify)(rowData[j]) : "";
                row.push(value);
            }
            slide.content += `| ${row.join(" | ")} |\n`;
            if (i === 0) {
                slide.content += `| ${row.map(() => "---").join(" | ")} |\n`;
            }
        }
        slide.content += "\n";
        return proxy;
    }));
    proxy.set("addImage", (0, environment_1.makeNativeFunction)("addImage", (src, caption) => {
        slide.content += `![${(0, environment_1.stringify)(caption)}](${(0, environment_1.stringify)(src)})\n\n`;
        return proxy;
    }));
    proxy.set("content", (0, environment_1.makeNativeFunction)("content", () => slide.content));
    return proxy;
}
function presentationToMarkdown(ppt) {
    return ppt.slides.map((s, i) => `---\n\n## Slide ${i + 1}\n\n${s.content}`).join("\n");
}
function presentationToHTML(ppt) {
    const slidesHtml = ppt.slides
        .map((s, i) => {
        const body = markdownToHTML(s.content);
        return `<section class="slide">\n  <div class="slide-number">${i + 1}</div>\n  ${body}\n</section>`;
    })
        .join("\n");
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Presentation</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .slide { border: 1px solid #ddd; padding: 40px; margin-bottom: 30px; page-break-after: always; }
    .slide-number { color: #999; font-size: 14px; margin-bottom: 10px; }
    h1, h2, h3 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
  </style>
</head>
<body>
${slidesHtml}
</body>
</html>`;
}
function markdownToHTML(md) {
    return md
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
        .replace(/\*(.*)\*/gim, "<em>$1</em>")
        .replace(/\n/gim, "<br>");
}
function isTruthy(value) {
    if (value === null || value === undefined || value === false || value === 0 || value === "")
        return false;
    if (Array.isArray(value) && value.length === 0)
        return false;
    return true;
}
//# sourceMappingURL=slide.js.map