"use client";

import jsQR from "jsqr";

/**
 * Decoded QR payload matching the structure encoded in AnswerSheetPreview.
 */
export interface SheetQRData {
  testId: string;
  items: number;
  choices: number;
  paperSize: string;
}

/**
 * Decode the QR code from a corrected (warped) answer-sheet image.
 *
 * Strategy: the QR code lives in the top-right header area of the sheet.
 * We crop that region and pass it to jsQR.  If the first crop fails we
 * retry on the full image (in case the warp shifted things).
 */
export function decodeSheetQR(imageData: ImageData): SheetQRData | null {
  // Try cropping the top-right quadrant first (faster, less noise)
  const cropResult = decodeCropped(imageData);
  if (cropResult) return cropResult;

  // Fallback: try the full image
  return decodeFromImageData(imageData);
}

/**
 * Attempt to decode QR from the top-right region of the image.
 */
function decodeCropped(imageData: ImageData): SheetQRData | null {
  const { width, height, data } = imageData;

  // Crop top-right 40% width × 20% height
  const cropX = Math.floor(width * 0.55);
  const cropY = 0;
  const cropW = width - cropX;
  const cropH = Math.floor(height * 0.25);

  const cropped = new Uint8ClampedArray(cropW * cropH * 4);
  for (let row = 0; row < cropH; row++) {
    const srcOffset = ((cropY + row) * width + cropX) * 4;
    const dstOffset = row * cropW * 4;
    cropped.set(data.subarray(srcOffset, srcOffset + cropW * 4), dstOffset);
  }

  const qr = jsQR(cropped, cropW, cropH);
  return parseQRResult(qr);
}

/**
 * Attempt to decode QR from full ImageData.
 */
function decodeFromImageData(imageData: ImageData): SheetQRData | null {
  const qr = jsQR(imageData.data, imageData.width, imageData.height);
  return parseQRResult(qr);
}

/**
 * Parse jsQR result into SheetQRData, returning null on failure.
 */
function parseQRResult(qr: ReturnType<typeof jsQR>): SheetQRData | null {
  if (!qr) return null;

  try {
    const parsed = JSON.parse(qr.data);
    if (
      typeof parsed.testId === "string" &&
      typeof parsed.items === "number" &&
      typeof parsed.choices === "number" &&
      typeof parsed.paperSize === "string"
    ) {
      return parsed as SheetQRData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Decode QR directly from a canvas element.
 * Useful for decoding from the raw camera frame before perspective correction.
 */
export function decodeQRFromCanvas(
  canvas: HTMLCanvasElement
): SheetQRData | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return decodeFromImageData(imageData);
}
