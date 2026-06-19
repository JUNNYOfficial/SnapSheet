# SnapSheet 设计规范

> 版本：v1.0  
> 更新日期：2026-06-19  
> 适用范围：SnapSheet 全站 UI

---

## 1. 设计原则

### 1.1 核心理念

- **专业感**：电子表格是生产力工具，界面需传递可靠、精确、高效的视觉感受
- **克制美学**：减少装饰性元素，让数据和内容成为视觉焦点
- **一致性**：相同层级的元素保持统一的视觉语言，降低认知成本
- **响应式**：界面需自适应不同屏幕尺寸，核心功能在 1280px 以上完美呈现

### 1.2 设计关键词

`精确` · `高效` · `现代` · `中性`

---

## 2. 颜色系统

### 2.1 颜色命名规范

采用 `语义化命名` + `层级后缀`，确保明暗主题切换时逻辑一致：

| 层级 | 后缀 | 说明 |
|------|------|------|
| 背景 | `-bg` | 大面积背景色 |
| 文字 | `-text` | 文本颜色 |
| 边框 | `-border` | 分割线、边框 |
| 悬浮 | `-hover` | 鼠标悬浮状态 |
| 选中 | `-active` / `-selected` | 选中/激活状态 |

### 2.2 全局颜色 Token

```css
/* ==================== 浅色主题 ==================== */
:root {
  /* 基础背景 */
  --ss-bg: #ffffff;                    /* 主背景（表格区） */
  --ss-toolbar-bg: #fafafa;            /* 工具栏背景 */
  --ss-header-bg: #f0f0f0;             /* 表头背景 */
  --ss-panel-bg: #ffffff;              /* 面板背景 */
  --ss-input-bg: #ffffff;              /* 输入框背景 */

  /* 基础文字 */
  --ss-text-primary: #171717;          /* 主要文字 */
  --ss-text-secondary: #525252;        /* 次要文字 */
  --ss-text-tertiary: #a3a3a3;         /* 辅助文字 */
  --ss-text-disabled: #d4d4d4;         /* 禁用文字 */

  /* 边框与分割线 */
  --ss-border: #e5e5e5;                /* 主边框 */
  --ss-border-light: #f0f0f0;          /* 浅色边框 */
  --ss-border-strong: #d4d4d4;         /* 强调边框 */

  /* 交互状态 */
  --ss-hover-bg: #f5f5f5;              /* 悬浮背景 */
  --ss-selected-bg: rgba(0, 0, 0, 0.06);     /* 选中背景 */
  --ss-selected-border: #262626;       /* 选中边框 */
  --ss-focus-ring: #262626;            /* 聚焦光环 */

  /* 表格专用 */
  --ss-grid: #e5e5e5;                  /* 网格线 */
  --ss-cell-text: #171717;             /* 单元格文字 */
  --ss-header-text: #525252;           /* 表头文字 */
  --ss-header-highlight-bg: #e5e5e5;   /* 表头高亮背景 */
  --ss-header-highlight-text: #171717; /* 表头高亮文字 */

  /* 功能色 */
  --ss-error: #dc2626;                 /* 错误 */
  --ss-error-bg: #fef2f2;              /* 错误背景 */
  --ss-success: #16a34a;               /* 成功 */
  --ss-warning: #ca8a04;               /* 警告 */
  --ss-info: #2563eb;                  /* 信息 */

  /* 特殊元素 */
  --ss-fill-handle-bg: #262626;        /* 填充柄 */
  --ss-fill-handle-border: #ffffff;    /* 填充柄边框 */
  --ss-fill-area-bg: rgba(0, 0, 0, 0.04);    /* 填充区域背景 */
  --ss-fill-area-border: #525252;      /* 填充区域边框 */
  --ss-comment-marker: #525252;        /* 批注标记 */

  /* 滚动条 */
  --ss-scrollbar-track: #f5f5f5;
  --ss-scrollbar-thumb: #d4d4d4;
  --ss-scrollbar-thumb-hover: #a3a3a3;
}

/* ==================== 深色主题 ==================== */
.dark {
  --ss-bg: #0a0a0a;
  --ss-toolbar-bg: #141414;
  --ss-header-bg: #1f1f1f;
  --ss-panel-bg: #141414;
  --ss-input-bg: #1f1f1f;

  --ss-text-primary: #e5e5e5;
  --ss-text-secondary: #a3a3a3;
  --ss-text-tertiary: #737373;
  --ss-text-disabled: #525252;

  --ss-border: #333333;
  --ss-border-light: #1f1f1f;
  --ss-border-strong: #525252;

  --ss-hover-bg: #262626;
  --ss-selected-bg: rgba(255, 255, 255, 0.08);
  --ss-selected-border: #e5e5e5;
  --ss-focus-ring: #e5e5e5;

  --ss-grid: #333333;
  --ss-cell-text: #e5e5e5;
  --ss-header-text: #a3a3a3;
  --ss-header-highlight-bg: #333333;
  --ss-header-highlight-text: #e5e5e5;

  --ss-error: #ef4444;
  --ss-error-bg: #450a0a;
  --ss-success: #22c55e;
  --ss-warning: #eab308;
  --ss-info: #3b82f6;

  --ss-fill-handle-bg: #e5e5e5;
  --ss-fill-handle-border: #171717;
  --ss-fill-area-bg: rgba(255, 255, 255, 0.06);
  --ss-fill-area-border: #a3a3a3;
  --ss-comment-marker: #a3a3a3;

  --ss-scrollbar-track: #1f1f1f;
  --ss-scrollbar-thumb: #525252;
  --ss-scrollbar-thumb-hover: #737373;
}
```

