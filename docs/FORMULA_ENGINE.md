# 公式引擎技术文档

## 概述

SnapSheet 的公式引擎由两部分组成：

1. **当前主引擎**：基于 SnapLang v1.0.0 运行时的 `src/engine/FormulaEngine.ts`，负责依赖图管理、循环引用检测与拓扑重算，实际表达式求值委托给 `src/snaplang/adapter.ts`。
2. **旧版兼容引擎**：`src/engine/Lexer.ts`、`Parser.ts`、`Evaluator.ts` 组成的词法/语法/求值链路，保留用于兼容旧版 AST 形式的公式表达式。

公式引擎支持 260+ 种内置函数，自动依赖追踪，以及缓存优化。

## 架构设计

### 当前主流程

```
┌─────────────────────────────────────────────────────────────────┐
│                       公式计算流程（当前）                       │
├─────────────────────────────────────────────────────────────────┤
│  输入: "=SUM(A1:B10)"                                          │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  src/engine/FormulaEngine.ts                            │   │
│  │  - 解析公式依赖单元格                                   │   │
│  │  - 检测循环引用                                         │   │
│  │  - 拓扑排序重算                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  src/snaplang/adapter.ts (SnapLangFormulaEngine)        │   │
│  │  - 预处理：A1:A10 → getCellRange("A1:A10")              │   │
│  │  - 注册 sum/avg/max 等原生函数                          │   │
│  │  - 调用 SnapLang Evaluator 求值                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  返回数值/字符串/布尔/错误码                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 旧版兼容流程

```
┌─────────────────────────────────────────────────────────────────┐
│                       公式计算流程（旧版兼容）                   │
├─────────────────────────────────────────────────────────────────┤
│  输入: "=SUM(A1:B10)"                                          │
│         ↓                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Lexer      │ →  │   Parser     │ →  │  Evaluator   │      │
│  │  词法分析    │    │  语法解析    │    │  表达式求值  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         ↓                    ↓                    ↓            │
│    生成 Token          构建 AST              返回结果          │
└─────────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. Lexer（词法分析器）

**职责**：将公式字符串分解为 Token 序列。

**文件**：`src/engine/Lexer.ts`

**Token 类型**：

| 类型 | 示例 | 说明 |
|------|------|------|
| `NUMBER` | `123`, `3.14` | 数值常量 |
| `STRING` | `"hello"` | 字符串常量 |
| `CELL` | `A1`, `B2` | 单元格引用 |
| `RANGE` | `A1:B10` | 单元格区域 |
| `FUNCTION` | `SUM`, `IF` | 函数名 |
| `OPERATOR` | `+`, `-`, `*`, `/` | 运算符 |
| `COMPARATOR` | `=`, `>`, `<`, `>=`, `<=`, `<>` | 比较符 |
| `PAREN_OPEN` | `(` | 左括号 |
| `PAREN_CLOSE` | `)` | 右括号 |
| `COMMA` | `,` | 逗号 |
| `COLON` | `:` | 冒号（区域） |
| `EQUALS` | `=` | 等号 |

**使用示例**：

```typescript
import { Lexer } from '../engine/Lexer';

const lexer = new Lexer();
const tokens = lexer.tokenize('=SUM(A1:B10)');
// 输出: [EQUALS, FUNCTION:SUM, PAREN_OPEN, RANGE:A1:B10, PAREN_CLOSE]
```

### 2. Parser（语法解析器）

**职责**：将 Token 序列转换为抽象语法树（AST）。

**文件**：`src/engine/Parser.ts`

**AST 节点类型**：

| 节点类型 | 说明 | 示例 |
|----------|------|------|
| `NumberNode` | 数值常量 | `123` |
| `StringNode` | 字符串常量 | `"hello"` |
| `CellNode` | 单元格引用 | `A1` |
| `RangeNode` | 单元格区域 | `A1:B10` |
| `FunctionNode` | 函数调用 | `SUM(A1:B10)` |
| `BinaryOpNode` | 二元运算 | `A1 + B1` |
| `UnaryOpNode` | 一元运算 | `-A1` |
| `ComparisonNode` | 比较运算 | `A1 > 10` |
| `LogicalOpNode` | 逻辑运算 | `AND(A1>0, B1>0)` |

**语法规则**：

