/**
 * 图片压缩工具
 * 提供多种图片压缩算法和最优压缩功能
 */

import { encode as avifEncode } from '@jsquash/avif';
import { encode as jpegEncode } from '@jsquash/jpeg';
import { encode as webpEncode } from '@jsquash/webp';
import { calculateSimilarity } from '@/playground/utils/imageSimilarity';

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
  return await imageCompression.default(file, options);
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
 * 执行一次压缩并计算相似度
 */
export async function compressWithSimilarity(
  file: File,
  algorithm: AlgorithmId,
  quality: number,
  mimeType: string,
  originalPreview: string
): Promise<{ blob: Blob; similarity: number | null }> {
  const blob = await compressImage(file, algorithm, { quality, mimeType });

  // 计算相似度
  let similarity: number | null = null;
  if (originalPreview) {
    const compressedPreview = URL.createObjectURL(blob);
    try {
      const result = await calculateSimilarity(originalPreview, compressedPreview);
      similarity = result.ssim * 100;
    } catch (err) {
      console.error('计算相似度失败:', err);
    } finally {
      URL.revokeObjectURL(compressedPreview);
    }
  }

  return { blob, similarity };
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
 * 使用二分法进行最优压缩
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
  let low = 0.1;
  let high = 1.0;
  let bestResult: OptimalCompressionResult | null = null;
  const roundTimes: number[] = [];

  // 二分法搜索最优压缩质量
  for (let round = 1; round <= maxRounds; round++) {
    const roundStart = performance.now();
    const mid = (low + high) / 2;

    const { blob, similarity } = await compressWithSimilarity(
      file,
      algorithm,
      mid,
      mimeType,
      originalPreview
    );

    const roundEnd = performance.now();
    roundTimes.push(Math.round(roundEnd - roundStart));

    if (similarity === null) {
      throw new Error('无法计算相似度');
    }

    const log = `第 ${round}/${maxRounds} 轮: 质量 ${mid.toFixed(3)} → 相似度 ${similarity.toFixed(2)}%`;

    onProgress?.({
      round,
      maxRounds,
      quality: mid,
      similarity,
      log,
    });

    // 如果达到目标相似度，记录这个结果并尝试更低的压缩质量
    if (similarity >= targetSimilarity) {
      bestResult = { quality: mid, similarity, blob, roundTimes: [...roundTimes] };
      high = mid; // 尝试更低的压缩质量
    } else {
      low = mid; // 相似度不够，需要提高压缩质量
    }

    // 如果范围已经很小了，提前结束
    if (high - low < 0.01) {
      break;
    }
  }

  if (!bestResult) {
    throw new Error(`无法达到目标相似度 ${targetSimilarity}%`);
  }

  return bestResult;
}
