# SnapSheet

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

## 📝 更新日志

### v1.1.0 (2026-06-17)
- ✨ 添加撤销/重做功能
- ✨ 添加查找替换功能
- ✨ 添加行高调整功能
- ✨ 扩展公式函数库（50+种）
- ✨ 添加更多统计函数（SUMIF, SUMIFS, AVERAGEIF, MEDIAN, MODE, VAR, STDEV等）
- ✨ 添加更多逻辑函数（IFERROR, IFNA, SWITCH, CHOOSE, ISNUMBER等）
- ✨ 添加日期时间函数（DATE, TIME, YEAR, MONTH, DAY, WEEKDAY, DATEDIF等）
- ✨ 添加文本处理函数（LEFT, RIGHT, MID, SEARCH, FIND, REPLACE, SUBSTITUTE等）
- ✨ 添加数学函数（ABS, ROUND, EXP, LOG, SIN, COS, TAN等）

### v1.0.0 (2026-06-17)
- 🎉 初始版本发布
- 基础表格编辑功能
- 基础公式支持
- 多工作表支持
- AI数据分析
- CSV/JSON导入导出

## 📄 许可证

MIT License
