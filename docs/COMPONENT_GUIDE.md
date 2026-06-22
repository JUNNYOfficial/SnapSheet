# 组件开发指南

## 概述

本文档介绍 SnapSheet 的组件架构、开发规范和最佳实践。

## 组件架构

### 整体布局

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Toolbar (Ribbon)                            │
│  [文件] [开始] [插入] [视图]                              [主题] [面板]│
├─────────────────────────────────────────────────────────────────────┤
│                         FormulaBar                                  │
│  fx [A1] =SUM(B1:C10)                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                           Spreadsheet                               │
│                      ┌───────────────┐                              │
│                      │ A B C D ...   │                              │
│                      ├───────────────┤                              │
│                      │ 1             │                              │
│                      │ 2             │                              │
│                      │ 3             │                              │
│                      │ ...           │                              │
│                      └───────────────┘                              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                         SheetTabs                                   │
│  [Sheet1] [Sheet2] [+]          选中: A1:C10 | 求和: 100 | 平均: 50 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     PropertyPanel (右侧)                            │
│  ┌───────┬───────┬───────┬───────┬───────┐                        │
│  │ 格式  │ 数据  │ 插入  │ 视图  │  AI   │                        │
│  ├───────────────────────────────────────┤                        │
│  │ 对齐方式                              │                        │
│  │ [左对齐] [居中] [右对齐]               │                        │
│  ├───────────────────────────────────────┤                        │
│  │ 字体样式                              │                        │
│  │ [加粗]                                │                        │
│  └───────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 组件分类

| 分类 | 组件 | 职责 |
|------|------|------|
| **核心组件** | Toolbar | 顶部 Ribbon 工具栏 |
| | FormulaBar | 公式输入栏 |
| | Spreadsheet | 表格主组件（Canvas 渲染） |
| | SheetTabs | 底部工作表标签 |
| **面板组件** | PropertyPanel | 右侧属性面板 |
| **对话框组件** | FindDialog | 查找替换对话框 |

## 组件详情

### 1. Toolbar

**文件**：`src/components/Toolbar.tsx`

**职责**：提供应用级操作入口，包含文件操作、编辑、格式化等功能。

**结构**：

```
Toolbar
├── TabSelector (标签选择器)
│   ├── [文件] [开始] [插入] [视图]
│   └── [主题切换] [属性面板]
└── TabContent (标签内容)
    ├── 文件: 新建、模板、导入、导出
    ├── 开始: 撤销、重做、字体、对齐、数字格式、清除
    ├── 插入: 合并、批注、行列插入
    └── 视图: 冻结、排序
```

**关键 Props**：

| Prop | 类型 | 说明 |
|------|------|------|
| `isDark` | `boolean` | 是否深色模式 |
| `onToggleTheme` | `() => void` | 主题切换回调 |
| `onTogglePanel` | `() => void` | 属性面板切换回调 |

**核心方法**：

```typescript
// 新建工作簿
store.getState().newWorkbook()

// 撤销/重做
store.getState().undo()
store.getState().redo()

// 格式化
store.getState().applyStyleToSelection({ bold: true })
store.getState().applyNumberFormat({ type: 'percentage' })
```

### 2. FormulaBar

**文件**：`src/components/FormulaBar.tsx`

**职责**：显示和编辑单元格公式。

**结构**：

```
FormulaBar
├── CellReference (单元格引用显示)
├── FormulaInput (公式输入框)
└── AutoComplete (自动补全)
```

**关键 Props**：

| Prop | 类型 | 说明 |
|------|------|------|
| `selectedCell` | `Cell` | 当前选中的单元格 |

**核心功能**：

- 显示当前单元格的引用（如 A1）
- 显示和编辑单元格的公式
- 公式自动补全（函数名、单元格引用）
- 公式错误提示

### 3. Spreadsheet

**文件**：`src/components/Spreadsheet.tsx`

**职责**：表格主组件，基于 Canvas 实现高性能渲染。

**结构**：

```
Spreadsheet
├── Canvas (主画布)
│   ├── HeaderRow (列头)
│   ├── HeaderCol (行头)
│   └── Cells (单元格区域)
├── GridOverlay (网格覆盖层)
├── SelectionOverlay (选择覆盖层)
├── EditorOverlay (编辑器覆盖层)
└── ScrollContainer (滚动容器)
```

