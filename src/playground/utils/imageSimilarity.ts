/**
 * 图片相似度计算工具
 * 提供多种图片质量评估指标
 * 支持 SSIM、MS-SSIM、PSNR、MSE 等指标
 */

/**
 * 性能模式
 */
export type PerformanceMode = 'fast' | 'standard' | 'accurate';

/**
 * 图片相似度计算结果
 */
export interface SimilarityResult {
  /** SSIM (结构相似性指数) 0-1，越接近1越相似 */
  ssim: number;
  /** MS-SSIM (多尺度结构相似性指数) 0-1，更符合人眼感知 */
  msSsim?: number;
  /** PSNR (峰值信噪比) 单位dB，通常20-40，值越大质量越好 */
  psnr: number;
  /** MSE (均方误差) 值越小越好 */
  mse: number;
  /** 计算耗时（毫秒） */
  computeTime: number;
}

/**
 * 相似度计算配置
 */
export interface SimilarityOptions {
  /** 性能模式 */
  mode?: PerformanceMode;
  /** 是否计算 MS-SSIM（默认启用） */
  enableMsSsim?: boolean;
  /** 最大宽度（用于降采样加速） */
  maxWidth?: number;
  /** 是否使用 Web Worker */
  useWorker?: boolean;
}

/**
 * 性能模式对应的采样宽度
 * 对于压缩质量评估，需要更高分辨率才能准确检测模糊和伪影
 */
const MODE_WIDTH_MAP: Record<PerformanceMode, number> = {
  fast: 1024, // 快速模式：1024px
  standard: 1536, // 标准模式：1536px (适合大多数场景)
  accurate: 2048, // 精确模式：2048px (保留更多细节)
};

/**
 * 将图片绘制到 Canvas 并获取像素数据
 * 使用智能采样策略，确保保留足够的细节用于 MS-SSIM 计算
 */
async function getImageData(imageUrl: string, maxWidth: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');

      // 采样策略：直接按 maxWidth 缩放，保留更多细节用于检测压缩伪影
      // 如果原图小于 maxWidth，则使用原始尺寸
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取 Canvas 2D 上下文'));
        return;
      }

      // 使用高质量图像缩放
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = imageUrl;
  });
}

/**
 * 计算两个 ImageData 之间的均方误差 (MSE)
 */
function calculateMSE(img1: ImageData, img2: ImageData): number {
  const data1 = img1.data;
  const data2 = img2.data;
  const pixelCount = img1.width * img1.height;

  let sumSquaredError = 0;

  // 计算每个像素的 RGB 误差平方和
  for (let i = 0; i < data1.length; i += 4) {
    const rDiff = data1[i] - data2[i];
    const gDiff = data1[i + 1] - data2[i + 1];
    const bDiff = data1[i + 2] - data2[i + 2];

    sumSquaredError += rDiff * rDiff + gDiff * gDiff + bDiff * bDiff;
  }

  // MSE = 总误差平方和 / (像素数量 * 3通道)
  return sumSquaredError / (pixelCount * 3);
}

/**
 * 计算峰值信噪比 (PSNR)
 * PSNR = 10 * log10(MAX^2 / MSE)
 * 其中 MAX = 255 (8位图像的最大像素值)
 */
function calculatePSNR(mse: number): number {
  if (mse === 0) return Infinity;

  const maxPixel = 255;
  return 10 * Math.log10((maxPixel * maxPixel) / mse);
}

/**
 * 生成高斯窗口权重
 * @param windowSize 窗口大小
 * @param sigma 高斯标准差
 */
function generateGaussianWindow(windowSize: number, sigma: number): Float32Array {
  const window = new Float32Array(windowSize * windowSize);
  const center = Math.floor(windowSize / 2);
  let sum = 0;

  // 生成二维高斯核
  for (let y = 0; y < windowSize; y++) {
    for (let x = 0; x < windowSize; x++) {
      const dx = x - center;
      const dy = y - center;
      const weight = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      window[y * windowSize + x] = weight;
      sum += weight;
    }
  }

  // 归一化
  for (let i = 0; i < window.length; i++) {
    window[i] /= sum;
  }

  return window;
}

