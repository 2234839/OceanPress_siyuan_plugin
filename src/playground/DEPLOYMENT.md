# GitHub Pages 部署说明

## 自动部署

Playground 会自动部署到 GitHub Pages，访问地址：
```
https://2234839.github.io/OceanPress_siyuan_plugin/
```

### 触发条件

以下情况会触发自动部署：
1. 推送到 `main` 分支
2. 修改了 `src/playground/` 目录下的文件
3. 修改了 `.github/workflows/deploy-playground.yml`
4. 修改了 `package.json` 或 `pnpm-lock.yaml`

### 手动触发

在 GitHub Actions 页面选择 "Deploy Playground to GitHub Pages" workflow，点击 "Run workflow" 按钮。

## 本地开发

```bash
# 启动开发服务器
pnpm dev:playground

# 本地构建测试
pnpm vite build --config src/playground/vite.config.ts
```

## 注意事项

### jSquash WebAssembly 文件

由于 jSquash 使用 WebAssembly，在 GitHub Pages 部署后需要确保：
- ✅ WASM 文件正确打包
- ✅ MIME 类型正确设置
- ✅ CORS 配置正确

### 路径配置

- **本地开发**：base 路径为 `/`
- **GitHub Pages**：base 路径为 `/OceanPress_siyuan_plugin/`

配置会自动根据环境变量切换。

## 故障排查

### 构建失败

检查：
1. pnpm 版本是否为 v10+
2. Node.js 版本是否为 v22+
3. 依赖是否正确安装

### 部署后 404

检查：
1. GitHub Pages 设置中的 Source 是否为 "GitHub Actions"
2. base 路径配置是否正确

### WASM 加载失败

检查：
1. 浏览器控制台是否有 CORS 错误
2. 文件是否正确上传到 GitHub

## 首次设置

在仓库设置中启用 GitHub Pages：

1. 进入仓库 **Settings**
2. 选择 **Pages** (左侧菜单)
3. **Source** 选择 **GitHub Actions**
4. 保存设置

然后推送代码即可自动部署！