```
expression → term (('+' | '-') term)*
term       → factor (('*' | '/') factor)*
factor     → NUMBER | STRING | CELL | RANGE | FUNCTION | '(' expression ')' | ('-' | '+') factor
function   → NAME '(' arguments ')'
arguments  → expression (',' expression)*
range      → CELL ':' CELL
```

**使用示例**：

```typescript
import { Parser } from '../engine/Parser';

const parser = new Parser();
const ast = parser.parse(tokens);
// 输出: FunctionNode { name: 'SUM', args: [RangeNode { start: CellNode, end: CellNode }] }
```

### 3. Evaluator（表达式求值器）

**职责**：遍历 AST 并计算最终结果。

**文件**：`src/engine/Evaluator.ts`

**求值流程**：

1. 递归遍历 AST
2. 对每个节点求值
3. 处理函数调用
4. 处理运算符
5. 返回最终结果

**使用示例**：

```typescript
import { Evaluator } from '../engine/Evaluator';

const evaluator = new Evaluator(sheet);
const result = evaluator.evaluate(ast);
// 输出: 数值/字符串/布尔值
```

## 内置函数

### 统计函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `SUM` | 求和 | `=SUM(A1:B10)` |
| `AVERAGE` | 平均值 | `=AVERAGE(C1:C5)` |
| `MAX` | 最大值 | `=MAX(D1:D20)` |
| `MIN` | 最小值 | `=MIN(E1:E20)` |
| `COUNT` | 计数（数值） | `=COUNT(F1:F10)` |
| `COUNTA` | 计数（非空） | `=COUNTA(G1:G10)` |
| `COUNTBLANK` | 计数（空白） | `=COUNTBLANK(H1:H10)` |
| `SUMIF` | 条件求和 | `=SUMIF(A1:A10, ">10")` |
| `SUMIFS` | 多条件求和 | `=SUMIFS(A1:A10, B1:B10, "男")` |
| `AVERAGEIF` | 条件平均 | `=AVERAGEIF(C1:C10, ">0")` |
| `MEDIAN` | 中位数 | `=MEDIAN(D1:D10)` |
| `MODE` | 众数 | `=MODE(E1:E10)` |
| `VAR` | 方差 | `=VAR(F1:F10)` |
| `VARP` | 总体方差 | `=VARP(G1:G10)` |
| `STDEV` | 标准差 | `=STDEV(H1:H10)` |
| `STDEVP` | 总体标准差 | `=STDEVP(I1:I10)` |
| `RANK` | 排名 | `=RANK(A1, A1:A10)` |
| `PERCENTILE` | 百分位数 | `=PERCENTILE(A1:A10, 0.5)` |
| `QUARTILE` | 四分位数 | `=QUARTILE(A1:A10, 1)` |

### 逻辑函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `IF` | 条件判断 | `=IF(A1>10, "大", "小")` |
| `IFERROR` | 错误处理 | `=IFERROR(1/0, "错误")` |
| `IFNA` | NA 错误处理 | `=IFNA(VLOOKUP(...), "未找到")` |
| `AND` | 逻辑与 | `=AND(A1>0, B1>0)` |
| `OR` | 逻辑或 | `=OR(A1>0, B1>0)` |
| `NOT` | 逻辑非 | `=NOT(A1>0)` |
| `XOR` | 异或 | `=XOR(A1>0, B1>0)` |
| `SWITCH` | 多条件 | `=SWITCH(A1, 1, "一", 2, "二")` |
| `CHOOSE` | 选择 | `=CHOOSE(2, "一", "二", "三")` |
| `ISNUMBER` | 判断数值 | `=ISNUMBER(A1)` |
| `ISTEXT` | 判断文本 | `=ISTEXT(A1)` |
| `ISBLANK` | 判断空白 | `=ISBLANK(A1)` |
| `ISERROR` | 判断错误 | `=ISERROR(A1)` |

