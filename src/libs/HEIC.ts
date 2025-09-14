// ABOUTME: HEIC图片解码器，用于在浏览器中解码HEIC格式图片
import heic2any from 'heic2any';

export let HEIC: any = {};

// HEIC解码器主类
HEIC.decode = async function(arrayBuffer: ArrayBuffer) {
    try {
        // 创建 Blob 对象
        const blob = new Blob([arrayBuffer], { type: 'image/heic' });

        // 使用 heic2any 库解码 HEIC 图片并转换为 JPEG
        const jpegBlob = await heic2any({
            blob: blob,
            toType: 'image/jpeg',
            quality: 0.9
        });

        // 将 Blob 转换为 data URL
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(jpegBlob as Blob);
        });
    } catch (error) {
        console.error('HEIC decode error:', error);
        throw error;
    }
};

// 检查是否为HEIC文件
HEIC.isHEIC = function(filename: string) {
    if (!filename) return false;
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? ['heic', 'heif'].includes(ext) : false;
};

// 将HEIC文件转换为data URL
HEIC.bufferToURI = async function(buffer: ArrayBuffer) {
    try {
        // 解码HEIC图片
        const jpegDataUrl = await HEIC.decode(buffer);
        return jpegDataUrl;
    } catch (error) {
        console.error('HEIC decode error:', error);
        throw error;
    }
};

// 存储已处理失败的图片，避免重复尝试
const failedImages = new Set<string>();
const processingImages = new Set<string>();

// 处理单个HEIC图片元素
HEIC.processImage = async function(img: HTMLImageElement) {
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

        const xhr = new XMLHttpRequest();
        xhr.open('GET', src);
        xhr.responseType = 'arraybuffer';

        const dataUrl = await new Promise<string>((resolve, reject) => {
            xhr.onload = async () => {
                try {
                    if (!xhr.response) {
                        reject(new Error('No response data received'));
                        return;
                    }
                    const uri = await HEIC.bufferToURI(xhr.response);
                    resolve(uri);
                } catch (error) {
                    reject(error);
                }
            };
            xhr.onerror = () => reject(new Error('Failed to load HEIC image'));
            xhr.send();
        });

        // 替换图片源
        img.setAttribute('src', dataUrl);
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
HEIC.replaceIMG = async function(imgs: HTMLCollectionOf<HTMLImageElement>) {
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
        await Promise.all(batch.map(img => HEIC.processImage(img)));
    }
};

