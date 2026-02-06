/**
 * 图片相似度计算工具
 * 提供多种图片质量评估指标
 */

/**
 * 图片相似度计算结果
 */
interface SimilarityResult {
  /** SSIM (结构相似性指数) 0-1，越接近1越相似 */
  ssim: number;
  /** PSNR (峰值信噪比) 单位dB，通常20-40，值越大质量越好 */
  psnr: number;
  /** MSE (均方误差) 值越小越好 */
  mse: number;
}

/**
 * 将图片绘制到 Canvas 并获取像素数据
 */
async function getImageData(imageUrl: string, maxWidth = 256): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // 创建 canvas，限制最大尺寸以提高性能
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取 Canvas 2D 上下文'));
        return;
      }

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
 * 计算 SSIM (结构相似性指数)
 * 使用滑动窗口方法，更符合人眼感知
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
    // 使用标准灰度转换公式
    gray1[j] = 0.299 * data1[i] + 0.587 * data1[i + 1] + 0.114 * data1[i + 2];
    gray2[j] = 0.299 * data2[i] + 0.587 * data2[i + 1] + 0.114 * data2[i + 2];
  }

  // SSIM 常量
  const C1 = 6.5025; // (0.01 * 255)^2
  const C2 = 58.5225; // (0.03 * 255)^2

  // 使用 8x8 滑动窗口
  const windowSize = 8;
  let totalSSIM = 0;
  let windowCount = 0;

  for (let y = 0; y < height - windowSize + 1; y += windowSize) {
    for (let x = 0; x < width - windowSize + 1; x += windowSize) {
      // 提取窗口数据
      const window1: number[] = [];
      const window2: number[] = [];

      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = (y + wy) * width + (x + wx);
          window1.push(gray1[idx]);
          window2.push(gray2[idx]);
        }
      }

      // 计算窗口的均值
      const mean1 = window1.reduce((a, b) => a + b, 0) / windowSize / windowSize;
      const mean2 = window2.reduce((a, b) => a + b, 0) / windowSize / windowSize;

      // 计算方差和协方差
      let var1 = 0;
      let var2 = 0;
      let covar = 0;

      for (let i = 0; i < window1.length; i++) {
        const diff1 = window1[i] - mean1;
        const diff2 = window2[i] - mean2;
        var1 += diff1 * diff1;
        var2 += diff2 * diff2;
        covar += diff1 * diff2;
      }

      var1 /= window1.length;
      var2 /= window2.length;
      covar /= window1.length;

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
 * 计算两张图片的相似度
 * @param image1Url 第一张图片的 URL
 * @param image2Url 第二张图片的 URL
 * @returns 相似度计算结果
 */
export async function calculateSimilarity(image1Url: string, image2Url: string): Promise<SimilarityResult> {
  // 并行加载两张图片的数据
  const [imgData1, imgData2] = await Promise.all([
    getImageData(image1Url),
    getImageData(image2Url),
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

  return {
    ssim: Math.max(0, Math.min(1, ssim)), // 限制在 0-1 范围
    psnr: isFinite(psnr) ? psnr : 100,
    mse,
  };
}

/**
 * 格式化相似度结果为可读文本
 */
export function formatSimilarityResult(result: SimilarityResult): string {
  return `SSIM: ${(result.ssim * 100).toFixed(2)}% | PSNR: ${result.psnr.toFixed(2)}dB | MSE: ${result.mse.toFixed(2)}`;
}