/**
 * 计算 SSIM (结构相似性指数)
 * 使用像素级滑动窗口 + 高斯加权，符合标准实现
 */
function calculateSSIM(img1: ImageData, img2: ImageData): number {
  const data1 = img1.data;
  const data2 = img2.data;
  const width = img1.width;
  const height = img1.height;

  // 转换为灰度值数组
  const gray1 = new Float32Array(width * height);
  const gray2 = new Float32Array(width * height);

  for (let i = 0, j = 0; i < data1.length; i += 4, j++) {
    // 使用标准灰度转换公式 (ITU-R BT.601)
    gray1[j] = 0.299 * data1[i] + 0.587 * data1[i + 1] + 0.114 * data1[i + 2];
    gray2[j] = 0.299 * data2[i] + 0.587 * data2[i + 1] + 0.114 * data2[i + 2];
  }

  // SSIM 常量 (标准值)
  const C1 = 6.5025; // (0.01 * 255)^2
  const C2 = 58.5225; // (0.03 * 255)^2

  // 使用 11x11 高斯窗口（标准配置）
  const windowSize = 11;
  const sigma = 1.5;
  const gaussianWindow = generateGaussianWindow(windowSize, sigma);
  const halfWindow = Math.floor(windowSize / 2);

  let totalSSIM = 0;
  let windowCount = 0;

  // 像素级滑动窗口（标准实现）
  for (let y = halfWindow; y < height - halfWindow; y++) {
    for (let x = halfWindow; x < width - halfWindow; x++) {
      // 提取窗口数据并应用高斯权重
      let weightedSum1 = 0;
      let weightedSum2 = 0;
      let weightSum = 0;

      // 计算加权均值
      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const pixely = y - halfWindow + wy;
          const pixelx = x - halfWindow + wx;
          const idx = pixely * width + pixelx;
          const weight = gaussianWindow[wy * windowSize + wx];

          weightedSum1 += gray1[idx] * weight;
          weightedSum2 += gray2[idx] * weight;
          weightSum += weight;
        }
      }

      const mean1 = weightedSum1 / weightSum;
      const mean2 = weightedSum2 / weightSum;

      // 计算加权的方差和协方差
      let var1 = 0;
      let var2 = 0;
      let covar = 0;

      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const pixely = y - halfWindow + wy;
          const pixelx = x - halfWindow + wx;
          const idx = pixely * width + pixelx;
          const weight = gaussianWindow[wy * windowSize + wx];

          const diff1 = gray1[idx] - mean1;
          const diff2 = gray2[idx] - mean2;

          var1 += diff1 * diff1 * weight;
          var2 += diff2 * diff2 * weight;
          covar += diff1 * diff2 * weight;
        }
      }

      var1 /= weightSum;
      var2 /= weightSum;
      covar /= weightSum;

      // SSIM 公式
      const numerator = (2 * mean1 * mean2 + C1) * (2 * covar + C2);
      const denominator = (mean1 * mean1 + mean2 * mean2 + C1) * (var1 + var2 + C2);

      totalSSIM += numerator / denominator;
      windowCount++;
    }
  }

  return totalSSIM / windowCount;
}

/**
 * 对 ImageData 进行降采样（通过 2x2 平均池化）
 * @param imageData 原始图像数据
 * @returns 降采样后的图像数据
 */
