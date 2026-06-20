# SnapSheet 设计规范 v2.0

> 版本：v2.0
> 更新日期：2026-06-20
> 适用范围：SnapSheet 全站 UI

---

## 1. 设计原则

### 1.1 核心理念

- **专业感**：电子表格是生产力工具，界面需传递可靠、精确、高效的视觉感受
- **克制美学**：减少装饰性元素，让数据和内容成为视觉焦点
- **一致性**：相同层级的元素保持统一的视觉语言，降低认知成本
- **密度优先**：在专业电子表格场景中，信息密度高于视觉冲击

### 1.2 设计关键词

`精确` · `高效` · `现代` · `中性` · `紧凑`

---

## 2. 颜色系统

### 2.1 颜色 Token 层级

所有颜色使用语义化变量，禁止硬编码。组件应优先使用 `-text`、`-bg`、`-border` 系列变量。

| 变量 | 浅色主题 | 深色主题 | 用途 |
|------|----------|----------|------|
| `--ss-bg` | `#ffffff` | `#0a0a0a` | 主工作区背景 |
| `--ss-toolbar-bg` | `#fafafa` | `#141414` | 工具栏、标题栏、状态栏背景 |
| `--ss-header-bg` | `#f0f0f0` | `#1f1f1f` | 表格表头、徽标背景 |
| `--ss-panel-bg` | `#ffffff` | `#141414` | 面板、下拉菜单、对话框背景 |
| `--ss-input-bg` | `#ffffff` | `#1f1f1f` | 输入框、选择器背景 |
| `--ss-text-primary` | `#171717` | `#e5e5e5` | 主要文字、标题、当前单元格 |
| `--ss-text-secondary` | `#525252` | `#a3a3a3` | 次要文字、图标、说明文字 |
| `--ss-text-tertiary` | `#a3a3a3` | `#737373` | 辅助文字、占位符、弱化信息 |
| `--ss-text-disabled` | `#d4d4d4` | `#525252` | 禁用状态 |
| `--ss-border` | `#e5e5e5` | `#333333` | 主边框、分割线 |
| `--ss-border-light` | `#f0f0f0` | `#1f1f1f` | 浅色分割线 |
| `--ss-border-strong` | `#d4d4d4` | `#525252` | 强调边框 |
| `--ss-hover-bg` | `#f5f5f5` | `#262626` | 悬浮背景 |
| `--ss-selected-bg` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` | 选中背景 |
| `--ss-selected-border` | `#262626` | `#e5e5e5` | 选中边框、激活指示器 |
| `--ss-focus-ring` | `#262626` | `#e5e5e5` | 聚焦光环 |
| `--ss-info` | `#2563eb` | `#3b82f6` | 信息状态 |
| `--ss-success` | `#16a34a` | `#22c55e` | 成功状态 |
| `--ss-warning` | `#ca8a04` | `#eab308` | 警告状态 |
| `--ss-error` | `#dc2626` | `#ef4444` | 错误状态 |
| `--ss-error-bg` | `#fef2f2` | `#450a0a` | 错误状态背景 |

### 2.2 颜色使用规则

| 场景 | 推荐 Token | 不推荐 |
|------|------------|--------|
| 主要文字 | `--ss-text-primary` | `#000`, `#171717` 硬编码 |
| 正文/单元格内容 | `--ss-text-primary` | `--ss-cell-text`（旧变量，废弃） |
| 图标 | `--ss-text-secondary` | `--ss-toolbar-text`（旧变量，废弃） |
| 悬浮图标 | `--ss-text-primary` + `--ss-hover-bg` | 改变图标颜色 |
| 边框 | `--ss-border` | `--ss-toolbar-border`（旧变量，废弃） |
| 面板边框 | `--ss-border` | `--ss-panel-border`（旧变量，废弃） |
| 输入框边框 | `--ss-border-strong` | `--ss-input-border`（旧变量，废弃） |
| 错误提示 | `--ss-error` | `#ff0000` |

### 2.3 已废弃变量

以下变量已被新 Token 替代，新代码不应继续使用：

- `var(--ss-toolbar-border)` → `var(--ss-border)`
- `var(--ss-toolbar-text)` → `var(--ss-text-secondary)`
- `var(--ss-toolbar-hover)` → `var(--ss-hover-bg)`
- `var(--ss-input-border)` → `var(--ss-border-strong)`
- `var(--ss-input-text)` → `var(--ss-text-primary)`
- `var(--ss-panel-border)` → `var(--ss-border)`
- `var(--ss-error-text)` → `var(--ss-text-secondary)`
- `var(--ss-cell-text)` → `var(--ss-text-primary)`

---

## 3. 字体排版

### 3.1 字体栈

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

### 3.2 字号层级

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| 应用标题 | 14px | 600 | 标题栏应用名称 |
| 面板标题 | 14px | 500 | 属性面板标题 |
| 标签页 | 13px | 500 | 工具栏标签页 |
| 正文 | 13px | 400 | 单元格内容、公式栏 |
| 小字 | 12px | 400 | 工具按钮标签、状态栏 |
| 辅助说明 | 10px | 500 | 工具栏分组标题、统计标签 |

### 3.3 等宽字体

仅用于单元格地址、公式输入、状态栏统计信息：

```css
font-family: "SF Mono", "Fira Code", "Cascadia Code", Consolas, monospace;
```

---

## 4. 间距与尺寸

### 4.1 基础单位

以 `4px` 为基准单位，所有间距为其倍数。

### 4.2 组件尺寸

