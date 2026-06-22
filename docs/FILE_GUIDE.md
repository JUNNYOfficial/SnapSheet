# SnapSheet 文件维护指南

本文档用于帮助协作者快速理解项目结构、各文件职责及维护注意事项。新增功能或修改代码前，请先阅读本指南。

## 📁 目录结构速查

```
SnapSheet/
├── docs/                 # 项目文档
│   ├── FILE_GUIDE.md     # 本文件：文件维护指南
│   ├── COMPONENT_GUIDE.md   # 组件开发指南
│   ├── FORMULA_ENGINE.md    # 公式引擎说明
│   ├── design-system.md     # UI 设计规范
│   └── snaplang-design.md   # SnapLang 集成指南
├── electron/                # Electron 桌面端
│   ├── main.ts              # 主进程入口：窗口、菜单、文件对话框
│   └── preload.ts           # 预加载脚本：安全暴露 IPC 接口
├── public/                  # 静态资源
│   ├── icon.svg             # 网站/应用图标
│   ├── icon.png             # 窗口图标
│   └── icon.icns            # macOS 程序图标
├── src/
│   ├── canvas/              # Canvas 渲染层
│   │   └── CanvasRenderer.ts
│   ├── components/          # React UI 组件
│   │   ├── Toolbar.tsx
│   │   ├── FormulaBar.tsx
│   │   ├── Spreadsheet.tsx
│   │   ├── SheetTabs.tsx
│   │   ├── PropertyPanel.tsx
│   │   ├── FindDialog.tsx
│   │   └── ContextMenu.tsx
│   ├── engine/              # 公式计算引擎
│   │   ├── Lexer.ts         # 词法分析器
│   │   ├── Parser.ts        # 语法分析器
│   │   ├── Evaluator.ts     # 表达式求值器（内置函数注册地）
│   │   ├── FormulaEngine.ts # 依赖图与循环引用检测
│   │   ├── engineeringFormulas.ts # 工程领域专业公式库
│   │   └── index.ts         # 引擎模块导出
│   ├── hooks/               # 自定义 Hooks
│   │   └── useTheme.ts      # 主题切换
│   ├── lib/                 # 工具库（如 shadcn 相关）
│   │   └── utils.ts
│   ├── snaplang/          # SnapLang 公式/脚本适配层
│   │   ├── adapter.ts     # 公式预处理与原生函数注册
│   │   ├── snaplang-wrapper.ts  # SnapLang 运行时 ES 模块包装
│   │   └── index.ts       # 适配层入口
│   ├── store/               # Zustand 全局状态
│   │   └── useSpreadsheetStore.ts
│   ├── templates/           # 工作表模板
│   │   └── index.ts
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/               # 通用工具函数
│   │   ├── cellRef.ts       # A1 引用与坐标互转
│   │   ├── constants.ts     # 常量定义
│   │   ├── csv.ts           # CSV 导入导出
│   │   ├── excel.ts         # Excel 导入导出
│   │   ├── format.ts        # 数字/文本格式化
│   │   ├── json.ts          # JSON 工作簿序列化
│   │   └── theme.ts         # 主题相关工具
│   ├── App.tsx              # 应用根组件
│   ├── main.tsx             # React 应用入口
│   └── index.css            # 全局样式与主题变量
├── tests/                   # 端到端/集成测试
├── website/                 # 产品官网
│   ├── index.html
│   └── screenshot.png
├── .github/workflows/       # CI/CD
│   └── deploy.yml           # GitHub Pages 自动部署
├── package.json
├── vite.config.ts           # Web 构建配置
├── vite.electron.config.ts  # Electron 构建配置
└── README.md
```

## 🧩 核心模块说明

### 1. 公式引擎（src/engine/）

| 文件 | 职责 | 维护注意 |
|------|------|----------|
| `Lexer.ts` | 将公式字符串拆分为 Token 序列 | 新增运算符或函数名时需同步更新 token 规则 |
| `Parser.ts` | 将 Token 序列解析为 AST | 修改语法时需同步测试嵌套表达式 |
| `Evaluator.ts` | 遍历 AST 并求值，注册所有内置函数 | 新增函数优先在 `engineeringFormulas.ts` 中注册；简单函数可直接添加 case |
| `FormulaEngine.ts` | 管理依赖图、检测循环引用、拓扑排序重算 | 修改重算逻辑时注意避免无限递归 |
| `engineeringFormulas.ts` | 工程领域专业公式库 | 新增公式需标注单位、适用条件，并更新 README 示例 |

