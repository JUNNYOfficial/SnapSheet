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
exports.createSheetModule = createSheetModule;
const environment_1 = require("../environment");
const fs = __importStar(require("fs"));
const workbookProxies = new WeakMap();
const worksheetProxies = new WeakMap();
function getWorkbook(value) {
    if (value instanceof Map) {
        const wb = workbookProxies.get(value);
        if (wb)
            return wb;
    }
    if (isWorkbook(value))
        return value;
    return undefined;
}
function getWorksheet(value) {
    if (value instanceof Map) {
        const ws = worksheetProxies.get(value);
        if (ws)
            return ws;
    }
    if (isWorksheet(value))
        return value;
    return undefined;
}
function createSheetModule() {
    const module = new Map();
    module.set("create", (0, environment_1.makeNativeFunction)("create", () => createWorkbookProxy(createWorkbook())));
    module.set("open", (0, environment_1.makeNativeFunction)("open", (filePath) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("sheet.open 路径必须是字符串");
        return createWorkbookProxy(loadWorkbook(filePath));
    }));
    module.set("fromArray", (0, environment_1.makeNativeFunction)("fromArray", (data) => {
        if (!Array.isArray(data))
            throw new environment_1.RuntimeError("fromArray 需要二维数组");
        const wb = createWorkbook();
        const ws = wb.sheets[0];
        for (let r = 0; r < data.length; r++) {
            const row = data[r];
            if (Array.isArray(row)) {
                for (let c = 0; c < row.length; c++) {
                    ws.cells[cellKey(r, c)] = row[c];
                }
            }
        }
        return createWorkbookProxy(wb);
    }));
    module.set("toCSV", (0, environment_1.makeNativeFunction)("toCSV", (wb) => {
        const realWb = getWorkbook(wb);
        if (!realWb)
            throw new environment_1.RuntimeError("toCSV 需要 Workbook");
        return workbookToCSV(realWb);
    }));
    return module;
}
function createWorkbook() {
    return {
        kind: "Workbook",
        sheets: [{ kind: "Worksheet", name: "Sheet1", cells: {} }],
    };
}
function loadWorkbook(filePath) {
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
        const content = fs.readFileSync(filePath, "utf-8");
        const rows = parseCSV(content);
        const wb = createWorkbook();
        const ws = wb.sheets[0];
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                ws.cells[cellKey(r, c)] = rows[r][c];
            }
        }
        wb.filePath = filePath;
        return wb;
    }
    if (ext === "json") {
        const content = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(content);
        const wb = createWorkbook();
        if (Array.isArray(data)) {
            const ws = wb.sheets[0];
            for (let r = 0; r < data.length; r++) {
                const row = data[r];
                if (Array.isArray(row)) {
                    for (let c = 0; c < row.length; c++) {
                        ws.cells[cellKey(r, c)] = row[c];
                    }
                }
                else if (typeof row === "object") {
                    const cols = Object.keys(row);
                    for (let c = 0; c < cols.length; c++) {
                        ws.cells[cellKey(r, c)] = row[cols[c]];
                    }
                }
            }
        }
        wb.filePath = filePath;
        return wb;
    }
    throw new environment_1.RuntimeError(`不支持的文件格式: ${ext}。请使用 .csv 或 .json`);
}
function isWorkbook(value) {
    return value !== null && typeof value === "object" && "kind" in value && value.kind === "Workbook";
}
function isWorksheet(value) {
    return value !== null && typeof value === "object" && "kind" in value && value.kind === "Worksheet";
}
function cellKey(row, col) {
    return `${colToName(col)}${row + 1}`;
}
function colToName(col) {
    let result = "";
    let n = col;
    do {
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return result;
}
function nameToCol(name) {
    let result = 0;
    for (const c of name) {
        result = result * 26 + (c.charCodeAt(0) - 64);
    }
    return result - 1;
}
function parseCell(ref) {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match)
        throw new environment_1.RuntimeError(`无效的单元格引用: ${ref}`);
    return { row: parseInt(match[2], 10) - 1, col: nameToCol(match[1]) };
}
function parseCSV(content) {
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
    return lines.map((line) => line.split(",").map((cell) => cell.trim()));
}
function escapeCSV(value) {
    const s = (0, environment_1.stringify)(value);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}
