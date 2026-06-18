# SnapSheet

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6.svg)
![Vite](https://img.shields.io/badge/Vite-6.3.5-646CFF.svg)

一个现代化的电子表格应用，基于 React + TypeScript + Canvas 构建，支持公式计算、多工作表、AI数据分析等功能。

## ✨ 功能特性

### 核心功能
- 📊 **电子表格**：完整的表格编辑功能，支持1000行 × 100列
- 📝 **公式计算**：支持50+种公式函数
- 📄 **多工作表**：创建、切换、删除多个工作表
- 🎨 **单元格样式**：支持加粗、对齐等样式设置
- 📥 **导入导出**：支持 CSV 和 JSON 格式
- 🔄 **撤销/重做**：支持多次撤销/重做操作

### 公式函数

**统计函数**：SUM, AVERAGE, MAX, MIN, COUNT, COUNTA, COUNTBLANK, SUMIF, SUMIFS, AVERAGEIF, MEDIAN, MODE, VAR, VARP, STDEV, STDEVP, RANK, PERCENTILE, QUARTILE

**逻辑函数**：IF, IFERROR, IFNA, AND, OR, NOT, XOR, SWITCH, CHOOSE, ISNUMBER, ISTEXT, ISBLANK, ISERROR

**数学函数**：ABS, ROUND, ROUNDUP, ROUNDDOWN, INT, CEILING, FLOOR, MOD, PI, RAND, RANDBETWEEN, EXP, LOG, LOG10, SQRT, POWER, SIN, COS, TAN, ASIN, ACOS, ATAN, ATAN2, SIGN

**日期函数**：DATE, TIME, YEAR, MONTH, DAY, HOUR, MINUTE, SECOND, WEEKDAY, WEEKNUM, DATEDIF, TODAY, NOW

**文本函数**：TEXT, LEFT, RIGHT, MID, SEARCH, FIND, REPLACE, SUBSTITUTE, EXACT, LOWER, UPPER, PROPER, REPT, LEN, TRIM, CONCAT, CONCATENATE

### 高级功能
- 🔍 **查找替换**：支持在表格中查找和替换内容
- 📐 **列宽行高调整**：拖拽调整列宽和行高
- 🤖 **AI数据分析**：选中区域自动分析统计数据
- 🖱️ **复制粘贴**：支持 Ctrl+C/V/X 快捷键

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 📖 使用说明

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + C` | 复制 |
| `Ctrl/Cmd + V` | 粘贴 |
| `Ctrl/Cmd + X` | 剪切 |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Y` | 重做 |
| `Ctrl/Cmd + F` | 查找替换 |
| `Enter / F2` | 编辑单元格 |
| `Arrow Keys` | 移动选择 |
| `Delete / Backspace` | 删除单元格内容 |

### 公式使用

在单元格中输入 `=` 开始公式：

```
=SUM(A1:B10)      # 求和
=AVERAGE(C1:C5)   # 平均值
=IF(A1>10, "大", "小")   # 条件判断
=CONCAT(A1, B1)   # 字符串连接
=TODAY()          # 当前日期
```

### 查找替换

1. 点击右上角"查找替换"按钮或按 `Ctrl/Cmd + F`
2. 输入要查找的内容
3. 输入替换内容（可选）
4. 使用"上一个"/"下一个"导航，或"替换"/"全部替换"

## 🎯 性能指标

- **表格规模**：支持 1000 行 × 100 列
- **渲染性能**：60fps 流畅滚动（虚拟滚动优化）
- **公式计算**：支持 50+ 种函数，自动依赖追踪
- **内存占用**：轻量级设计，纯前端实现

## 🛠️ 技术栈

- **前端框架**：React 18
- **语言**：TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS 3
- **状态管理**：Zustand
- **图标**：Lucide React
- **画布渲染**：HTML5 Canvas

## 📁 项目结构

```
src/
├── components/          # 组件目录
├── engine/              # 公式引擎
│   ├── Lexer.ts         # 词法分析器
│   ├── Parser.ts        # 语法分析器
│   └── Evaluator.ts     # 表达式求值器
├── hooks/               # 自定义 Hooks
├── lib/                 # 工具函数
├── pages/               # 页面组件
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
│   ├── cellRef.ts       # 单元格引用转换
│   └── constants.ts     # 常量定义
├── App.tsx              # 主应用组件
├── main.tsx             # 应用入口
└── index.css            # 全局样式
```

## � 开发指南

### 代码规范

```bash
# 运行 ESLint 检查
npm run lint

# 运行 TypeScript 类型检查
npm run check
```

### 项目架构

SnapSheet 采用分层架构设计：

1. **视图层**：React 组件负责 UI 渲染和用户交互
2. **状态层**：Zustand 管理应用状态，支持撤销/重做
3. **渲染层**：Canvas 高性能渲染引擎，支持虚拟滚动
4. **计算层**：公式引擎支持词法分析、语法解析和依赖追踪

### 添加新公式函数

在 `src/engine/Evaluator.ts` 中添加新的函数实现：

```typescript
// 示例：添加自定义函数
private functions: Map<string, Function> = new Map([
  // ... 现有函数
  ['CUSTOM', (args: any[]) => {
    // 实现自定义逻辑
    return result;
  }]
]);
```

### 扩展单元格样式

在 `src/types/index.ts` 中扩展 `CellStyle` 接口：

```typescript
interface CellStyle {
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  // 添加新的样式属性
  italic?: boolean;
  color?: string;
}
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 提交规范

遵循 Conventional Commits 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具链相关

## 🐛 问题反馈

如果您发现 bug 或有功能建议，请在 Issues 中提交。

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有为 SnapSheet 做出贡献的开发者！