function downsampleImageData(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const newWidth = Math.floor(width / 2);
  const newHeight = Math.floor(height / 2);

  if (newWidth === 0 || newHeight === 0) {
    throw new Error('图像太小，无法继续降采样');
  }

  const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      // 2x2 区域的像素索引
      const idx1 = (y * 2 * width + x * 2) * 4;
      const idx2 = (y * 2 * width + (x * 2 + 1)) * 4;
      const idx3 = ((y * 2 + 1) * width + x * 2) * 4;
      const idx4 = ((y * 2 + 1) * width + (x * 2 + 1)) * 4;

      const outIdx = (y * newWidth + x) * 4;

      // 对每个通道进行 2x2 平均
      for (let c = 0; c < 4; c++) {
        newData[outIdx + c] = Math.floor(
          (data[idx1 + c] + data[idx2 + c] + data[idx3 + c] + data[idx4 + c]) / 4,
        );
      }
    }
  }

  return new ImageData(newData, newWidth, newHeight);
}

/**
 * 计算单个尺度的 SSIM 分量（标准实现）
 * 使用滑动窗口计算每个像素的局部统计量，然后取平均
 * 参考 TensorFlow 实现：tensorflow/models/research/compression/image_encoder/msssim.py
 */
function calculateSingleScaleSSIMComponents(
  img1: ImageData,
  img2: ImageData,
  gaussianWindow: Float32Array,
  windowSize: number,
): { mean1: number; mean2: number; sd1: number; sd2: number; cs: number } {
  const data1 = img1.data;
  const data2 = img2.data;
  const width = img1.width;
  const height = img1.height;

  const C2 = 58.5225; // (0.03 * 255)^2

  // 转换为灰度
  const gray1 = new Float32Array(width * height);
  const gray2 = new Float32Array(width * height);

  for (let i = 0, j = 0; i < data1.length; i += 4, j++) {
    gray1[j] = 0.299 * data1[i] + 0.587 * data1[i + 1] + 0.114 * data1[i + 2];
    gray2[j] = 0.299 * data2[i] + 0.587 * data2[i + 1] + 0.114 * data2[i + 2];
  }

  const halfWindow = Math.floor(windowSize / 2);
  const validWidth = width - 2 * halfWindow;
  const validHeight = height - 2 * halfWindow;
  const validPixels = validWidth * validHeight;

  // 为每个有效像素计算局部统计量
  const mu1 = new Float32Array(validPixels);
  const mu2 = new Float32Array(validPixels);
  const mu1_sq = new Float32Array(validPixels);
  const mu2_sq = new Float32Array(validPixels);
  const mu1_mu2 = new Float32Array(validPixels);
  const sigma1_sq = new Float32Array(validPixels);
  const sigma2_sq = new Float32Array(validPixels);
  const sigma12 = new Float32Array(validPixels);

  let idx = 0;

  // 对每个像素应用高斯窗口
  for (let y = halfWindow; y < height - halfWindow; y++) {
    for (let x = halfWindow; x < width - halfWindow; x++, idx++) {
      let weightedSum1 = 0;
      let weightedSum2 = 0;
      let weightSum = 0;

      // 计算加权均值
      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const pixely = y - halfWindow + wy;
          const pixelx = x - halfWindow + wx;
          const pixelIdx = pixely * width + pixelx;
          const weight = gaussianWindow[wy * windowSize + wx];

          weightedSum1 += gray1[pixelIdx] * weight;
          weightedSum2 += gray2[pixelIdx] * weight;
          weightSum += weight;
        }
      }

      mu1[idx] = weightedSum1 / weightSum;
      mu2[idx] = weightedSum2 / weightSum;
      mu1_sq[idx] = mu1[idx] * mu1[idx];
      mu2_sq[idx] = mu2[idx] * mu2[idx];
      mu1_mu2[idx] = mu1[idx] * mu2[idx];

      // 计算加权方差和协方差
      let var1 = 0;
      let var2 = 0;
      let covar = 0;

      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const pixely = y - halfWindow + wy;
          const pixelx = x - halfWindow + wx;
          const pixelIdx = pixely * width + pixelx;
          const weight = gaussianWindow[wy * windowSize + wx];

          const diff1 = gray1[pixelIdx] - mu1[idx];
          const diff2 = gray2[pixelIdx] - mu2[idx];

          var1 += diff1 * diff1 * weight;
          var2 += diff2 * diff2 * weight;
          covar += diff1 * diff2 * weight;
        }
      }

      sigma1_sq[idx] = var1 / weightSum;
      sigma2_sq[idx] = var2 / weightSum;
      sigma12[idx] = covar / weightSum;
    }
  }

  // 计算全局统计量（对所有像素取平均）
  let totalMu1 = 0;
  let totalMu2 = 0;
  let totalSigma1_sq = 0;
  let totalSigma2_sq = 0;
  let totalSigma12 = 0;

  for (let i = 0; i < validPixels; i++) {
    totalMu1 += mu1[i];
    totalMu2 += mu2[i];
    totalSigma1_sq += sigma1_sq[i];
    totalSigma2_sq += sigma2_sq[i];
    totalSigma12 += sigma12[i];
  }

  const mean1 = totalMu1 / validPixels;
  const mean2 = totalMu2 / validPixels;
  const var1 = totalSigma1_sq / validPixels;
  const var2 = totalSigma2_sq / validPixels;

  const sd1 = Math.sqrt(var1);
  const sd2 = Math.sqrt(var2);

  // 对比度敏感度（对所有像素的 CS 取平均）
  let totalCs = 0;
  for (let i = 0; i < validPixels; i++) {
    // CS = (2*σ12 + C2) / (σ1² + σ2² + C2)
    totalCs += (2 * sigma12[i] + C2) / (sigma1_sq[i] + sigma2_sq[i] + C2);
  }
  const cs = totalCs / validPixels;

  return { mean1, mean2, sd1, sd2, cs };
}