### 数学函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `ABS` | 绝对值 | `=ABS(-10)` |
| `ROUND` | 四舍五入 | `=ROUND(3.1415, 2)` |
| `ROUNDUP` | 向上取整 | `=ROUNDUP(3.1, 0)` |
| `ROUNDDOWN` | 向下取整 | `=ROUNDDOWN(3.9, 0)` |
| `INT` | 取整 | `=INT(3.9)` |
| `CEILING` | 向上舍入 | `=CEILING(3.1, 1)` |
| `FLOOR` | 向下舍入 | `=FLOOR(3.9, 1)` |
| `MOD` | 取模 | `=MOD(10, 3)` |
| `PI` | π 值 | `=PI()` |
| `RAND` | 随机数 | `=RAND()` |
| `RANDBETWEEN` | 指定范围随机数 | `=RANDBETWEEN(1, 100)` |
| `EXP` | 指数 | `=EXP(2)` |
| `LOG` | 对数 | `=LOG(100, 10)` |
| `LOG10` | 常用对数 | `=LOG10(100)` |
| `SQRT` | 平方根 | `=SQRT(16)` |
| `POWER` | 幂运算 | `=POWER(2, 10)` |
| `SIN` | 正弦 | `=SIN(PI())` |
| `COS` | 余弦 | `=COS(0)` |
| `TAN` | 正切 | `=TAN(0)` |
| `ASIN` | 反正弦 | `=ASIN(1)` |
| `ACOS` | 反余弦 | `=ACOS(1)` |
| `ATAN` | 反正切 | `=ATAN(0)` |
| `ATAN2` | 反正切（两参数） | `=ATAN2(1, 1)` |
| `SIGN` | 符号 | `=SIGN(-10)` |

### 日期函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `DATE` | 日期 | `=DATE(2024, 1, 1)` |
| `TIME` | 时间 | `=TIME(12, 0, 0)` |
| `YEAR` | 年份 | `=YEAR(TODAY())` |
| `MONTH` | 月份 | `=MONTH(TODAY())` |
| `DAY` | 日期 | `=DAY(TODAY())` |
| `HOUR` | 小时 | `=HOUR(NOW())` |
| `MINUTE` | 分钟 | `=MINUTE(NOW())` |
| `SECOND` | 秒 | `=SECOND(NOW())` |
| `WEEKDAY` | 星期 | `=WEEKDAY(TODAY())` |
| `WEEKNUM` | 周数 | `=WEEKNUM(TODAY())` |
| `DATEDIF` | 日期差 | `=DATEDIF(A1, TODAY(), "d")` |
| `TODAY` | 今天 | `=TODAY()` |
| `NOW` | 当前时间 | `=NOW()` |

### 文本函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `TEXT` | 格式转换 | `=TEXT(TODAY(), "yyyy-mm-dd")` |
| `LEFT` | 左截取 | `=LEFT("hello", 2)` |
| `RIGHT` | 右截取 | `=RIGHT("hello", 2)` |
| `MID` | 中间截取 | `=MID("hello", 2, 3)` |
| `SEARCH` | 查找（不区分大小写） | `=SEARCH("ll", "hello")` |
| `FIND` | 查找（区分大小写） | `=FIND("Ll", "hello")` |
| `REPLACE` | 替换 | `=REPLACE("hello", 1, 1, "H")` |
| `SUBSTITUTE` | 替换（全部） | `=SUBSTITUTE("hello", "l", "x")` |
| `EXACT` | 精确比较 | `=EXACT("Hello", "hello")` |
| `LOWER` | 小写 | `=LOWER("HELLO")` |
| `UPPER` | 大写 | `=UPPER("hello")` |
| `PROPER` | 首字母大写 | `=PROPER("hello world")` |
| `REPT` | 重复 | `=REPT("*", 5)` |
| `LEN` | 长度 | `=LEN("hello")` |
| `TRIM` | 去空格 | `=TRIM(" hello ")` |
| `CONCAT` | 连接 | `=CONCAT(A1, B1)` |
| `CONCATENATE` | 连接（兼容） | `=CONCATENATE(A1, B1)` |

## 依赖追踪

### 原理

公式引擎会自动追踪每个单元格的依赖关系，当依赖单元格变化时，只重新计算受影响的单元格。

### 数据结构

```typescript
interface DependencyGraph {
  dependencies: Map<string, Set<string>>;  // 单元格 → 依赖的单元格
  dependents: Map<string, Set<string>>;    // 单元格 → 依赖它的单元格
}
```

### 更新流程

```
单元格 A1 变化
    ↓
查找所有依赖 A1 的单元格 (dependents)
    ↓
递归查找这些单元格的 dependents
    ↓
按拓扑顺序重新计算
    ↓
更新缓存
```

