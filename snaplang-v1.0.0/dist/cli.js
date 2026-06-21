#!/usr/bin/env node
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const index_1 = require("./index");
function printHelp() {
    console.log(`
SnapLang CLI v1.0.0

用法:
  snap <文件.snap> [选项]
  snap --help
  snap --version

选项:
  --help, -h      显示帮助信息
  --version, -v   显示版本号
  --ast           输出抽象语法树 (未实现)
  --tokens        输出词法 Token 流 (未实现)

示例:
  snap examples/budget_report.snap
`);
}
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
        printHelp();
        process.exit(args.length === 0 ? 1 : 0);
    }
    if (args.includes("--version") || args.includes("-v")) {
        console.log("SnapLang v1.0.0");
        process.exit(0);
    }
    const filePath = args[0];
    if (!filePath.endsWith(".snap")) {
        console.error(`[错误] 不支持的文件类型: ${filePath}`);
        console.error("SnapLang 源文件应以 .snap 结尾");
        process.exit(1);
    }
    if (!fs.existsSync(filePath)) {
        console.error(`[错误] 找不到文件: ${path.resolve(filePath)}`);
        process.exit(1);
    }
    const source = fs.readFileSync(filePath, "utf-8");
    const { success, error } = (0, index_1.run)(source);
    if (!success) {
        console.error(error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=cli.js.map