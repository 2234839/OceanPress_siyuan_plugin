/**
 * 图片相似度计算工具（简化版）
 * 专门用于 toolkit 插件的智能压缩功能
 * 只计算 MS-SSIM 指标，用于评估压缩质量
 */

/**
 * MS-SSIM 计算结果
 */
export interface MsSsimResult {
  /** MS-SSIM 值 0-1，越接近1越相似 */
  msSsim: number;
  /** 计算耗时（毫秒） */
  computeTime: number;
}

/**
 * 将图片绘制到 Canvas 并获取像素数据
 */
async function getImageData(imageUrl: string, maxWidth: number = 1024): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');

      // 采样策略：按 maxWidth 缩放
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取 Canvas 2D 上下文'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
      // 注意：这里不立即释放 URL，因为可能还需要使用
    };

    img.onerror = (e) => {
      console.error('[getImageData] 图片加载失败:', e, imageUrl);
      reject(new Error('图片加载失败'));
    };
    img.src = imageUrl;
  });
}

/**
 * 计算局部均值
 */
function calculateMean(data: Uint8ClampedArray, x: number, y: number, width: number, height: number, windowSize: number): number {
  const half = Math.floor(windowSize / 2);
  let sum = 0;
  let count = 0;

  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * 4;
        // 使用灰度值：0.299R + 0.587G + 0.114B
        sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        count++;
      }
    }
  }

  return sum / count;
}

/**
 * 计算局部标准差和协方差
 */
function calculateStdAndCov(
  data1: Uint8ClampedArray,
  data2: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  mean1: number,
  mean2: number,
  windowSize: number
): { std1: number; std2: number; cov: number } {
  const half = Math.floor(windowSize / 2);
  let var1 = 0;
  let var2 = 0;
  let cov = 0;
  let count = 0;

  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * 4;
        const gray1 = 0.299 * data1[idx] + 0.587 * data1[idx + 1] + 0.114 * data1[idx + 2];
        const gray2 = 0.299 * data2[idx] + 0.587 * data2[idx + 1] + 0.114 * data2[idx + 2];

        const diff1 = gray1 - mean1;
        const diff2 = gray2 - mean2;

        var1 += diff1 * diff1;
        var2 += diff2 * diff2;
        cov += diff1 * diff2;
        count++;
      }
    }
  }

  return {
    std1: Math.sqrt(var1 / count),
    std2: Math.sqrt(var2 / count),
    cov: cov / count,
  };
}

/**
 * 计算 SSIM（结构相似性）
 */
function calculateSSIM(img1: ImageData, img2: ImageData, windowSize: number = 11): number {
  const data1 = img1.data;
  const data2 = img2.data;
  const width = img1.width;
  const height = img1.height;

  // SSIM 常数
  const C1 = 0.01 * 0.01 * 255 * 255;
  const C2 = 0.03 * 0.03 * 255 * 255;
  const C3 = C2 / 2;

  let totalSSIM = 0;
  let sampleCount = 0;

  // 采样计算（每隔几个像素计算一次，提高性能）
  const step = Math.max(1, Math.floor(Math.min(width, height) / 100));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const mean1 = calculateMean(data1, x, y, width, height, windowSize);
      const mean2 = calculateMean(data2, x, y, width, height, windowSize);

      const { std1, std2, cov } = calculateStdAndCov(
        data1,
        data2,
        x,
        y,
        width,
        height,
        mean1,
        mean2,
        windowSize
      );

      // SSIM 公式
      const numerator = (2 * mean1 * mean2 + C1) * (2 * cov + C2);
      const denominator = (mean1 * mean1 + mean2 * mean2 + C1) * (std1 * std1 + std2 * std2 + C2);
      const ssim = denominator === 0 ? 1 : numerator / denominator;

      totalSSIM += ssim;
      sampleCount++;
    }
  }

  return totalSSIM / sampleCount;
}

/**
 * 计算多尺度 SSIM (MS-SSIM)
 * 简化版本，只使用标准尺度
 *
 * 注意：此函数不负责释放 URL，由调用者管理 URL 生命周期
 */
async function calculateMsSsimSimple(imageUrl1: string, imageUrl2: string): Promise<MsSsimResult> {
  const startTime = performance.now();

  // 获取两张图片的像素数据
  const imgData1 = await getImageData(imageUrl1, 1024);
  const imgData2 = await getImageData(imageUrl2, 1024);

  // 计算 SSIM
  const ssim = calculateSSIM(imgData1, imgData2);

  const endTime = performance.now();
  const computeTime = Math.round(endTime - startTime);

  // MS-SSIM 在简化版本中就是 SSIM 值
  return {
    msSsim: ssim,
    computeTime,
  };
}

/**
 * 只计算 MS-SSIM 的快速函数
 * 用于智能压缩过程中的质量评估
 */
export async function calculateMsSsimOnly(originalUrl: string, compressedUrl: string): Promise<MsSsimResult> {
  return await calculateMsSsimSimple(originalUrl, compressedUrl);
}
