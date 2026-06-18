# 贡献指南

欢迎来到 SnapSheet！我们非常欢迎任何形式的贡献，包括但不限于：

- 代码贡献（新功能、Bug 修复、性能优化）
- 文档改进
- 测试用例编写
- 功能建议和 Bug 报告

## 📋 贡献流程

### 1. 查找或创建 Issue

在开始工作之前，请先查看 [Issues](https://github.com/JUNNYOfficial/SnapSheet/issues) 页面，了解当前的开发计划和待解决的问题。

如果你想添加新功能或报告 Bug，请先创建一个 Issue 进行讨论。

### 2. Fork 仓库

点击仓库页面右上角的 "Fork" 按钮，将仓库复制到你的 GitHub 账户。

### 3. 克隆仓库

```bash
git clone https://github.com/your-username/SnapSheet.git
cd SnapSheet
```

### 4. 创建分支

为你的功能或修复创建一个新分支：

```bash
# 从 main 分支创建新分支
git checkout -b feature/AmazingFeature
# 或
git checkout -b fix/BugFix
```

分支命名规范：
- `feature/` - 新功能开发
- `fix/` - Bug 修复
- `refactor/` - 代码重构
- `docs/` - 文档更新
- `perf/` - 性能优化

### 5. 安装依赖

```bash
npm install
```

### 6. 开发和测试

在开发过程中，请确保：

- ✅ 代码符合项目的代码规范
- ✅ 通过 TypeScript 类型检查
- ✅ 通过 ESLint 检查
- ✅ 测试用例覆盖新功能

运行检查命令：

```bash
# ESLint 检查
npm run lint

# TypeScript 类型检查
npm run check

# 构建验证
npm run build
```

### 7. 提交代码

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范提交代码：

```bash
git add .
git commit -m "feat: 添加数据验证功能"
```

提交信息格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**类型说明：**

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加数据验证功能` |
| `fix` | Bug 修复 | `fix: 修复公式计算循环引用问题` |
| `docs` | 文档更新 | `docs: 更新 API 文档` |
| `style` | 代码格式调整 | `style: 格式化代码` |
| `refactor` | 代码重构 | `refactor: 重构 Canvas 渲染引擎` |
| `perf` | 性能优化 | `perf: 优化虚拟滚动性能` |
| `test` | 测试相关 | `test: 添加公式测试用例` |
| `chore` | 构建/工具链 | `chore: 更新依赖版本` |

### 8. 推送到远程

```bash
git push origin feature/AmazingFeature
```

### 9. 创建 Pull Request

在 GitHub 上打开你的 Fork 仓库，点击 "Compare & pull request" 按钮，创建一个新的 Pull Request。

填写 Pull Request 信息：
- 标题：简洁描述更改内容
- 描述：详细说明更改内容、解决的问题、测试方法等
- 关联 Issue：在描述中引用相关 Issue（如 `Closes #123`）

## 🛠️ 开发规范

### 代码规范

#### TypeScript 规范

- 使用 `const` 代替 `let`，除非需要重新赋值
- 使用类型别名或接口定义复杂类型
- 使用 `interface` 定义对象结构，`type` 定义联合类型
- 避免使用 `any` 类型，使用 `unknown` 并进行类型断言
- 使用 `enum` 定义枚举值

#### React 规范

- 使用函数组件和 Hooks
- 使用 `useCallback` 和 `useMemo` 优化性能
- 使用 `useState` 管理组件状态
- 使用 `useEffect` 处理副作用
- 组件命名使用 PascalCase

#### 样式规范

- 使用 Tailwind CSS 进行样式开发
- 使用 CSS 变量定义主题颜色
- 避免使用内联样式（除非必要）
- 使用语义化的 HTML 标签

### 代码结构

```
src/
├── components/          # UI 组件（纯展示组件）
├── engine/              # 公式计算引擎
├── store/               # Zustand 状态管理
├── hooks/               # 自定义 Hooks
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
└── templates/           # 预设模板
```

### 添加新功能

#### 添加新公式函数

在 `src/engine/Evaluator.ts` 中添加：

```typescript
private functions: Map<string, Function> = new Map([
  ['MYFUNCTION', (args: any[], context: EvaluationContext) => {
    // 验证参数数量
    if (args.length !== 2) {
      throw new Error('MYFUNCTION 需要 2 个参数');
    }
    // 实现自定义逻辑
    return args[0] + args[1];
  }]
]);
```

#### 添加新组件

1. 在 `src/components/` 目录下创建新组件
2. 在 `src/App.tsx` 中引入并使用

#### 添加新 Hook

在 `src/hooks/` 目录下创建新 Hook：

```typescript
import { useState, useEffect } from 'react';

export function useCustomHook() {
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // 副作用逻辑
  }, []);
  
  return { state, setState };
}
```

## 🧪 测试指南

### 运行测试

```bash
npm test
```

### 编写测试用例

测试文件位于 `src/__tests__/` 目录，使用 Jest 框架编写。

```typescript
import { evaluate } from '../engine/Evaluator';

describe('Formula Evaluation', () => {
  test('should evaluate SUM function', () => {
    const result = evaluate('=SUM(1, 2, 3)');
    expect(result).toBe(6);
  });
});
```

## 📝 文档规范

### README 更新

当添加新功能或修改现有功能时，请更新 `README.md` 中的相关内容：
- 功能特性列表
- 使用说明
- 技术栈信息
- 性能指标

### API 文档

对于公共 API，需要提供清晰的文档说明：
- 函数签名
- 参数说明
- 返回值说明
- 使用示例

## 🔒 安全规范

- 不要提交敏感信息（API Key、密码等）
- 对用户输入进行验证和 sanitize
- 避免 XSS 攻击
- 使用 HTTPS 进行网络请求

## 🤝 行为准则

请参考 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## ❓ 常见问题

### Q: 如何处理冲突？

A: 如果你的分支与 main 分支有冲突，请先更新本地的 main 分支，然后合并到你的分支：

```bash
git checkout main
git pull origin main
git checkout your-branch
git merge main
# 解决冲突后提交
git commit -m "merge: 合并 main 分支"
```

### Q: 如何撤销提交？

A: 使用 `git revert` 撤销提交（推荐）：

```bash
git revert <commit-hash>
```

或者使用 `git reset`（不推荐，会重写历史）：

```bash
git reset --hard <commit-hash>
```

### Q: 如何更新 Fork？

A: 添加上游仓库并同步：

```bash
git remote add upstream https://github.com/JUNNYOfficial/SnapSheet.git
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## 📞 联系我们

如果你有任何问题或建议，可以通过以下方式联系：

- 在 GitHub Issues 中提交问题
- 发送邮件至 maintainers@snapsheet.dev

---

感谢你的贡献！🎉
