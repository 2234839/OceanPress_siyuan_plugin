/**
 * 图片压缩工具
 * 提供多种图片压缩算法和最优压缩功能
 */

import { encode as avifEncode } from '@jsquash/avif';
import { encode as jpegEncode } from '@jsquash/jpeg';
import { encode as webpEncode } from '@jsquash/webp';
import { calculateMsSsimOnly } from '@/playground/utils/imageSimilarity';

/** 压缩算法类型 */
export type AlgorithmId = 'browser-compression' | 'jsquash-webp' | 'jsquash-avif' | 'jsquash-jpeg';

/** 压缩结果 */
export interface CompressionResult {
  /** 压缩后的 Blob */
  blob: Blob;
  /** 文件大小 */
  size: number;
  /** 预览 URL */
  preview: string;
  /** 压缩比 */
  compressionRatio: number;
  /** 每轮压缩耗时(ms)，普通压缩时为 [单次时间]，二分逼近压缩时为 [轮1时间, 轮2时间, ...] */
  roundTimes: number[];
}

/** 压缩选项 */
export interface CompressionOptions {
  /** 压缩质量 0-1 */
  quality: number;
  /** 输出 MIME 类型 */
  mimeType: string;
}

/** 最优压缩结果 */
export interface OptimalCompressionResult {
  /** 最优压缩质量 */
  quality: number;
  /** 达到的相似度 */
  similarity: number;
  /** 压缩后的 Blob */
  blob: Blob;
  /** 每轮压缩耗时(ms) */
  roundTimes: number[];
}

/**
 * 使用 browser-image-compression 压缩
 */
async function compressWithBrowserCompression(
  file: File,
  mimeType: string,
  quality: number
): Promise<Blob> {
  const imageCompression = await import('browser-image-compression');

  const options = {
    maxSizeMB: Number.MAX_VALUE,
    maxWidthOrHeight: undefined,
    useWebWorker: true,
    fileType: mimeType as any,
    initialQuality: quality,
  };

  const result = await imageCompression.default(file, options);

  return result;
}

/**
 * 使用 jSquash WebP 压缩
 */
async function compressWithJSquashWebP(imageData: ImageData, quality: number): Promise<Blob> {
  const options = { quality: Math.round(quality * 100) };
  const compressed = await webpEncode(imageData, options);
  return new Blob([compressed], { type: 'image/webp' });
}

/**
 * 使用 jSquash AVIF 压缩
 */
async function compressWithJSquashAVIF(imageData: ImageData, quality: number): Promise<Blob> {
  const options = { quality: Math.round(quality * 100) };
  const compressed = await avifEncode(imageData, options);
  return new Blob([compressed], { type: 'image/avif' });
}

/**
 * 使用 jSquash JPEG 压缩
 */
async function compressWithJSquashJPEG(imageData: ImageData, quality: number): Promise<Blob> {
  const options = { quality: Math.round(quality * 100) };
  const compressed = await jpegEncode(imageData, options);
  return new Blob([compressed], { type: 'image/jpeg' });
}

/**
 * 将 Blob 转换为 ImageData
 */
export async function blobToImageData(blob: Blob): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取 Canvas 上下文'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * 压缩图片
 */
export async function compressImage(
  file: File,
  algorithm: AlgorithmId,
  options: CompressionOptions
): Promise<Blob> {
  switch (algorithm) {
    case 'browser-compression':
      return await compressWithBrowserCompression(file, options.mimeType, options.quality);

    case 'jsquash-webp':
    case 'jsquash-avif':
    case 'jsquash-jpeg': {
      const imageData = await blobToImageData(file);
      if (algorithm === 'jsquash-webp') {
        return await compressWithJSquashWebP(imageData, options.quality);
      } else if (algorithm === 'jsquash-avif') {
        return await compressWithJSquashAVIF(imageData, options.quality);
      } else {
        return await compressWithJSquashJPEG(imageData, options.quality);
      }
    }

    default:
      throw new Error('未知的压缩算法');
  }
}

/**
 * 执行一次压缩并计算相似度（轻量级版本，仅计算 MS-SSIM）
 * 用于二分查找过程中的快速评估
 */
export async function compressWithSimilarity(
  file: File,
  algorithm: AlgorithmId,
  quality: number,
  mimeType: string,
  originalPreview: string
): Promise<{ blob: Blob; similarity: number | null; compressTime: number }> {
  const compressStart = performance.now();

  const blob = await compressImage(file, algorithm, { quality, mimeType });

  const compressEnd = performance.now();
  const compressTime = Math.round(compressEnd - compressStart);

  // 仅计算 MS-SSIM（不计算 SSIM、PSNR、MSE 等其他指标）
  let similarity: number | null = null;
  let ssimTime = 0;

  if (originalPreview) {
    const compressedPreview = URL.createObjectURL(blob);

    try {
      // 使用轻量级函数，只计算 MS-SSIM
      const result = await calculateMsSsimOnly(originalPreview, compressedPreview);
      similarity = result.msSsim * 100;
      ssimTime = result.computeTime;
    } catch (err) {
      console.error('[MS-SSIM] 计算失败:', err);
    } finally {
      URL.revokeObjectURL(compressedPreview);
    }
  }

  // 输出简洁的压缩结果
  console.log(
    `[${algorithm}] ` +
    `质量${(quality * 100).toFixed(1)}% | ` +
    `${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB (${((1 - blob.size / file.size) * 100).toFixed(1)}%) | ` +
    `MS-SSIM ${similarity?.toFixed(2) ?? 'N/A'}% | ` +
    `压缩:${compressTime}ms + 评估:${ssimTime}ms = ${compressTime + ssimTime}ms`
  );

  return { blob, similarity, compressTime };
}