### 2.3 颜色使用规则

| 场景 | 使用 Token | 禁止 |
|------|-----------|------|
| 主要标题/重要文字 | `--ss-text-primary` | 不要使用纯黑 `#000` |
| 正文/单元格内容 | `--ss-cell-text` | 不要使用硬编码颜色 |
| 辅助说明/次要信息 | `--ss-text-secondary` | 不要与正文颜色混用 |
| 禁用状态 | `--ss-text-disabled` | 不要单独使用灰色 |
| 错误提示 | `--ss-error` | 不要使用 `#ff0000` |
| 悬浮反馈 | `--ss-hover-bg` | 不要改变文字颜色 |
| 选中状态 | `--ss-selected-bg` + `--ss-selected-border` | 不要使用蓝色背景 |

---

## 3. 字体排版

### 3.1 字体栈

```css
/* 西文优先，中文回退 */
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: "SF Mono", "Fira Code", "Cascadia Code", Consolas, monospace;
--font-zh: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;

/* 全局字体 */
font-family: var(--font-sans), var(--font-zh);
```

**规则**：
- 所有 UI 元素统一使用无衬线字体（现代感、屏幕显示清晰）
- 等宽字体仅用于：单元格地址、公式输入、代码显示
- 禁止在 UI 中使用宋体/黑体（SimSun/SimHei）

### 3.2 字号层级

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| Display | 24px | 600 | 空状态标题、大数字 |
| H1 | 18px | 600 | 面板标题、对话框标题 |
| H2 | 14px | 500 | 分组标题、标签页 |
| Body | 13px | 400 | 正文、单元格内容 |
| Small | 12px | 400 | 辅助文字、状态提示 |
| Caption | 10px | 400 | 统计信息、时间戳 |

### 3.3 行高规范

| 场景 | 行高 | 说明 |
|------|------|------|
| 单行文本（按钮、标签） | 1 | 垂直居中 |
| 多行文本（段落） | 1.5 | 阅读舒适 |
| 紧凑列表（下拉菜单） | 1.25 | 高密度 |
| 单元格内容 | 1 | 表格紧凑 |

---

## 4. 间距系统

### 4.1 基础单位

以 `4px` 为基准单位，所有间距为其倍数：

```
1 unit = 4px
2 units = 8px
3 units = 12px
4 units = 16px
5 units = 20px
6 units = 24px
8 units = 32px
```

### 4.2 组件间距

| 场景 | 数值 | 示例 |
|------|------|------|
| 图标与文字间距 | 4px | 按钮内图标 |
| 紧凑内边距 | 4px 8px | 小按钮、标签 |
| 标准内边距 | 8px 12px | 普通按钮、列表项 |
| 宽松内边距 | 12px 16px | 面板、卡片 |
| 元素间距 | 4px | 工具栏图标之间 |
| 分组间距 | 8px | 按钮组之间 |
| 区域间距 | 16px | 面板之间 |
| 边框圆角（小） | 4px | 按钮、输入框 |
| 边框圆角（中） | 6px | 下拉菜单、卡片 |
| 边框圆角（大） | 8px | 对话框、面板 |

