# OceanPress Playground

这是一个通用的测试平台（Playground），用于测试和实验 OceanPress 插件项目的各种功能。

## 项目结构

```
src/playground/
├── index.html              # 主入口
├── main.ts                 # Vite 入口
├── App.vue                 # 测试平台主界面（导航页）
├── vite.config.ts          # Vite 配置
├── tests/                  # 测试模块目录
│   └── image-compression/  # 图片压缩测试
│       └── ImageCompressionTest.vue
├── README.md              # 本文件
└── QUICK_START.md         # 快速开始指南
```

## 当前可用测试

### 🖼️ 图片压缩测试
- 对比 browser-image-compression 和 jSquash 的压缩效果
- 支持多种格式：WebP, AVIF, JPEG, PNG
- 实时查看压缩前后的效果对比
- 详细的性能统计（文件大小、压缩比、压缩时间）

## 运行方法

```bash
# 启动测试服务器
pnpm dev:playground
```

浏览器会自动打开 `http://localhost:5173`

## 添加新测试

在 `tests/` 目录下创建新的测试模块：

```typescript
// 1. 创建测试组件
// tests/your-feature/YourFeatureTest.vue

// 2. 在 App.vue 中注册
import YourFeatureTest from './tests/your-feature/YourFeatureTest.vue';

// 3. 添加到测试列表
const tests = [
  // ... 现有测试
  {
    id: 'your-feature',
    icon: '🔧',
    title: '你的功能测试',
    description: '功能描述',
    status: 'stable' as const,
  },
];
```

## 技术栈

- Vue 3 + TypeScript
- Vite
- 各功能对应的第三方库

## 后续计划

- [ ] OCR 功能测试
- [ ] 视频处理测试
- [ ] 其他插件功能测试