function workbookToCSV(wb) {
    const ws = wb.sheets[0];
    const refs = Object.keys(ws.cells);
    if (refs.length === 0)
        return "";
    const cells = refs.map(parseCell);
    const maxRow = Math.max(...cells.map((c) => c.row));
    const maxCol = Math.max(...cells.map((c) => c.col));
    const rows = [];
    for (let r = 0; r <= maxRow; r++) {
        const row = [];
        for (let c = 0; c <= maxCol; c++) {
            row.push(escapeCSV(ws.cells[cellKey(r, c)] ?? ""));
        }
        rows.push(row);
    }
    return rows.map((row) => row.join(",")).join("\n");
}
function createWorkbookProxy(wb) {
    const proxy = new Map();
    workbookProxies.set(proxy, wb);
    proxy.set("sheets", (0, environment_1.makeNativeFunction)("sheets", () => wb.sheets.map((s) => s.name)));
    proxy.set("activeSheet", (0, environment_1.makeNativeFunction)("activeSheet", () => createWorksheetProxy(wb.sheets[0])));
    proxy.set("createSheet", (0, environment_1.makeNativeFunction)("createSheet", (name) => {
        const ws = { kind: "Worksheet", name: typeof name === "string" ? name : `Sheet${wb.sheets.length + 1}`, cells: {} };
        wb.sheets.push(ws);
        return createWorksheetProxy(ws);
    }));
    proxy.set("save", (0, environment_1.makeNativeFunction)("save", (filePath) => {
        const path = typeof filePath === "string" ? filePath : wb.filePath;
        if (!path)
            throw new environment_1.RuntimeError("保存工作簿需要提供文件路径");
        const ext = path.split(".").pop()?.toLowerCase();
        if (ext === "csv") {
            fs.writeFileSync(path, workbookToCSV(wb));
        }
        else if (ext === "json") {
            fs.writeFileSync(path, JSON.stringify(workbookToArray(wb), null, 2));
        }
        else {
            throw new environment_1.RuntimeError(`不支持的保存格式: ${ext}`);
        }
        return true;
    }));
    proxy.set("toArray", (0, environment_1.makeNativeFunction)("toArray", () => workbookToArray(wb)));
    proxy.set("toCSV", (0, environment_1.makeNativeFunction)("toCSV", () => workbookToCSV(wb)));
    return proxy;
}
function workbookToArray(wb) {
    const ws = wb.sheets[0];
    const refs = Object.keys(ws.cells);
    if (refs.length === 0)
        return [];
    const cells = refs.map(parseCell);
    const maxRow = Math.max(...cells.map((c) => c.row));
    const maxCol = Math.max(...cells.map((c) => c.col));
    const rows = [];
    for (let r = 0; r <= maxRow; r++) {
        const row = [];
        for (let c = 0; c <= maxCol; c++) {
            row.push(ws.cells[cellKey(r, c)] ?? null);
        }
        rows.push(row);
    }
    return rows;
}
function createWorksheetProxy(ws) {
    const proxy = new Map();
    worksheetProxies.set(proxy, ws);
    proxy.set("name", (0, environment_1.makeNativeFunction)("name", () => ws.name));
    proxy.set("get", (0, environment_1.makeNativeFunction)("get", (ref) => {
        if (typeof ref === "string")
            return ws.cells[ref] ?? null;
        throw new environment_1.RuntimeError("get 需要字符串单元格引用");
    }));
    proxy.set("set", (0, environment_1.makeNativeFunction)("set", (ref, value) => {
        if (typeof ref === "string")
            ws.cells[ref] = value;
        else if (typeof ref === "number") {
            // (row, col, value)
            // This is tricky with variadic; handled via args order
        }
        return value;
    }));
    proxy.set("getRange", (0, environment_1.makeNativeFunction)("getRange", (range) => {
        if (typeof range !== "string")
            throw new environment_1.RuntimeError("getRange 需要范围字符串");
        return getRangeValues(ws, range);
    }));
    proxy.set("setRange", (0, environment_1.makeNativeFunction)("setRange", (range, values) => {
        if (typeof range !== "string")
            throw new environment_1.RuntimeError("setRange 需要范围字符串");
        if (!Array.isArray(values))
            throw new environment_1.RuntimeError("setRange 需要二维数组");
        setRangeValues(ws, range, values);
        return values;
    }));
    proxy.set("rowCount", (0, environment_1.makeNativeFunction)("rowCount", () => {
        const refs = Object.keys(ws.cells);
        if (refs.length === 0)
            return 0;
        return Math.max(...refs.map(parseCell).map((c) => c.row)) + 1;
    }));
    proxy.set("colCount", (0, environment_1.makeNativeFunction)("colCount", () => {
        const refs = Object.keys(ws.cells);
        if (refs.length === 0)
            return 0;
        return Math.max(...refs.map(parseCell).map((c) => c.col)) + 1;
    }));
    proxy.set("sum", (0, environment_1.makeNativeFunction)("sum", (range) => sumRange(ws, range)));
    proxy.set("avg", (0, environment_1.makeNativeFunction)("avg", (range) => avgRange(ws, range)));
    proxy.set("max", (0, environment_1.makeNativeFunction)("max", (range) => maxRange(ws, range)));
    proxy.set("min", (0, environment_1.makeNativeFunction)("min", (range) => minRange(ws, range)));
    return proxy;
}
function getRangeValues(ws, range) {
    const [start, end] = range.split(":");
    const s = parseCell(start);
    const e = parseCell(end || start);
    const result = [];
    for (let r = s.row; r <= e.row; r++) {
        const row = [];
        for (let c = s.col; c <= e.col; c++) {
            row.push(ws.cells[cellKey(r, c)] ?? null);
        }
        result.push(row);
    }
    return result;
}
function setRangeValues(ws, range, values) {
    const [start] = range.split(":");
    const s = parseCell(start);
    for (let r = 0; r < values.length; r++) {
        const row = values[r];
        if (!Array.isArray(row))
            continue;
        for (let c = 0; c < row.length; c++) {
            ws.cells[cellKey(s.row + r, s.col + c)] = row[c];
        }
    }
}
function rangeNumbers(ws, range) {
    let values = [];
    if (typeof range === "string") {
        values = getRangeValues(ws, range).flat();
    }
    else if (Array.isArray(range)) {
        values = range.flat();
    }
    return values.filter((v) => typeof v === "number");
}
function sumRange(ws, range) {
    return rangeNumbers(ws, range).reduce((a, b) => a + b, 0);
}
function avgRange(ws, range) {
    const nums = rangeNumbers(ws, range);
    return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}
function maxRange(ws, range) {
    const nums = rangeNumbers(ws, range);
    return nums.length > 0 ? Math.max(...nums) : 0;
}
function minRange(ws, range) {
    const nums = rangeNumbers(ws, range);
    return nums.length > 0 ? Math.min(...nums) : 0;
}
//# sourceMappingURL=sheet.js.map