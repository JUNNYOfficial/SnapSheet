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
exports.path = exports.fs = exports.makeNativeFunction = void 0;
exports.createStdlibModule = createStdlibModule;
const environment_1 = require("../environment");
Object.defineProperty(exports, "makeNativeFunction", { enumerable: true, get: function () { return environment_1.makeNativeFunction; } });
const fs = __importStar(require("fs"));
exports.fs = fs;
const path = __importStar(require("path"));
exports.path = path;
// Import module implementations
const io_1 = require("./io");
const math_1 = require("./math");
const string_1 = require("./string");
const time_1 = require("./time");
const sheet_1 = require("./sheet");
const doc_1 = require("./doc");
const slide_1 = require("./slide");
function createStdlibModule(moduleName) {
    switch (moduleName) {
        case "std.io":
            return (0, io_1.createIoModule)();
        case "std.math":
            return (0, math_1.createMathModule)();
        case "std.string":
            return (0, string_1.createStringModule)();
        case "std.time":
            return (0, time_1.createTimeModule)();
        case "std.sheet":
            return (0, sheet_1.createSheetModule)();
        case "std.doc":
            return (0, doc_1.createDocModule)();
        case "std.slide":
            return (0, slide_1.createSlideModule)();
        default:
            return null;
    }
}
//# sourceMappingURL=index.js.map