**关键 Props**：

| Prop | 类型 | 说明 |
|------|------|------|
| `isDark` | `boolean` | 是否深色模式 |

**核心功能**：

- Canvas 高性能渲染（60fps）
- 虚拟滚动（只渲染可见区域）
- 单元格选择（单击、拖拽、多选）
- 单元格编辑（双击、Enter）
- 列宽行高调整（拖拽）
- 冻结窗格（首行、首列）
- 滚动同步

**渲染流程**：

```
用户操作 → 更新状态 → 触发重渲染 → Canvas 绘制
```

**Canvas 绘制步骤**：

1. 清空画布
2. 绘制背景
3. 绘制列头
4. 绘制行头
5. 绘制单元格（文本、样式、边框）
6. 绘制选择框
7. 绘制冻结线

### 4. SheetTabs

**文件**：`src/components/SheetTabs.tsx`

**职责**：管理多个工作表的切换和统计信息展示。

**结构**：

```
SheetTabs
├── SheetList (工作表标签列表)
│   ├── [Sheet1] [Sheet2] [+]
│   └── 右键菜单 (重命名、删除)
└── StatusBar (状态栏)
    ├── 选中区域: A1:C10
    ├── 求和: 100 | 平均: 50 | 计数: 6
    └── [更多...]
```

**核心功能**：

- 工作表切换
- 新建工作表
- 删除工作表
- 重命名工作表
- 统计信息展示（求和、平均、计数、最大、最小）
- 统计信息折叠/展开

### 5. PropertyPanel

**文件**：`src/components/PropertyPanel.tsx`

**职责**：右侧属性面板，提供详细的格式设置和数据处理功能。

**结构**：

```
PropertyPanel
├── Header (标题栏)
│   ├── 属性面板
│   └── [关闭]
├── TabSelector (标签选择器)
│   ├── [格式] [数据] [插入] [视图] [AI]
│   └── 选中指示器
└── TabContent (标签内容)
    ├── 格式: 对齐、字体、边框、背景色、数字格式
    ├── 数据: 数据验证、条件格式、排序
    ├── 插入: 合并、批注、行列插入
    ├── 视图: 冻结窗格
    └── AI: 数据分析、公式生成
```

**关键 Props**：

| Prop | 类型 | 说明 |
|------|------|------|
| `isOpen` | `boolean` | 是否打开 |
| `onClose` | `() => void` | 关闭回调 |

**核心功能**：

- 滑入/滑出动画
- 背景遮罩层
- 标签页切换
- 格式设置（对齐、字体、边框、背景色、数字格式）
- 数据验证（数值范围、下拉列表）
- 条件格式（高亮）
- 排序
- AI 数据分析
- 公式生成

### 6. FindDialog

**文件**：`src/components/FindDialog.tsx`

**职责**：查找替换对话框。

**结构**：

```
FindDialog
├── FindInput (查找输入框)
├── ReplaceInput (替换输入框)
├── NavigationButtons (导航按钮)
│   ├── [上一个] [下一个]
│   └── [替换] [全部替换]
└── Options (选项)
    ├── [区分大小写] [正则匹配]
```

**关键 Props**：

| Prop | 类型 | 说明 |
|------|------|------|
| `open` | `boolean` | 是否打开 |
| `onClose` | `() => void` | 关闭回调 |

**核心功能**：

- 文本查找
- 文本替换
- 正则匹配
- 区分大小写
- 导航（上一个、下一个）

## 开发规范

### 组件命名

- 使用 PascalCase 命名组件文件
- 使用 PascalCase 命名组件类/函数
- 文件名与组件名一致

**示例**：
```
Toolbar.tsx → Toolbar 组件
PropertyPanel.tsx → PropertyPanel 组件
```

### 代码结构

