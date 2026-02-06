/**
 * Browser Compression 算法提示
 */
export const BrowserCompressionHint = () => (
  <div>
    使用浏览器原生的 Canvas API 进行压缩。
    <br />
    <br />
    <strong>特点：</strong>
    <br />
    • 速度极快，浏览器原生支持
    <br />• 支持多种格式输出（JPEG、PNG、WebP）
    <br />• 压缩质量取决于浏览器实现
    <br />
    <br />
    <strong>时间消耗：</strong>
    <br />
    ⚡ 极快（~50-200ms）
    <br />
    <br />
    无需外部依赖，稳定可靠。
  </div>
);

/**
 * jSquash WebP 算法提示
 */
export const JSquashWebPHint = () => (
  <div>
    基于 WebAssembly 的 WebP 编码器。
    <br />
    <br />
    <strong>特点：</strong>
    <br />
    • 跨平台一致性更好
    <br />• 压缩率通常优于浏览器原生
    <br />• 仅支持输出 WebP 格式
    <br />
    <br />
    <strong>时间消耗：</strong>
    <br />
    🔄 中等（~200-500ms）
    <br />
    <br />
    GitHub:{' '}
    <a
      href="https://github.com/jamsinclair/jSQuash"
      target="_blank"
      rel="noopener"
      class="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
      jamsinclair/jSQuash
    </a>
  </div>
);

/**
 * jSquash AVIF 算法提示
 */
export const JSquashAVIFHint = () => (
  <div>
    基于 WebAssembly 的 AVIF 编码器。
    <br />
    <br />
    <strong>特点：</strong>
    <br />
    • 最新的图像格式，压缩率极高
    <br />• 适合需要最小文件体积的场景
    <br />• 浏览器兼容性较新（需现代浏览器）
    <br />• 仅支持输出 AVIF 格式
    <br />
    <br />
    <strong>时间消耗：</strong>
    <br />
    🐌 较慢（~500-1500ms）
    <br />
    <br />
    GitHub:{' '}
    <a
      href="https://github.com/jamsinclair/jSQuash"
      target="_blank"
      rel="noopener"
      class="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
      jamsinclair/jSQuash
    </a>
  </div>
);

/**
 * jSquash JPEG 算法提示
 */
export const JSquashJPEGHint = () => (
  <div>
    基于 WebAssembly 的 MozJPEG 编码器。
    <br />
    <br />
    <strong>特点：</strong>
    <br />
    • 经典的 JPEG 格式，兼容性极佳
    <br />• MozJPEG 提供优化的压缩算法
    <br />• 适合需要广泛兼容的场景
    <br />• 仅支持输出 JPEG 格式
    <br />
    <br />
    <strong>时间消耗：</strong>
    <br />
    🔄 中等（~200-500ms）
    <br />
    <br />
    GitHub:{' '}
    <a
      href="https://github.com/jamsinclair/jSQuash"
      target="_blank"
      rel="noopener"
      class="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
      jamsinclair/jSQuash
    </a>
  </div>
);
