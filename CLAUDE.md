# CLAUDE.md

## 项目概述

这是一个思源笔记的多插件仓库，包含多个 TypeScript 插件，用于扩展思源笔记应用的功能。项目使用 Vite、Vue3、ts、tailwindcss v4技术

## 开发命令

### 构建插件

当你只修改了特定插件的代码的时候就只构建对应的插件
```bash
# 构建所有插件
pnpm buildAll

# 构建特定插件
pnpm build:template

# 开发模式
pnpm dev
```
## 架构

### 核心组件

1. **SiyuanPlugin 基类** (`src/libs/siyuanPlugin.ts`):
   - 所有插件的扩展基类

2. **API 层** (`src/libs/api.ts`):

### 插件结构

```
src/[plugin-name]/
├── index.ts          # 主插件入口点
├── plugin.json       # 插件元数据和配置
├── ui.vue           # Vue UI 组件（可选）
```

## 开发指南

### 插件开发
- 扩展 `SiyuanPlugin` 基类
- 使用 `addVueUiComponent` 或 `addUiComponent` 添加 UI 元素
- 在 `addUnloadFn` 中实现适当的清理
- 遵循既定的命名约定

### API 使用
- 从 `libs/api` 导入以访问思源 API
- 使用 TypeScript 类型以获得更好的开发体验
- 优雅地处理 API 错误
- 使用提供的 SQL 工具进行数据库操作

### UI 开发
- Vue 3 组件使用 Composition API
- 实现响应式设计模式

## 类型检查

项目使用严格的 TypeScript 配置
运行 `pnpm tsc` 验证类型安全。

## 包管理器

此项目使用 pnpm 作为包管理器

## 夜间主题

所有样式设计应当考虑夜间模式
可以通过检测 html 的 data-theme-mode="dark" 属性来实现响应式的变化,对于 tailwindcss 的样式而言可以使用 dark:xxx 来指定暗色模式下的变化