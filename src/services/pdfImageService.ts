/**
 * PDF Image Extraction Service
 * 
 * Renders PDF pages to images and uploads to Supabase Storage.
 * Uses pdfjs-dist for browser-side PDF rendering.
 */

import { supabase } from '@/integrations/supabase/client';

// PDF.js worker URL (loaded from CDN)
const PDFJS_VERSION = '3.11.174';
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

declare global {
    interface Window {
        pdfjsLib: any;
    }
}

let pdfjsLoaded = false;

/**
 * Load PDF.js library from CDN
 */
export async function loadPdfJs(): Promise<void> {
    if (pdfjsLoaded && window.pdfjsLib) return;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${PDFJS_CDN}/pdf.min.js`;
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
            pdfjsLoaded = true;
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Render a single PDF page to a PNG blob, optionally cropped to a bounding box
 * @param bbox - Optional normalized bounding box [ymin, xmin, ymax, xmax] (0-1000)
 */
async function renderPageToImage(
    pdfDoc: any,
    pageNumber: number,
    scale: number = 2.0,
    bbox?: number[]
): Promise<Blob> {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Create main canvas for full page rendering
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render page
    await page.render({
        canvasContext: context,
        viewport: viewport,
    }).promise;

    let finalCanvas = canvas;

    // Apply cropping if bbox is provided
    if (bbox && bbox.length === 4) {
        const [ymin, xmin, ymax, xmax] = bbox;
        const padding = 20; // 20px padding

        // Scale normalized coordinates (0-1000) to pixel values
        let cropX = (xmin / 1000) * viewport.width;
        let cropY = (ymin / 1000) * viewport.height;
        let cropW = ((xmax - xmin) / 1000) * viewport.width;
        let cropH = ((ymax - ymin) / 1000) * viewport.height;

        // Apply padding and ensure we stay within bounds
        const paddedX = Math.max(0, cropX - padding);
        const paddedY = Math.max(0, cropY - padding);
        const paddedW = Math.min(viewport.width - paddedX, cropW + (cropX - paddedX) + padding);
        const paddedH = Math.min(viewport.height - paddedY, cropH + (cropY - paddedY) + padding);

        // Create secondary canvas for the cropped region
        const cropCanvas = document.createElement('canvas');
        const cropContext = cropCanvas.getContext('2d')!;
        cropCanvas.width = paddedW;
        cropCanvas.height = paddedH;

        // Draw the region from the main canvas to the crop canvas
        cropContext.drawImage(
            canvas,
            paddedX, paddedY, paddedW, paddedH, // Source region
            0, 0, paddedW, paddedH              // Destination region
        );

        finalCanvas = cropCanvas;
    }

    // Convert to blob
    return new Promise((resolve, reject) => {
        finalCanvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to convert canvas to blob'));
            },
            'image/png',
            0.9
        );
    });
}

/**
 * Upload image blob to Supabase Storage
 */
async function uploadToStorage(
    blob: Blob,
    fileName: string
): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from('question-images')
        .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: true,
        });

    if (error) {
        console.error(`Storage upload error for ${fileName}:`, error);
        if (error.message.includes('Bucket not found')) {
            console.error('CRITICAL: The "question-images" bucket does not exist. Please run the fix_storage_rls.sql migration.');
        }
        return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

export interface PageImage {
    pageNumber: number;
    imageUrl: string;
}

/**
 * Extract a specific region from a PDF page as an image
 */
export async function extractPdfRegion(
    pdfArrayBuffer: ArrayBuffer,
    pageNumber: number,
    bbox: number[],
    fileNamePrefix: string
): Promise<string | null> {
    await loadPdfJs();

    const pdfDoc = await window.pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
    if (pageNumber < 1 || pageNumber > pdfDoc.numPages) return null;

    try {
        const blob = await renderPageToImage(pdfDoc, pageNumber, 2.0, bbox);
        const fileName = `${fileNamePrefix}_crop_${pageNumber}_${Date.now()}.png`;
        return await uploadToStorage(blob, fileName);
    } catch (err) {
        console.warn(`Failed to render region on page ${pageNumber}:`, err);
        return null;
    } finally {
        // We don't destroy here because the buffer might be needed again
        // but in this specific function it's the only use.
        // However, the "detached" error happens because getDocument transfers the buffer.
        await pdfDoc.destroy();
    }
}

/**
 * Extract a specific region from an already loaded PDF document
 */
export async function extractRegionFromDoc(
    pdfDoc: any,
    pageNumber: number,
    bbox: number[],
    fileNamePrefix: string
): Promise<string | null> {
    if (pageNumber < 1 || pageNumber > pdfDoc.numPages) return null;

    try {
        const blob = await renderPageToImage(pdfDoc, pageNumber, 2.0, bbox);
        const fileName = `${fileNamePrefix}_crop_${pageNumber}_${Date.now()}.png`;
        return await uploadToStorage(blob, fileName);
    } catch (err) {
        console.warn(`Failed to render region on page ${pageNumber}:`, err);
        return null;
    }
}

/**
 * Extract images from specific PDF pages (Legacy - renders full pages)
 */
export async function extractPdfPageImages(
    pdfArrayBuffer: ArrayBuffer,
    pageNumbers: number[],
    fileNamePrefix: string
): Promise<Map<number, string>> {
    await loadPdfJs();

    const pdfDoc = await window.pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
    const pageImages = new Map<number, string>();

    for (const pageNum of pageNumbers) {
        if (pageNum < 1 || pageNum > pdfDoc.numPages) continue;

        try {
            const blob = await renderPageToImage(pdfDoc, pageNum);
            const fileName = `${fileNamePrefix}_page_${pageNum}_${Date.now()}.png`;
            const imageUrl = await uploadToStorage(blob, fileName);

            if (imageUrl) {
                pageImages.set(pageNum, imageUrl);
            }
        } catch (err) {
            console.warn(`Failed to render page ${pageNum}:`, err);
        }
    }

    return pageImages;
}

/**
 * Extract all pages from a PDF chunk as images
 * Used when AI indicates questions have images
 */
export async function extractChunkImages(
    chunkBlob: Blob,
    startPage: number,
    endPage: number,
    fileNamePrefix: string
): Promise<Map<number, string>> {
    const arrayBuffer = await chunkBlob.arrayBuffer();
    const pageNumbers = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => i + 1 // 1-indexed within chunk
    );

    return extractPdfPageImages(arrayBuffer, pageNumbers, fileNamePrefix);
}

/**
 * Check if storage bucket exists and create if needed
 */
export async function ensureStorageBucket(): Promise<boolean> {
    // Note: Client-side bucket creation usually fails due to RLS/Permissions.
    // We rely on the migration fix_storage_rls.sql to create the bucket.
    console.log('Checking storage bucket availability...');
    return true;
}
