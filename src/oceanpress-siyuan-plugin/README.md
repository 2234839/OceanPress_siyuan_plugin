# OceanPress 思源插件集合

这是一个包含多个思源笔记插件的源码集合，为思源笔记提供强大的扩展功能。

## 🎯 主要插件

### OceanPress 插件 (`oceanpress-siyuan-plugin`)
**功能最全面的核心插件**

#### 🖼️ 图片格式支持
- **HEIC/HEIF 图片显示** - 支持 iPhone 照片格式，自动转换为 JPEG
- **TIF/TIFF 图片显示** - 支持 TIFF 格式图片无缝显示
- **自动格式转换** - 专用格式 → 标准格式，无需手动操作

#### 🔍 OCR 文字识别
- **批量 OCR 处理** - 支持批量识别图片中的文字
- **智能结果展示** - 成功绿色边框，失败红色边框
- **多引擎支持** - 集成 Umi-OCR 等多种 OCR 引擎
- **文字复制** - 识别后的文字可直接复制使用

#### 📸 挂件快照功能
- **静态化处理** - 为动态挂件生成静态快照
- **网站生成** - 支持 OceanPress 静态网站生成
- **完整保存** - 保留挂件的完整外观和功能

### 其他插件
- **audio2text_plugin_siyuan** - 音频转文字插件
- **aiChat-plugin-siyuan** - AI 聊天插件
- **tts-plugin-siyuan** - 文字转语音插件
- **sy2video-plugin-siyuan** - 思源转视频插件
- **toolkit-plugin-siyuan** - 工具集插件
- **univer-siyuan-plugin** - Univer 表格插件
- **feed_siyuan_plugin** - Feed 订阅插件
- **expr** - 表达式插件

## 🚀 开发环境

### 技术栈
- **前端**: Vue 3 + TypeScript + Tailwind CSS
- **构建**: Vite
- **包管理**: pnpm
- **图片处理**: heic2any, UTIF.js
- **OCR**: Umi-OCR API 集成

### 构建命令
```bash
# 安装依赖
pnpm install

# 构建所有插件
pnpm buildAll

# 构建特定插件
pnpm build:oceanpress-siyuan-plugin
pnpm build:aiChat-plugin-siyuan
pnpm build:tts-plugin-siyuan
# ... 其他插件

# 开发模式
pnpm dev

# 类型检查
pnpm tsc
```

## 📦 插件列表

| 插件名 | 功能描述 | 构建命令 |
|--------|----------|----------|
| oceanpress-siyuan-plugin | 核心：图片格式转换、OCR、挂件快照 | `pnpm build:oceanpress-siyuan-plugin` |
| audio2text_plugin_siyuan | 音频转文字 | `pnpm build:audio2text_plugin_siyuan` |
| aiChat-plugin-siyuan | AI 聊天功能 | `pnpm build:aiChat-plugin-siyuan` |
| tts-plugin-siyuan | 文字转语音 | `pnpm build:tts-plugin-siyuan` |
| sy2video-plugin-siyuan | 思源转视频 | `pnpm build:sy2video-plugin-siyuan` |
| toolkit-plugin-siyuan | 工具集 | `pnpm build:toolkit-plugin-siyuan` |
| univer-siyuan-plugin | Univer 表格 | `pnpm build:univer-siyuan-plugin` |
| feed_siyuan_plugin | Feed 订阅 | `pnpm build:feed` |
| expr | 表达式计算 | `pnpm build:expr` |

## 🛠️ 安装要求

- 思源笔记 v2.10.3+
- Node.js 16+
- pnpm 包管理器

## 📋 使用方法

### 安装插件
1. 构建所需插件：`pnpm build:plugin-name`
2. 在思源笔记中安装对应的 `.zip` 文件
3. 重启思源笔记

### 配置功能
- OCR 功能需要配置 Umi-OCR API
- 图片格式支持自动生效，无需配置

## 🔄 更新日志

### 最新版本
- ✨ 新增 HEIC/HEIF 图片格式支持
- 🚀 优化图片转换性能和稳定性
- 🔧 修复重复处理问题
- 📝 改进错误处理机制

### 历史更新
- 🖼️ 新增 TIF/TIFF 图片格式支持
- 🔍 集成 Umi-OCR 引擎
- 📸 优化挂件快照功能

## 📄 许可证

本项目采用 GPL-3.0 许可证。

## 👨‍💻 开发者

- **作者**: 崮生
- **仓库**: [GitHub](https://github.com/2234839/OceanPress_siyuan_plugin)
- **支持**: [爱发电](https://afdian.com/@llej0)

## 📞 联系方式

如有问题或建议，请通过 GitHub Issues 联系。