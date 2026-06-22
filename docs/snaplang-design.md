# SnapLang 集成指南

SnapSheet 使用 **SnapLang v1.0.0** 作为公式与脚本运行时。本文档说明 SnapLang 在项目中的集成方式、核心流程及扩展方法。

> 注意：SnapLang 是独立维护的运行时，源码位于仓库根目录的 `snaplang-v1.0.0/` 中。`src/snaplang/` 只负责与 SnapSheet 单元格模型桥接，不定义 SnapLang 语言本身。

---

## 1. 集成架构

```
┌─────────────────────────────────────────────────────────────┐
│                     SnapSheet 公式/脚本层                    │
├─────────────────────────────────────────────────────────────┤
│  用户输入: =SUM(A1:A10)                                     │
│       ↓                                                     │
│  src/snaplang/adapter.ts                                    │
│    - 预处理：将 A1:A10 替换为 getCell/getCellRange 调用      │
│    - 注册原生函数：sum/avg/max/min/count 等                  │
│       ↓                                                     │
│  src/snaplang/snaplang-wrapper.ts                           │
│    - 加载 snaplang-v1.0.0/dist 打包产物                     │
│       ↓                                                     │
│  snaplang-v1.0.0/dist (Lexer → Parser → Evaluator)          │
│    - 词法/语法/求值                                         │
│       ↓                                                     │
│  返回计算结果到 src/engine/FormulaEngine.ts                 │
└─────────────────────────────────────────────────────────────┘
```

## 2. 目录结构

| 路径 | 职责 |
|------|------|
| `snaplang-v1.0.0/dist/` | SnapLang v1.0.0 运行时打包产物（Lexer、Parser、Evaluator、CLI、标准库） |
| `src/snaplang/snaplang-wrapper.ts` | 将 CommonJS/UMD 打包产物包装为 ES 模块 API |
| `src/snaplang/adapter.ts` | 公式预处理、注册原生函数、构建求值环境 |
| `src/snaplang/index.ts` | 统一导出 `createSnapLangEngine` 等 API |
| `src/engine/FormulaEngine.ts` | 维护依赖图，调用 `SnapLangFormulaEngine` 执行求值 |

## 3. 公式预处理

用户输入的公式（如 `=SUM(A1:A10)`）在交给 SnapLang 前会被 `preprocessFormula` 转换：

1. 去掉前导 `=`。
2. 跳过字符串常量，避免误替换。
3. 将单个单元格引用替换为 `getCell("A1")`。
4. 将相邻的 `getCell(...):getCell(...)` 合并为区域引用 `getCellRange("A1:A10")`。

示例：

```typescript
// 原始公式
=SUM(A1:A10) + B1

// 预处理后
sum(getCellRange("A1:A10")) + getCell("B1")
```

## 4. 原生函数

`adapter.ts` 在 SnapLang 求值环境中注册以下原生函数：

| 函数 | 说明 | 示例 |
|------|------|------|
| `getCell(ref)` | 读取单个单元格的值 | `getCell("A1")` |
| `getCellRange(ref)` | 读取区域内所有单元格的值 | `getCellRange("A1:A10")` |
| `setCell(ref, value)` | 设置单元格计算结果 | `setCell("A1", 100)` |
| `sum(...values)` | 求和 | `sum(1, 2, 3)` 或 `sum(getCellRange("A1:A10"))` |
| `avg(...values)` | 平均值 | `avg(getCellRange("A1:A10"))` |
| `max(...values)` | 最大值 | `max(getCellRange("A1:A10"))` |
| `min(...values)` | 最小值 | `min(getCellRange("A1:A10"))` |
| `count(...values)` | 计数 | `count(getCellRange("A1:A10"))` |
| `abs(num)` | 绝对值 | `abs(-10)` |
| `sqrt(num)` | 平方根 | `sqrt(16)` |

> 更多数学、字符串、逻辑函数参见 `src/snaplang/adapter.ts` 的 `setupCellFunctions` 方法。

## 5. 脚本使用示例

在脚本编辑器中可直接使用 SnapLang 语法操作表格：

```javascript
// 批量填充数据
for (let i = 1; i <= 10; i++) {
  setCell('A' + i, i * 10);
}
setCell('A11', '=SUM(A1:A10)');

// 读取并计算
let total = sum(getCellRange("A1:A10"));
print("Total: " + total);
```

脚本中支持的语法取决于 SnapLang v1.0.0 的实现，具体可参考 `snaplang-v1.0.0/dist/` 中的运行时源码或运行 CLI 帮助：

```bash
node snaplang-v1.0.0/dist/cli.js --help
```

## 6. 扩展指南

### 6.1 添加新的表格原生函数

在 `src/snaplang/adapter.ts` 的 `setupCellFunctions` 中注册：

```typescript
const myFunc = snaplang.makeNativeFunction('myFunc', (arg: any) => {
  // 实现逻辑
  return arg * 2;
});
env.define('myFunc', myFunc);
```

### 6.2 更新预处理规则

如需支持新的引用语法（例如命名区域），修改 `preprocessFormula` 中的正则替换逻辑，并补充单元测试。

### 6.3 升级 SnapLang 运行时

1. 替换 `snaplang-v1.0.0/dist/` 中的打包产物。
2. 检查 `snaplang-wrapper.ts` 中的导出接口是否仍兼容。
3. 运行 `npm run check` 与 `npm test` 验证公式计算。

## 7. 常见问题

**Q: 公式显示 `#NAME?`**  
A: 检查函数名是否已在 `setupCellFunctions` 中注册，或是否在预处理后变成了 SnapLang 不识别的标识符。

**Q: 修改单元格后依赖公式不更新？**  
A: 检查 `FormulaEngine.ts` 的依赖图是否包含该公式引用的单元格；依赖收集由 `adapter.ts` 在求值时完成。

**Q: 如何调试预处理后的公式？**  
A: 在 `preprocessFormula` 返回处临时打印，或查看 `FormulaEngine.ts` 的调用日志。