### 2. 状态管理（src/store/）

- `useSpreadsheetStore.ts` 是唯一的全局状态源。
- 所有对单元格、工作表、选择区域的修改都应通过该 store 提供的方法完成。
- 如需新增状态字段，请同步更新初始化逻辑和本地存储序列化/反序列化。

### 3. UI 组件（src/components/）

- 组件命名采用 PascalCase，与文件名一致。
- 纯展示逻辑放组件内；数据修改统一委托给 store。
- 新增 Toolbar 按钮时，需在 `Toolbar.tsx` 和对应常量文件中同步配置。

### 4. 工具函数（src/utils/）

- `cellRef.ts`：所有单元格引用转换的权威实现，修改前请确认影响范围。
- `csv.ts` / `excel.ts` / `json.ts`：导入导出格式处理，新增格式需补充测试。
- `format.ts`：数字格式化，与 `PropertyPanel.tsx` 中的格式选项保持一致。

### 5. 类型定义（src/types/）

- `index.ts` 集中定义所有核心类型。
- 修改 `Cell`、`CellStyle`、`Sheet` 等核心类型会触发多处编译检查，请谨慎变更。

## 📝 代码规范

### 文件头注释

每个主要源文件顶部应包含 `@file` 和 `@description` 说明，便于快速了解职责：

```typescript
/**
 * @file engine/Evaluator.ts
 * @description 公式表达式求值器。
 *              遍历 Parser 生成的 AST，执行数值/文本/日期/工程公式计算。
 *              所有内置函数通过 switch-case 或 engineeringFormulas Map 注册。
 */
```

### 函数注释

公共函数建议添加 JSDoc，说明参数、返回值及典型错误：

```typescript
/**
 * 将 A1 样式引用转换为行列坐标
 * @param ref 单元格引用，如 "A1"、"AA100"
 * @returns {row: number, col: number}，从 0 开始计数
 */
export function cellToCoords(ref: string): { row: number; col: number } { ... }
```

### 命名规范

- 组件/类：PascalCase
- 函数/变量：camelCase
- 常量：UPPER_SNAKE_CASE
- 工程公式函数名：SCREAMING_SNAKE_CASE（如 `BEAM_MOMENT_CENTRAL`）

## 🔧 添加新功能指南

### 添加新公式函数

1. **通用/数学/逻辑/文本/日期函数**：在 `src/engine/Evaluator.ts` 的对应分类区块中添加 case。
2. **工程领域公式**：优先添加到 `src/engine/engineeringFormulas.ts`，然后在 `Evaluator.ts` default 分支中通过 Map 调用。
3. 在 `README.md` 的「公式使用」或「工程领域专业公式」章节补充示例。
4. 如函数行为复杂，请在 README.md 的「工程领域专业公式」章节补充推导与应用场景。
5. 为关键路径添加单元测试。

### 添加新 UI 组件

1. 在 `src/components/` 创建组件文件。
2. 如需全局状态，通过 `useSpreadsheetStore` 读写。
3. 在 `App.tsx` 中引入并放置到合适位置。
4. 更新本文件「目录结构速查」。

### 添加新导入/导出格式

1. 在 `src/utils/` 下创建或修改对应工具文件。
2. 在 `Toolbar.tsx` 中添加对应按钮与处理函数。
3. 更新 `README.md` 功能列表。

## ✅ 提交前检查清单

- [ ] `npm run check` 通过（TypeScript 类型检查）
- [ ] `npm test` 通过（单元测试）
- [ ] 新增文件已添加文件头注释
- [ ] 公共函数已添加 JSDoc
- [ ] README / FILE_GUIDE 已同步更新
- [ ] 提交信息遵循 Conventional Commits（如 `feat:`、`fix:`、`docs:`）

## 🆘 常见问题

**Q: 修改公式后单元格不更新？**  
A: 检查 `Evaluator.ts` 中是否正确返回错误码（如 `#VALUE!`），并确认 `FormulaEngine.ts` 的依赖图是否包含新引用的单元格。

**Q: 新增工程公式后显示 `#NAME?`？**  
A: 确认函数名已注册到 `engineeringFormulas` Map，或在 `Evaluator.ts` 的 switch 中有对应 case。

**Q: GitHub Pages 部署失败？**  
A: 检查 `.github/workflows/deploy.yml` 各步骤是否成功；确认 `snaplang-v1.0.0/dist` 等必要目录已提交到仓库。