/**
 * 计算 MS-SSIM (多尺度结构相似性指数)
 * MS-SSIM 在多个分辨率尺度上计算 SSIM，更符合人眼感知
 * 标准实现使用 5 个尺度，权重为 [0.0448, 0.2856, 0.3001, 0.2363, 0.1333]
 * 参考: Wang, E. Simoncelli, and A. Bovik, "Multi-scale structural similarity for image quality assessment"
 * 以及 TensorFlow 官方实现: https://github.com/tensorflow/models/blob/master/research/compression/image_encoder/msssim.py
 */
function calculateMSSSIM(img1: ImageData, img2: ImageData): number {
  // MS-SSIM 标准权重（来自原始论文和 TensorFlow 实现）
  const weights = [0.0448, 0.2856, 0.3001, 0.2363, 0.1333];
  const levels = weights.length;

  // 高斯窗口
  const windowSize = 11;
  const sigma = 1.5;
  const gaussianWindow = generateGaussianWindow(windowSize, sigma);

  const C1 = 6.5025; // (0.01 * 255)^2
  const C2 = 58.5225; // (0.03 * 255)^2

  let currentImg1 = img1;
  let currentImg2 = img2;

  const mcs: number[] = []; // 对比度敏感度（Contrast Sensitivity）
  const mssim: number[] = []; // 完整的 SSIM 值

  // 在每个尺度上计算
  for (let i = 0; i < levels; i++) {
    const components = calculateSingleScaleSSIMComponents(
      currentImg1,
      currentImg2,
      gaussianWindow,
      windowSize,
    );

    // 计算对比度敏感度 (cs = structure comparison)
    const cs = components.cs;
    mcs.push(cs);

    // 计算完整的 SSIM (luminance × contrast × structure)
    const l =
      (2 * components.mean1 * components.mean2 + C1) /
      (components.mean1 * components.mean1 + components.mean2 * components.mean2 + C1);
    const c =
      (2 * components.sd1 * components.sd2 + C2) /
      (components.sd1 * components.sd1 + components.sd2 * components.sd2 + C2);

    const ssim = l * c * cs;
    mssim.push(ssim);

    // 除了最后一层，都要降采样
    if (i < levels - 1) {
      currentImg1 = downsampleImageData(currentImg1);
      currentImg2 = downsampleImageData(currentImg2);
    }
  }

  // MS-SSIM 标准公式：
  // 前 N-1 层使用对比度敏感度 (cs)，最后一层使用完整 SSIM
  // MS-SSIM = ∏(cs[i]^weights[i]) * ssim[last]^weight[last]
  let result = 1.0;
  for (let i = 0; i < levels - 1; i++) {
    result *= Math.pow(Math.max(0, mcs[i]), weights[i]);
  }
  result *= Math.pow(Math.max(0, mssim[levels - 1]), weights[levels - 1]);

  return result;
}