```typescript
// 1. 导入依赖
import React, { useState, useEffect } from 'react';
import { useSpreadsheetStore } from '../store/useSpreadsheetStore';
import { X, Bold } from 'lucide-react';

// 2. 定义 Props 接口
interface MyComponentProps {
  isOpen: boolean;
  onClose: () => void;
}

// 3. 定义组件函数
export default function MyComponent({ isOpen, onClose }: MyComponentProps) {
  // 4. 获取状态
  const store = useSpreadsheetStore;
  const selection = store((s) => s.selection);
  
  // 5. 组件状态
  const [activeTab, setActiveTab] = useState('tab1');
  
  // 6. 副作用
  useEffect(() => {
    // 副作用逻辑
  }, [selection]);
  
  // 7. 事件处理
  const handleClick = () => {
    store.getState().someAction();
  };
  
  // 8. 渲染
  return (
    <div className="flex flex-col">
      {/* 组件内容 */}
    </div>
  );
}
```

### 样式规范

- 使用 Tailwind CSS 进行样式开发
- 使用 CSS 变量定义主题颜色，具体 Token 定义参见 `docs/design-system.md`
- 避免使用内联样式（除非必要）

### 状态管理

- 使用 Zustand 管理全局状态
- 使用 `useSpreadsheetStore` Hook 获取状态
- 使用 `store.getState().action()` 调用 actions

**常用状态**：

```typescript
// 获取状态
const selection = store((s) => s.selection);
const activeSheet = store((s) => s.activeSheet);
const frozenRows = store((s) => s.frozenRows);

// 调用 action
store.getState().setCellValue(row, col, value);
store.getState().applyStyleToSelection(style);
store.getState().undo();
```

### 性能优化

- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存回调函数
- 使用 React.memo 避免不必要的重渲染
- 使用虚拟滚动减少渲染量
- 使用 Canvas 渲染提高性能

**示例**：

```typescript
import { memo, useMemo, useCallback } from 'react';

const MemoizedComponent = memo(function MyComponent({ data }) {
  // 缓存计算结果
  const processedData = useMemo(() => {
    return data.map(item => item * 2);
  }, [data]);
  
  // 缓存回调
  const handleClick = useCallback((id) => {
    console.log(id);
  }, []);
  
  return (
    <div>
      {processedData.map(item => (
        <button key={item} onClick={() => handleClick(item)}>
          {item}
        </button>
      ))}
    </div>
  );
});
```

### 错误处理

- 使用 try-catch 包裹可能出错的代码
- 提供友好的错误提示
- 记录错误日志

**示例**：

```typescript
try {
  const result = store.getState().evaluateFormula(formula);
} catch (error) {
  console.error('Formula evaluation error:', error);
  // 显示错误提示
}
```

## 扩展指南

### 添加新功能到 Toolbar

1. 在 `src/components/Toolbar.tsx` 中添加新的 Group
2. 在对应的 TabContent 中添加按钮
3. 实现按钮的 onClick 逻辑

### 添加新标签到 PropertyPanel

1. 在 `src/components/PropertyPanel.tsx` 中添加新的 Tab
2. 在 tabs 数组中添加标签定义
3. 实现标签内容

### 添加新组件

1. 在 `src/components/` 目录下创建新组件
2. 在 `src/App.tsx` 中引入并使用

## 测试

### 组件测试

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import Toolbar from './Toolbar';

describe('Toolbar', () => {
  test('should render correctly', () => {
    render(<Toolbar isDark={false} onToggleTheme={() => {}} onTogglePanel={() => {}} />);
    expect(screen.getByText('文件')).toBeInTheDocument();
  });
  
  test('should call onTogglePanel when button clicked', () => {
    const onTogglePanel = jest.fn();
    render(<Toolbar isDark={false} onToggleTheme={() => {}} onTogglePanel={onTogglePanel} />);
    fireEvent.click(screen.getByRole('button', { name: '属性面板' }));
    expect(onTogglePanel).toHaveBeenCalled();
  });
});
```

## 常见问题

### Q: 如何避免组件不必要的重渲染？

A: 使用 React.memo、useMemo、useCallback 等优化手段。

### Q: 如何处理大数据量渲染？

A: 使用虚拟滚动，只渲染可见区域。

### Q: 如何实现拖拽功能？

A: 使用原生的 mousedown/mousemove/mouseup 事件，或使用拖拽库。

### Q: 如何实现动画效果？

A: 使用 CSS transitions 或 React 动画库。

---
