// ABOUTME: HEIC图片解码器，用于在浏览器中解码HEIC格式图片
import heic2any from 'heic2any';

interface HEICUtils {
    isHEIC: (filename: string) => boolean;
    processImage: (img: HTMLImageElement) => Promise<void>;
    replaceIMG: (imgs?: HTMLCollectionOf<HTMLImageElement>) => Promise<void>;
}

export const HEIC: HEICUtils = {} as HEICUtils;

// 检查是否为HEIC文件
HEIC.isHEIC = function (filename: string): boolean {
    if (!filename) return false;
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? ['heic', 'heif'].includes(ext) : false;
};

// 将多个图片帧转换为动画图片（使用 CSS 动画模拟 GIF）
async function createGifFromFrames(frames: Blob[]): Promise<string> {
    if (frames.length === 1) {
        return URL.createObjectURL(frames[0]); // 单帧直接返回 URL
    }

    // 创建一个包含所有帧的 data URL 数组
    const dataUrls = await Promise.all(
        frames.map(frame => URL.createObjectURL(frame))
    );

    // 创建一个动画 HTML 元素
    const frameDuration = 0.3; // 每帧显示 0.3 秒
    const totalDuration = frames.length * frameDuration;

    // 为每个帧生成动画关键帧
    const keyframes = frames.map((_, index) => {
        const startTime = (index * frameDuration / totalDuration * 100).toFixed(1);
        const endTime = ((index + 1) * frameDuration / totalDuration * 100).toFixed(1);
        return `
            @keyframes heicFrame${index} {
                0%, ${parseFloat(startTime) - 0.1}% { opacity: 0; }
                ${startTime}%, ${endTime}% { opacity: 1; }
                ${parseFloat(endTime) + 0.1}%, 100% { opacity: 0; }
            }
        `;
    }).join('\n');

    const animatedHtml = `
        <div style="position: relative; display: inline-block; width: 100%; height: 100%;">
            ${dataUrls.map((url, index) => `
                <img src="${url}" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    opacity: 0;
                    animation: heicFrame${index} ${totalDuration}s infinite;
                " />
            `).join('')}
            <style>
                ${keyframes}
            </style>
        </div>
    `;

    // 创建 Blob URL 包含动画 HTML
    const blob = new Blob([animatedHtml], { type: 'text/html' });
    return URL.createObjectURL(blob);
}

// 存储已处理失败的图片，避免重复尝试
const failedImages = new Set<string>();
const processingImages = new Set<string>();

// 处理单个HEIC图片元素
HEIC.processImage = async function (img: HTMLImageElement): Promise<void> {
    const src = img.getAttribute('src');
    if (!src || !HEIC.isHEIC(src)) {
        return;
    }

    // 如果这个图片之前已经失败过，就不要再尝试了
    if (failedImages.has(src)) {
        return;
    }

    // 如果这个图片正在处理中，就不要重复处理
    if (processingImages.has(src)) {
        return;
    }

    // 如果图片已经被转换过（src 以 data: 开头），就不要再处理
    if (img.src.startsWith('data:')) {
        return;
    }

    // 标记为正在处理
    processingImages.add(src);

    try {
        console.log('Processing HEIC image:', src);

        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();

        // 提取所有图片帧
        const convertedBlobs = await heic2any({
            blob,
            toType: 'image/jpeg',
            multiple: true,
        });

        // 如果只有一张图片，直接创建 Blob URL
        if (!Array.isArray(convertedBlobs) || convertedBlobs.length === 1) {
            const singleBlob = Array.isArray(convertedBlobs) ? convertedBlobs[0] : convertedBlobs;
            const blobUrl = URL.createObjectURL(singleBlob as Blob);
            img.setAttribute('src', blobUrl);
            console.log('HEIC image converted successfully:', src);
            return;
        }

        // 多张图片合成动画
        const animatedUrl = await createGifFromFrames(convertedBlobs as Blob[]);

        // 检查是否是多帧动画（通过判断 URL 是否指向 HTML）
        const isMultiFrame = convertedBlobs.length > 1;

        if (isMultiFrame) {
            // 多帧：创建 iframe 来显示 CSS 动画
            const iframe = document.createElement('iframe');
            iframe.src = animatedUrl;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.backgroundColor = 'transparent';

            // 替换原始图片元素
            img.parentNode?.replaceChild(iframe, img);
        } else {
            // 单帧：直接设置图片源
            img.setAttribute('src', animatedUrl);
        }

        console.log('HEIC image converted successfully:', src);
    } catch (error) {
        console.error('Failed to process HEIC image:', src, error);
        // 标记为失败，下次不再尝试
        failedImages.add(src);
    } finally {
        // 处理完成，从处理中集合移除
        processingImages.delete(src);
    }
};

// 批量处理页面上的HEIC图片
HEIC.replaceIMG = async function (imgs?: HTMLCollectionOf<HTMLImageElement>): Promise<void> {
    if (!imgs) imgs = document.getElementsByTagName('img');

    const heicImages = [];
    for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        const src = img.getAttribute('src');
        if (src && HEIC.isHEIC(src)) {
            heicImages.push(img);
        }
    }

    // 确保 heicImages 是真正的数组
    const heicImagesArray = Array.from(heicImages);

    // 并行处理所有HEIC图片，限制并发数避免性能问题
    const batchSize = 3; // 每次处理3个图片
    for (let i = 0; i < heicImagesArray.length; i += batchSize) {
        const batch = heicImagesArray.slice(i, i + batchSize);
        await Promise.all(batch.map((img) => HEIC.processImage(img)));
    }
};