## 缓存机制

### 计算缓存

公式引擎会缓存每个单元格的计算结果，避免重复计算。

```typescript
interface EvaluationCache {
  results: Map<string, any>;      // 计算结果缓存
  dirty: Set<string>;             // 脏单元格集合
  lastUpdated: Map<string, number>;  // 最后更新时间
}
```

### 缓存失效

- 当依赖单元格变化时，标记相关单元格为脏
- 下次访问脏单元格时重新计算
- 计算完成后清除脏标记

## 错误处理

### 错误类型

| 错误类型 | 说明 | 示例 |
|----------|------|------|
| `#DIV/0!` | 除零错误 | `=1/0` |
| `#VALUE!` | 参数类型错误 | `=SUM("text")` |
| `#REF!` | 引用错误 | `=A10000` |
| `#NAME?` | 函数名错误 | `=INVALID()` |
| `#NUM!` | 数值错误 | `=SQRT(-1)` |
| `#NA` | 未找到 | `=VLOOKUP(...)` |
| `#CYCLE!` | 循环引用 | `=A1+1`（在 A1 中） |

### 错误传播

当公式中的某个参数返回错误时，错误会向上传播到整个公式。

```typescript
// A1 = 0
=IF(A1>0, SUM(B1:C10), 1/A1)  // 返回 #DIV/0!
```

## 扩展指南

### 添加新函数（推荐）

当前主引擎已迁移至 SnapLang，新函数应优先在 `src/snaplang/adapter.ts` 的 `setupCellFunctions` 中注册：

```typescript
const myFunc = snaplang.makeNativeFunction('MYFUNCTION', (arg: any) => {
  // 验证参数并实现逻辑
  return arg * 2;
});
env.define('MYFUNCTION', myFunc);
```

然后在 `src/engine/Evaluator.ts` 中保留旧版兼容实现（如需兼容旧版 AST 求值）：

```typescript
private functions: Map<string, Function> = new Map([
  ['MYFUNCTION', (args: any[], context: EvaluationContext) => {
    if (args.length !== 2) {
      throw new Error('#VALUE! MYFUNCTION 需要 2 个参数');
    }
    if (typeof args[0] !== 'number' || typeof args[1] !== 'number') {
      throw new Error('#VALUE! 参数必须是数值');
    }
    return args[0] + args[1];
  }]
]);
```

### 添加新运算符

如需扩展旧版 Evaluator 支持的运算符，在 `src/engine/Evaluator.ts` 中添加：

```typescript
private operators: Map<string, Function> = new Map([
  ['^', (a: any, b: any) => Math.pow(a, b)],
]);
```

## 性能优化

### 虚拟滚动

只渲染可见区域的单元格，减少 Canvas 绘制压力。

### 依赖追踪

只重新计算受影响的单元格，避免全表重算。

### 缓存机制

缓存计算结果，避免重复计算。

### Web Workers（可选）

对于复杂公式，可以将计算移到 Web Worker 中，避免阻塞主线程。

## 测试

### 单元测试

```bash
npm test
```

### 测试用例

```typescript
import { evaluate } from '../engine/Evaluator';

describe('Formula Evaluation', () => {
  test('should evaluate SUM function', () => {
    const result = evaluate('=SUM(1, 2, 3)');
    expect(result).toBe(6);
  });
  
  test('should handle errors', () => {
    const result = evaluate('=1/0');
    expect(result).toBe('#DIV/0!');
  });
});
```

## 常见问题

### Q: 公式计算很慢怎么办？

A: 检查是否有大量循环引用或复杂公式。可以：
1. 使用更简单的公式
2. 减少计算范围
3. 使用缓存优化

### Q: 如何调试公式？

A: 可以在公式栏中查看公式，或使用 `EVALUATE` 函数分步测试。

### Q: 支持数组公式吗？

A: 当前版本不支持数组公式，未来版本会添加此功能。

---

## 参考资料

- [Spreadsheet Formula Calculation](https://en.wikipedia.org/wiki/Spreadsheet#Formula_calculation)
- [Concrete Mathematics](https://en.wikipedia.org/wiki/Concrete_Mathematics)
- [Parsing Techniques](https://en.wikipedia.org/wiki/Parsing)