/**
 * 最优压缩进度回调
 */
export interface OptimalCompressionProgress {
  /** 当前轮数 */
  round: number;
  /** 最大轮数 */
  maxRounds: number;
  /** 当前测试的质量 */
  quality: number;
  /** 达到的相似度 */
  similarity: number | null;
  /** 日志消息 */
  log: string;
}

/**
 * 使用约束优化算法进行最优压缩
 *
 * 物理规律前提（大概率情况，非绝对）：
 * - 压缩质量 ↑ → 体积 ↑（大概率负相关）
 * - 压缩质量 ↑ → 相似度 ↑（大概率正相关）
 *
 * 约束条件（必须满足）：
 * 1. 【首要】相似度 ≥ 目标相似度
 *
 * 优化目标（在满足约束的前提下）：
 * 2. 【主要】体积越小越好
 * 3. 【次要】在体积相同时，相似度越高越好
 *
 * 策略：使用贪婪策略 + 快速收敛
 */
export async function findOptimalCompression(
  file: File,
  algorithm: AlgorithmId,
  mimeType: string,
  originalPreview: string,
  targetSimilarity: number,
  maxRounds: number,
  onProgress?: (progress: OptimalCompressionProgress) => void
): Promise<OptimalCompressionResult> {
  // 收集所有历史数据点用于曲线拟合（包含体积信息）
  const dataPoints: { quality: number; similarity: number; sizeRatio: number }[] = [];
  const testedQualities = new Set<number>(); // 记录已测试的质量，避免重复
  let lowPoint: { quality: number; similarity: number; sizeRatio: number } | null = null;
  let highPoint: { quality: number; similarity: number; sizeRatio: number } | null = null;
  let bestResult: OptimalCompressionResult | null = null;
  const roundTimes: number[] = [];

  /**
   * 简单的预测策略
   *
   * 目标：
   * - 约束：相似度 ≥ 目标相似度
   * - 优化：体积越小越好
   * - 策略：二分搜索找边界，然后在边界附近找最小体积
   */
  const predictNextQuality = (
    lowPoint: { quality: number; similarity: number; sizeRatio: number } | null,
    highPoint: { quality: number; similarity: number; sizeRatio: number } | null
  ): number => {
    if (lowPoint && highPoint) {
      // 已有边界：二分搜索
      const qualityGap = highPoint.quality - lowPoint.quality;

      // 边界很接近，取中间
      if (qualityGap < 0.02) {
        return (lowPoint.quality + highPoint.quality) / 2;
      }

      // 线性插值
      const simDiff = highPoint.similarity - lowPoint.similarity;
      const targetDiff = targetSimilarity - lowPoint.similarity;
      const ratio = targetDiff / simDiff;
      return lowPoint.quality + qualityGap * ratio;
    } else if (highPoint) {
      // 只有上边界（满足目标）：降低质量寻找下边界
      return highPoint.quality * 0.5;
    } else {
      // 只有下边界（不满足目标）：提高质量回到安全区域
      return Math.min(1, (lowPoint!.quality + 1) / 2);
    }
  };

  // 两阶段搜索：粗搜索找边界 + 精细搜索找最优
  for (let round = 1; round <= maxRounds; round++) {
    let mid: number;

    if (round === 1) {
      // 首轮：从中间开始
      mid = 0.5;
    } else {
      // 使用预测策略
      mid = predictNextQuality(lowPoint, highPoint);

      // 避免重复测试
      if (testedQualities.has(mid)) {
        mid = Math.max(0.05, Math.min(1, mid + (Math.random() - 0.5) * 0.01));
      }

      // 日志
      const hasBoundary = lowPoint !== null && highPoint !== null;
      console.log(`[策略] 第${round}轮: ${hasBoundary ? '二分' : '找边界'} → 质量 ${(mid * 100).toFixed(1)}%`);
    }

    const { blob, similarity, compressTime } = await compressWithSimilarity(
      file,
      algorithm,
      mid,
      mimeType,
      originalPreview
    );

    roundTimes.push(compressTime);

    if (similarity === null) {
      throw new Error('无法计算相似度');
    }

    // 计算压缩后的体积比例
    const sizeRatio = blob.size / file.size;

    // 收集数据点
    dataPoints.push({ quality: mid, similarity, sizeRatio });
    testedQualities.add(mid);

    const log = `第 ${round}/${maxRounds} 轮: 质量 ${(mid * 100).toFixed(2)}% → 相似度 ${similarity.toFixed(2)}% → 体积 ${(sizeRatio * 100).toFixed(1)}%`;

    onProgress?.({
      round,
      maxRounds,
      quality: mid,
      similarity,
      log,
    });

    // 更新边界点
    if (similarity >= targetSimilarity) {
      if (!bestResult ||
          blob.size < bestResult.blob.size ||
          (blob.size === bestResult.blob.size && similarity > bestResult.similarity)) {
        bestResult = { quality: mid, similarity, blob, roundTimes: [...roundTimes] };
      }
      highPoint = { quality: mid, similarity, sizeRatio };
    } else {
      lowPoint = { quality: mid, similarity, sizeRatio };
    }

    // 退出判断
    if (round >= 3 && lowPoint && highPoint) {
      // 质量范围很小（<2%），已经很难改进
      if (highPoint.quality - lowPoint.quality < 0.02) {
        console.log(`[退出] 质量范围${((highPoint.quality - lowPoint.quality) * 100).toFixed(1)}%，已收敛`);
        break;
      }
    }
  }

  if (!bestResult) {
    throw new Error(`无法达到目标相似度 ${targetSimilarity}%`);
  }

  return bestResult;
}