| 组件 | 高度 | 内边距 | 圆角 |
|------|------|--------|------|
| 标题栏 | 36px | px-3 py-1.5 | - |
| 工具栏图标按钮 | 32px | - | 6px |
| 工具栏组合按钮 | 32px | px-2.5 | 6px |
| 公式栏 | 36px | px-3 | - |
| 单元格地址框 | 36px | px-2 | - |
| 下拉菜单项 | 32px | px-3 | - |
| 工作表标签 | 32px | px-3 py-1.5 | 4px（上沿） |
| 状态栏 | 28px | px-3 py-1 | - |

### 4.3 圆角规范

- 小：4px（标签、小按钮）
- 中：6px（图标按钮、下拉菜单）
- 大：8px（面板、对话框）

---

## 5. 组件规范

### 5.1 工具栏按钮

```tsx
// 图标按钮
<button className="h-8 w-8 rounded-md transition-all duration-150 text-[var(--ss-text-secondary)] hover:bg-[var(--ss-hover-bg)] hover:text-[var(--ss-text-primary)]">
  <Icon size={16} />
</button>

// 组合按钮
<button className="h-8 px-2.5 gap-1.5 rounded-md transition-all duration-150 text-[var(--ss-text-secondary)] hover:bg-[var(--ss-hover-bg)] hover:text-[var(--ss-text-primary)]">
  <Icon size={16} />
  <span className="text-xs">Label</span>
</button>

// 激活状态
<button className="... bg-[var(--ss-selected-bg)] text-[var(--ss-text-primary)]">
```

规则：
- 图标尺寸统一 16px
- 工具栏分组标题 10px，颜色 `--ss-text-tertiary`
- 分组间距通过 `ToolbarDivider` 分隔

### 5.2 公式栏

```tsx
<div className="flex items-center border-b" style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-toolbar-bg)' }}>
  <div className="flex w-20 shrink-0 items-center justify-center border-r" style={{ borderColor: 'var(--ss-border)' }}>
    <span className="text-xs font-medium tabular-nums" style={{ fontFamily: FONT_FAMILY_MONO, color: 'var(--ss-text-primary)' }}>
      A1
    </span>
  </div>
  <div className="flex shrink-0 items-center border-r px-2" style={{ borderColor: 'var(--ss-border)' }}>
    <FunctionSquare size={14} style={{ color: 'var(--ss-text-tertiary)' }} />
  </div>
  <input className="w-full bg-transparent px-3 py-2 text-sm outline-none" style={{ fontFamily: FONT_FAMILY_MONO, color: 'var(--ss-text-primary)' }} />
</div>
```

### 5.3 工作表标签

```tsx
<button className="flex items-center gap-1.5 rounded-t px-3 py-1.5 text-xs transition-colors shrink-0"
  style={{
    color: isActive ? 'var(--ss-text-primary)' : 'var(--ss-text-secondary)',
    background: isActive ? 'var(--ss-bg)' : 'transparent',
    borderTop: isActive ? '2px solid var(--ss-selected-border)' : '2px solid transparent',
  }}>
```

### 5.4 状态栏

```tsx
<div className="flex items-center justify-between px-3 py-1 text-xs" style={{ fontFamily: FONT_FAMILY_MONO, color: 'var(--ss-text-secondary)' }}>
  <span style={{ color: 'var(--ss-text-primary)' }}>A1:B5</span>
  <span>Σ 100</span>
  <span>μ 25.00</span>
</div>
```

---

## 6. 布局结构

```
┌─────────────────────────────────────┐
│ 标题栏 (36px)                        │
├─────────────────────────────────────┤
│ Ribbon 工具栏 (自适应高度)            │
├─────────────────────────────────────┤
│ 公式栏 (36px)                        │
├─────────────────────────────────────┤
│                                     │
│           表格工作区                  │
│         （flex-1 占据剩余）           │
│                                     │
├─────────────────────────────────────┤
│ 状态栏 (28px)                        │
├─────────────────────────────────────┤
│ 工作表标签栏 (32px)                   │
└─────────────────────────────────────┘
```

---

## 7. 图标规范

### 7.1 图标库

统一使用 **Lucide React**：

```tsx
import { IconName } from 'lucide-react';
```

### 7.2 图标尺寸

| 场景 | 尺寸 |
|------|------|
| 工具栏图标 | 16px |
| 工具栏标签图标 | 14px |
| 状态栏图标 | 12px |
| 标题栏状态图标 | 12px |

### 7.3 图标颜色

- 默认：`--ss-text-secondary`
- 激活/选中：`--ss-text-primary`
- 禁用：`--ss-text-disabled`
- 错误：`--ss-error`
- 成功：`--ss-success`
- 信息：`--ss-info`

---

## 8. 动画与过渡

| 场景 | 时长 | 缓动函数 |
|------|------|----------|
| hover 背景/文字 | 150ms | ease |
| 面板滑入 | 300ms | cubic-bezier(0.4, 0, 0.2, 1) |
| 对话框显示 | 200ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Tooltip 显示 | 150ms | ease |

禁止动画：
- 单元格选中框
- 滚动
- 数据更新

---

## 9. 主题切换

- 跟随系统：`prefers-color-scheme`
- 手动切换：持久化到 `localStorage`
- 切换方式：即时切换，无过渡动画

---

## 10. 实现清单

### 10.1 已完成

- [x] 统一 Lucide 图标库
- [x] 废弃旧 CSS 变量，全面使用新 Token
- [x] Toolbar 组件重构
- [x] FormulaBar 组件重构
- [x] App 标题栏简化
- [x] SheetTabs 状态栏精简
- [x] 颜色变量规范化

### 10.2 持续优化

- [ ] PropertyPanel 样式统一
- [ ] Canvas 渲染颜色统一
- [ ] ContextMenu 样式统一
- [ ] FindDialog 样式统一
