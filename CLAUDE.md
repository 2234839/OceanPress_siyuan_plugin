# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码仓库中工作时提供指导。

## 项目概述

这是一个思源笔记的多插件仓库，包含多个 TypeScript 插件，用于扩展思源笔记应用的功能。项目使用 Vite 作为构建工具，支持 Vue 3 和 SolidJS 用于 UI 组件。

## 开发命令

### 构建插件

当你只修改了特定插件的代码的时候就只构建对应的插件
```bash
# 构建所有插件
pnpm buildAll

# 构建特定插件
pnpm build:template
pnpm build:vite-plugin-siyuan
pnpm build:audio2text_plugin_siyuan
pnpm build:oceanpress-siyuan-plugin
pnpm build:sy2video-plugin-siyuan
pnpm build:toolkit-plugin-siyuan
pnpm build:univer-siyuan-plugin
pnpm build:aiChat-plugin-siyuan
pnpm build:tts-plugin-siyuan
pnpm build:expr
pnpm build:feed

# 开发模式
pnpm dev
```
## 架构

### 核心组件

1. **SiyuanPlugin 基类** (`src/libs/siyuanPlugin.ts`):
   - 所有插件的扩展基类
   - 提供 Vue 和 SolidJS 组件挂载工具
   - 处理事件传播阻止
   - 管理插件生命周期和清理

2. **API 层** (`src/libs/api.ts`):
   - 全面的思源 API 封装
   - 处理笔记本、文档、块、资产和文件操作
   - 提供 SQL 查询功能
   - 包含导出和转换工具

### 插件结构

每个插件遵循以下结构：
```
src/[plugin-name]/
├── index.ts          # 主插件入口点
├── plugin.json       # 插件元数据和配置
├── ui.vue           # Vue UI 组件（可选）
├── README.md        # 插件文档
├── icon.png         # 插件图标
└── preview.png      # 插件预览图
```

## 开发指南

### 插件开发
- 扩展 `SiyuanPlugin` 基类
- 使用 `addVueUiComponent` 或 `addUiComponent` 添加 UI 元素
- 在 `addUnloadFn` 中实现适当的清理
- 遵循既定的命名约定

### API 使用
- 从 `~/libs/api` 导入以访问思源 API
- 使用 TypeScript 类型以获得更好的开发体验
- 优雅地处理 API 错误
- 使用提供的 SQL 工具进行数据库操作

### UI 开发
- Vue 3 组件使用 Composition API
- SolidJS 组件使用 JSX
- 使用提供的事件隔离来防止冲突
- 实现响应式设计模式

## 类型检查

项目使用严格的 TypeScript 配置：
- 路径别名：`~/*` -> `./src/*`

运行 `pnpm tsc` 验证类型安全。

## 包管理器

此项目使用 pnpm 作为包管理器。所有命令应使用 `pnpm` 而不是 `npm`。