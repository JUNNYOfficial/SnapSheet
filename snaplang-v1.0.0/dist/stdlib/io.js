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
exports.createIoModule = createIoModule;
const environment_1 = require("../environment");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function createIoModule() {
    const module = new Map();
    module.set("readFile", (0, environment_1.makeNativeFunction)("readFile", (filePath) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("readFile 路径必须是字符串");
        try {
            return fs.readFileSync(filePath, "utf-8");
        }
        catch (e) {
            throw new environment_1.RuntimeError(`无法读取文件 '${filePath}': ${e.message}`);
        }
    }));
    module.set("writeFile", (0, environment_1.makeNativeFunction)("writeFile", (filePath, content) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("writeFile 路径必须是字符串");
        try {
            fs.writeFileSync(filePath, (0, environment_1.stringify)(content));
            return true;
        }
        catch (e) {
            throw new environment_1.RuntimeError(`无法写入文件 '${filePath}': ${e.message}`);
        }
    }));
    module.set("appendFile", (0, environment_1.makeNativeFunction)("appendFile", (filePath, content) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("appendFile 路径必须是字符串");
        try {
            fs.appendFileSync(filePath, (0, environment_1.stringify)(content));
            return true;
        }
        catch (e) {
            throw new environment_1.RuntimeError(`无法追加文件 '${filePath}': ${e.message}`);
        }
    }));
    module.set("exists", (0, environment_1.makeNativeFunction)("exists", (filePath) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("exists 路径必须是字符串");
        return fs.existsSync(filePath);
    }));
    module.set("mkdir", (0, environment_1.makeNativeFunction)("mkdir", (dirPath) => {
        if (typeof dirPath !== "string")
            throw new environment_1.RuntimeError("mkdir 路径必须是字符串");
        try {
            fs.mkdirSync(dirPath, { recursive: true });
            return true;
        }
        catch (e) {
            throw new environment_1.RuntimeError(`无法创建目录 '${dirPath}': ${e.message}`);
        }
    }));
    module.set("remove", (0, environment_1.makeNativeFunction)("remove", (filePath) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("remove 路径必须是字符串");
        try {
            fs.rmSync(filePath, { recursive: true, force: true });
            return true;
        }
        catch (e) {
            throw new environment_1.RuntimeError(`无法删除 '${filePath}': ${e.message}`);
        }
    }));
    module.set("readLines", (0, environment_1.makeNativeFunction)("readLines", (filePath) => {
        if (typeof filePath !== "string")
            throw new environment_1.RuntimeError("readLines 路径必须是字符串");
        try {
            return fs.readFileSync(filePath, "utf-8").split(/\r?\n/);
        }
        catch (e) {
            throw new environment_1.RuntimeError(`无法读取文件 '${filePath}': ${e.message}`);
        }
    }));
    // Path utilities
    const pathModule = new Map();
    pathModule.set("join", (0, environment_1.makeNativeFunction)("join", (...args) => path.join(...args.map(environment_1.stringify))));
    pathModule.set("basename", (0, environment_1.makeNativeFunction)("basename", (p) => (typeof p === "string" ? path.basename(p) : "")));
    pathModule.set("dirname", (0, environment_1.makeNativeFunction)("dirname", (p) => (typeof p === "string" ? path.dirname(p) : "")));
    pathModule.set("extname", (0, environment_1.makeNativeFunction)("extname", (p) => (typeof p === "string" ? path.extname(p) : "")));
    pathModule.set("resolve", (0, environment_1.makeNativeFunction)("resolve", (...args) => path.resolve(...args.map(environment_1.stringify))));
    module.set("path", pathModule);
    return module;
}
//# sourceMappingURL=io.js.map