---

## 5. 组件规范

### 5.1 按钮（Button）

**三种变体**：

| 变体 | 背景 | 文字 | 悬浮 | 用途 |
|------|------|------|------|------|
| 默认 | transparent | `--ss-text-secondary` | `--ss-hover-bg` | 图标按钮、次要操作 |
| 主要 | `--ss-text-primary` | `--ss-bg` | opacity 0.9 | 确认、保存等主操作 |
| 危险 | `--ss-error` | `#ffffff` | opacity 0.9 | 删除、危险操作 |

**尺寸**：

| 尺寸 | 高度 | 内边距 | 图标 |
|------|------|--------|------|
| 小 | 28px | 4px 8px | 14px |
| 中 | 32px | 6px 12px | 16px |
| 大 | 36px | 8px 16px | 18px |

**圆角**：4px

**过渡**：`background-color 150ms ease, color 150ms ease`

### 5.2 输入框（Input）

- 高度：32px
- 内边距：8px 12px
- 边框：1px solid `--ss-border-strong`
- 圆角：4px
- 聚焦：边框变为 `--ss-focus-ring`，添加 `box-shadow: 0 0 0 2px rgba(38, 38, 38, 0.1)`
- 背景：`--ss-input-bg`
- 文字：`--ss-input-text`
- 占位符：`--ss-text-tertiary`

### 5.3 面板（Panel）

- 背景：`--ss-panel-bg`
- 边框：1px solid `--ss-border`
- 圆角：8px（悬浮面板），0（侧边栏）
- 阴影：`0 4px 12px rgba(0, 0, 0, 0.08)`（深色主题：`0 4px 12px rgba(0, 0, 0, 0.3)`）
- 标题：14px, weight 500, `--ss-text-primary`
- 内边距：16px

### 5.4 工具栏（Toolbar）

- 背景：`--ss-toolbar-bg`
- 边框：1px solid `--ss-border`（底部）
- 高度：自适应（内容 + 8px 内边距）
- 图标按钮：32px × 32px，圆角 4px
- 分组间距：8px
- 分组分隔线：1px solid `--ss-border`，高度 20px

### 5.5 标签页（Tabs）

- 文字：12px, `--ss-text-secondary`
- 激活文字：`--ss-text-primary`
- 激活指示器：2px 底部边框，`--ss-selected-border`
- 悬浮背景：`--ss-hover-bg`
- 间距：0（紧凑模式）或 4px（宽松模式）

### 5.6 下拉菜单（Dropdown）

- 背景：`--ss-panel-bg`
- 边框：1px solid `--ss-border`
- 圆角：6px
- 阴影：`0 4px 12px rgba(0, 0, 0, 0.12)`
- 选项高度：32px
- 选项内边距：8px 12px
- 悬浮背景：`--ss-hover-bg`
- 文字：`--ss-text-primary`

### 5.7 Tooltip

- 背景：`--ss-text-primary`
- 文字：`--ss-bg`
- 圆角：4px
- 内边距：4px 8px
- 字号：12px
- 箭头：8px 等边三角形
- 阴影：`0 2px 8px rgba(0, 0, 0, 0.15)`

---

## 6. 图标规范

### 6.1 图标库

统一使用 **Lucide React**：

```tsx
import { IconName } from 'lucide-react';
```

### 6.2 图标尺寸

| 场景 | 尺寸 | 说明 |
|------|------|------|
| 工具栏图标 | 16px | 主要操作 |
| 按钮内图标 | 14-16px | 配合文字 |
| 列表项图标 | 14px | 辅助识别 |
| 状态图标 | 12px | 统计、提示 |
| 大图标 | 20-24px | 空状态、功能入口 |

### 6.3 图标颜色

- 默认：`--ss-text-secondary`
- 激活/选中：`--ss-text-primary`
- 禁用：`--ss-text-disabled`
- 错误：`--ss-error`
- 成功：`--ss-success`

---

## 7. 动画与过渡

### 7.1 过渡时间