/**
 * 计算两张图片的相似度
 * @param image1Url 第一张图片的 URL
 * @param image2Url 第二张图片的 URL
 * @param options 计算选项
 * @returns 相似度计算结果
 */
export async function calculateSimilarity(
  image1Url: string,
  image2Url: string,
  options: SimilarityOptions = {},
): Promise<SimilarityResult> {
  const startTime = performance.now();

  // 默认启用 MS-SSIM
  const enableMsSsim = options.enableMsSsim !== false;

  // 确定采样宽度
  const maxWidth = options.maxWidth ?? MODE_WIDTH_MAP[options.mode ?? 'standard'];

  // 并行加载两张图片的数据
  const [imgData1, imgData2] = await Promise.all([
    getImageData(image1Url, maxWidth),
    getImageData(image2Url, maxWidth),
  ]);

  // 确保 ImageData 尺寸一致
  if (imgData1.width !== imgData2.width || imgData1.height !== imgData2.height) {
    throw new Error('图片尺寸不匹配');
  }

  // 计算 MSE
  const mse = calculateMSE(imgData1, imgData2);

  // 计算 PSNR
  const psnr = calculatePSNR(mse);

  // 计算 SSIM
  const ssim = calculateSSIM(imgData1, imgData2);

  const endTime = performance.now();
  const computeTime = Math.round(endTime - startTime);

  const result: SimilarityResult = {
    ssim: Math.max(0, Math.min(1, ssim)),
    psnr: isFinite(psnr) ? psnr : 100,
    mse,
    computeTime,
  };

  // 计算 MS-SSIM（默认启用）
  if (enableMsSsim) {
    result.msSsim = Math.max(0, Math.min(1, calculateMSSSIM(imgData1, imgData2)));
  }

  return result;
}

/**
 * 快速计算 MS-SSIM（仅用于优化过程，不计算其他指标）
 * @param image1Url 第一张图片的 URL
 * @param image2Url 第二张图片的 URL
 * @param maxWidth 采样宽度（默认使用 accurate 模式以获得更准确的评估）
 * @returns MS-SSIM 值 (0-1) 和计算耗时
 */
export async function calculateMsSsimOnly(
  image1Url: string,
  image2Url: string,
  maxWidth: number = MODE_WIDTH_MAP.accurate // 使用更高分辨率
): Promise<{ msSsim: number; computeTime: number }> {
  const startTime = performance.now();

  // 加载图片数据
  const [imgData1, imgData2] = await Promise.all([
    getImageData(image1Url, maxWidth),
    getImageData(image2Url, maxWidth),
  ]);

  // 确保 ImageData 尺寸一致
  if (imgData1.width !== imgData2.width || imgData1.height !== imgData2.height) {
    throw new Error('图片尺寸不匹配');
  }

  // 只计算 MS-SSIM
  const msSsim = calculateMSSSIM(imgData1, imgData2);

  const endTime = performance.now();
  const computeTime = Math.round(endTime - startTime);

  return {
    msSsim: Math.max(0, Math.min(1, msSsim)),
    computeTime,
  };
}