/**
 * 图片压缩工具
 *
 * 注意：
 * - toolkit 插件：使用 browser-image-compression（兼容性更好）
 * - playground：使用 jSquash WebP（质量更高，支持智能压缩）
 */

import { calculateMsSsimOnly } from './imageSimilarity';

/**
 * 将 Blob/File 转换为 ImageData
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
      // 释放 URL 对象
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('图片加载失败'));
    };
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * 使用 browser-image-compression 压缩图片
 * 用于 toolkit 插件
 *
 * @param imageData 图片数据（File、ArrayBuffer 或 Blob）
 * @param quality 压缩质量 0-1（默认 0.8）
 * @param originalFileName 原始文件名（用于保留文件名）
 * @returns 压缩后的 File，失败返回 null
 */
export async function compressImageToWebP(
  imageData: File | ArrayBuffer | Blob,
  quality: number = 0.8,
  originalFileName?: string
): Promise<File | null> {
  try {
    // 动态导入 browser-image-compression
    const imageCompression = await import('browser-image-compression');

    // 处理不同类型的图片数据
    let file: File;

    if (imageData instanceof ArrayBuffer) {
      const fileName = originalFileName || 'image.png';
      file = new File([imageData], fileName, { type: 'image/png' });
    } else if (imageData instanceof Blob) {
      const fileName = originalFileName || 'image';
      file = imageData instanceof File ? imageData : new File([imageData], fileName, { type: imageData.type });
    } else {
      file = imageData;
    }

    // 从原始文件名获取基础名称（不含扩展名）
    const getBaseFileName = (fullName: string): string => {
      if (!fullName) return 'image';

      if (fullName.startsWith('http://') || fullName.startsWith('https://')) {
        try {
          const url = new URL(fullName);
          const pathname = url.pathname;
          const filename = pathname.split('/').pop() || 'image';
          return filename.split('.')[0];
        } catch {
          return 'image';
        }
      }

      return fullName.split('.')[0];
    };

    const baseName = getBaseFileName(originalFileName || file.name);
    const finalFileName = `${baseName}.webp`;

    // 使用 browser-image-compression 压缩
    const options = {
      useWebWorker: true,
      fileType: 'image/webp' as const,
      quality: quality,
    };

    const compressedFile = await imageCompression.default(file, options);

    // 创建新文件，保持原始文件名（但改为 webp 扩展名）
    return new File([compressedFile], finalFileName, { type: 'image/webp' });
  } catch (error) {
    console.error('Image compression error:', error);
    return null;
  }
}