| 场景 | 时长 | 缓动函数 |
|------|------|----------|
| 颜色变化（hover） | 150ms | ease |
| 背景变化 | 150ms | ease |
| 透明度变化 | 200ms | ease-out |
| 尺寸变化 | 200ms | cubic-bezier(0.4, 0, 0.2, 1) |
| 位移（slide） | 300ms | cubic-bezier(0.4, 0, 0.2, 1) |
| 对话框弹出 | 200ms | cubic-bezier(0.4, 0, 0.2, 1) |

### 7.2 禁止动画场景

- 单元格选中框：即时响应，无过渡
- 滚动：原生滚动，无动画
- 数据更新：即时渲染

---

## 8. 布局规范

### 8.1 层级结构

```
┌─────────────────────────────────────┐
│ 标题栏（32px）                        │
├─────────────────────────────────────┤
│ Ribbon 工具栏（自适应高度）            │
├─────────────────────────────────────┤
│ 公式栏（36px）                        │
├─────────────────────────────────────┤
│                                     │
│           表格工作区                   │
│         （flex-1 占据剩余）            │
│                                     │
├─────────────────────────────────────┤
│ 状态栏 + 工作表标签（自适应）           │
└─────────────────────────────────────┘
```

### 8.2 断点

| 断点 | 宽度 | 适配策略 |
|------|------|----------|
| 移动端 | < 768px | 隐藏侧边栏，工具栏折叠 |
| 平板 | 768px - 1024px | 紧凑模式，减少间距 |
| 桌面 | 1024px - 1440px | 标准布局 |
| 大屏 | > 1440px | 充分利用空间，展开面板 |

### 8.3 Z-Index 层级

| 层级 | Z-Index | 元素 |
|------|---------|------|
| 基础 | 0-10 | 表格、工具栏 |
| 悬浮 | 20-30 | 下拉菜单、Tooltip |
| 覆盖 | 40-50 | 对话框、属性面板 |
| 遮罩 | 100 | 全屏遮罩 |

---

## 9. 主题规范

### 9.1 主题切换

- 跟随系统：`prefers-color-scheme`
- 手动切换：持久化到 `localStorage`
- 切换动画：无（即时切换，避免闪烁）

### 9.2 主题变量映射

确保所有颜色、背景、边框都使用 CSS 变量，禁止硬编码：

```css
/* ✅ 正确 */
background: var(--ss-toolbar-bg);
color: var(--ss-text-primary);
border-color: var(--ss-border);

/* ❌ 错误 */
background: #fafafa;
color: #171717;
border-color: #e5e5e5;
```

---

## 10. 文件组织

### 10.1 样式文件

```
src/
├── styles/
│   ├── index.css          # 全局样式、CSS 变量
│   ├── utilities.css      # 工具类
│   └── scrollbar.css      # 滚动条样式
```

### 10.2 组件样式

- 优先使用 Tailwind 工具类
- 复杂样式使用 `style` 属性绑定 CSS 变量
- 禁止在组件中定义新的 CSS 类

---

## 11. 实现清单

### 11.1 已规范

- [x] CSS 变量定义
- [x] 深色/浅色主题切换
- [x] 滚动条样式
- [ ] 字体统一（进行中）
- [ ] 圆角统一（进行中）
- [ ] 间距统一（进行中）
- [ ] 过渡动画统一（进行中）

### 11.2 待整改

详见 [UI 整改任务](#ui-整改任务)。

---

## 附录 A：Token 对照表

| 新 Token | 旧 Token | 说明 |
|----------|----------|------|
| `--ss-text-primary` | `--ss-cell-text` | 语义更清晰 |
| `--ss-text-secondary` | `--ss-header-text` | 统一文字层级 |
| `--ss-border` | `--ss-toolbar-border` | 通用化 |
| `--ss-hover-bg` | `--ss-toolbar-hover` | 统一悬浮态 |
| `--ss-focus-ring` | `--ss-selected-border` | 聚焦专用 |

---

## 附录 B：快速参考

```css
/* 最常用组合 */
.btn {
  height: 32px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  transition: background-color 150ms ease;
}

.input {
  height: 32px;
  padding: 8px 12px;
  border: 1px solid var(--ss-border-strong);
  border-radius: 4px;
  font-size: 13px;
}

.panel {
  background: var(--ss-panel-bg);
  border: 1px solid var(--ss-border);
  border-radius: 8px;
  padding: 16px;
}
```