/** 智能压缩进度回调 */
export interface SmartCompressionProgress {
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

/** 智能压缩结果 */
export interface SmartCompressionResult {
  /** 最优压缩质量 */
  quality: number;
  /** 达到的相似度 */
  similarity: number;
  /** 压缩后的 File */
  file: File;
  /** 每轮压缩耗时(ms) */
  roundTimes: number[];
}

/**
 * 智能压缩（带相似度逼近）
 * 使用二分法自动寻找最优压缩质量
 *
 * @param file 原始图片文件
 * @param originalPreview 原始图片预览 URL
 * @param targetSimilarity 目标相似度（95-100，默认 99）
 * @param maxRounds 最大优化轮数（默认 10）
 * @param onProgress 进度回调
 * @returns 智能压缩结果
 */
export async function smartCompressImage(
  file: File,
  originalPreview: string,
  targetSimilarity: number = 99,
  maxRounds: number = 10,
  onProgress?: (progress: SmartCompressionProgress) => void
): Promise<SmartCompressionResult> {
  const dataPoints: { quality: number; similarity: number; sizeRatio: number }[] = [];
  const testedQualities = new Set<number>();
  let lowPoint: { quality: number; similarity: number; sizeRatio: number } | null = null;
  let highPoint: { quality: number; similarity: number; sizeRatio: number } | null = null;
  let bestResult: SmartCompressionResult | null = null;
  const roundTimes: number[] = [];

  /**
   * 执行一次压缩并计算相似度
   */
  const compressWithSimilarity = async (quality: number): Promise<{
    file: File | null;
    similarity: number | null;
    compressTime: number;
  }> => {
    const compressStart = performance.now();

    const compressedFile = await compressImageToWebP(file, quality, file.name);

    const compressEnd = performance.now();
    const compressTime = Math.round(compressEnd - compressStart);

    let similarity: number | null = null;

    if (compressedFile && originalPreview) {
      const compressedPreview = URL.createObjectURL(compressedFile);

      try {
        const result = await calculateMsSsimOnly(originalPreview, compressedPreview);
        similarity = result.msSsim * 100;
      } catch (err) {
        console.error('[MS-SSIM] 计算失败:', err);
      }

      // 释放压缩后的预览 URL
      URL.revokeObjectURL(compressedPreview);
    }

    console.log(
      `[智能压缩] ` +
      `质量${(quality * 100).toFixed(1)}% | ` +
      `${(file.size / 1024).toFixed(1)}KB → ${compressedFile ? (compressedFile.size / 1024).toFixed(1) : 'N/A'}KB | ` +
      `MS-SSIM ${similarity?.toFixed(2) ?? 'N/A'}% | ` +
      `耗时 ${compressTime}ms`
    );

    return { file: compressedFile, similarity, compressTime };
  };

  /**
   * 预测下一个测试的质量
   */
  const predictNextQuality = (
    lowPoint: { quality: number; similarity: number; sizeRatio: number } | null,
    highPoint: { quality: number; similarity: number; sizeRatio: number } | null
  ): number => {
    if (lowPoint && highPoint) {
      const qualityGap = highPoint.quality - lowPoint.quality;

      if (qualityGap < 0.02) {
        return (lowPoint.quality + highPoint.quality) / 2;
      }

      const simDiff = highPoint.similarity - lowPoint.similarity;
      const targetDiff = targetSimilarity - lowPoint.similarity;
      const ratio = targetDiff / simDiff;
      return lowPoint.quality + qualityGap * ratio;
    } else if (highPoint) {
      return highPoint.quality * 0.5;
    } else {
      return Math.min(1, (lowPoint!.quality + 1) / 2);
    }
  };

  // 二分搜索找最优质量
  for (let round = 1; round <= maxRounds; round++) {
    let mid: number;

    if (round === 1) {
      mid = 0.5;
    } else {
      mid = predictNextQuality(lowPoint, highPoint);

      if (testedQualities.has(mid)) {
        mid = Math.max(0.05, Math.min(1, mid + (Math.random() - 0.5) * 0.01));
      }

      const hasBoundary = lowPoint !== null && highPoint !== null;
      console.log(`[策略] 第${round}轮: ${hasBoundary ? '二分' : '找边界'} → 质量 ${(mid * 100).toFixed(1)}%`);
    }

    const { file: compressedFile, similarity, compressTime } = await compressWithSimilarity(mid);

    roundTimes.push(compressTime);

    if (similarity === null || !compressedFile) {
      throw new Error('无法计算相似度或压缩失败');
    }

    const sizeRatio = compressedFile.size / file.size;
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
          compressedFile.size < bestResult.file.size ||
          (compressedFile.size === bestResult.file.size && similarity > bestResult.similarity)) {
        bestResult = { quality: mid, similarity, file: compressedFile, roundTimes: [...roundTimes] };
      }
      highPoint = { quality: mid, similarity, sizeRatio };
    } else {
      lowPoint = { quality: mid, similarity, sizeRatio };
    }

    // 退出判断
    if (round >= 3 && lowPoint && highPoint) {
      if (highPoint.quality - lowPoint.quality < 0.02) {
        console.log(`[退出] 质量范围${((highPoint.quality - lowPoint.quality) * 100).toFixed(1)}%，已收敛`);
        break;
      }
    }
  }

  if (!bestResult) {
    throw new Error(`无法达到目标相似度 ${targetSimilarity}%`);
  }

  console.log(`[完成] 最优质量: ${bestResult.quality.toFixed(3)} → 相似度 ${bestResult.similarity.toFixed(2)}% → 文件大小 ${(bestResult.file.size / 1024).toFixed(1)}KB`);

  // 释放原始图片预览 URL
  URL.revokeObjectURL(originalPreview);

  return bestResult;
}

