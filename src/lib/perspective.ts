"use client";

/**
 * Corner marker detection & perspective correction using OpenCV.js
 *
 * The answer sheet has 4 solid-black 16×16 px squares placed 5 mm from
 * each page edge.  We detect them via:
 *   grayscale → adaptive threshold → findContours → filter by area +
 *   squareness → classify TL / TR / BL / BR → getPerspectiveTransform →
 *   warpPerspective
 */

// ── Types ──────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface DetectedCorners {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export interface PerspectiveResult {
  /** The corrected (warped) image as an ImageData */
  correctedImage: ImageData;
  /** The 4 corner marker centres found in the original image */
  corners: DetectedCorners;
}

// ── Helpers ────────────────────────────────────────────────────────

/** Euclidean distance between two points. */
function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Contour centre-of-mass via moments. */
function contourCenter(cv: any, contour: any): Point {
  const m = cv.moments(contour, false);
  if (m.m00 === 0) return { x: 0, y: 0 };
  return { x: m.m10 / m.m00, y: m.m01 / m.m00 };
}

/**
 * Classify 4 candidate centres into TL, TR, BL, BR.
 * Sum = x+y → smallest = TL, largest = BR.
 * Diff = y-x → smallest = TR, largest = BL.
 */
function classifyCorners(pts: Point[]): DetectedCorners {
  const sorted = [...pts];

  const bySum = sorted.slice().sort((a, b) => a.x + a.y - (b.x + b.y));
  const topLeft = bySum[0];
  const bottomRight = bySum[3];

  const byDiff = sorted.slice().sort((a, b) => a.y - a.x - (b.y - b.x));
  const topRight = byDiff[0];
  const bottomLeft = byDiff[3];

  return { topLeft, topRight, bottomLeft, bottomRight };
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Detect the 4 corner markers in an image frame.
 *
 * @returns DetectedCorners or null if fewer than 4 valid candidates found.
 */
export function detectCorners(
  cv: any,
  src: any /* cv.Mat (BGR or RGBA) */
): DetectedCorners | null {
  const gray = new cv.Mat();
  const binary = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    // 1. Convert to grayscale
    if (src.channels() === 4) {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    } else if (src.channels() === 3) {
      cv.cvtColor(src, gray, cv.COLOR_BGR2GRAY);
    } else {
      src.copyTo(gray);
    }

    // 2. Adaptive threshold — works under varying lighting
    cv.adaptiveThreshold(
      gray,
      binary,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      15, // block size
      10  // C constant
    );

    // 3. Find external contours
    cv.findContours(
      binary,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    const imgArea = src.rows * src.cols;
    // Marker expected area range (relative to image)
    // A 16px marker on an A4 at ~700px width ≈ (16/600)^2 of image
    // Be generous: 0.0001 – 0.01 of image area
    const minArea = imgArea * 0.0001;
    const maxArea = imgArea * 0.015;

    const candidates: Point[] = [];

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt, false);
      if (area < minArea || area > maxArea) {
        cnt.delete();
        continue;
      }

      // Check squareness via bounding rect aspect ratio
      const rect = cv.boundingRect(cnt);
      const aspect = rect.width / rect.height;
      if (aspect < 0.5 || aspect > 2.0) {
        cnt.delete();
        continue;
      }

      // Check solidity (filled-ness)
      const hull = new cv.Mat();
      cv.convexHull(cnt, hull, false, true);
      const hullArea = cv.contourArea(hull, false);
      const solidity = hullArea > 0 ? area / hullArea : 0;
      hull.delete();

      if (solidity < 0.7) {
        cnt.delete();
        continue;
      }

      // Approximate polygon – should be roughly 4-sided
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.04 * peri, true);
      const vertices = approx.rows;
      approx.delete();

      if (vertices < 4 || vertices > 8) {
        cnt.delete();
        continue;
      }

      candidates.push(contourCenter(cv, cnt));
      cnt.delete();
    }

    if (candidates.length < 4) return null;

    // If more than 4 candidates, pick the 4 closest to image corners
    if (candidates.length > 4) {
      const imgCorners: Point[] = [
        { x: 0, y: 0 },
        { x: src.cols, y: 0 },
        { x: 0, y: src.rows },
        { x: src.cols, y: src.rows },
      ];

      const chosen: Point[] = [];
      for (const ic of imgCorners) {
        let best = candidates[0];
        let bestDist = dist(ic, best);
        for (const c of candidates) {
          const d = dist(ic, c);
          if (d < bestDist) {
            bestDist = d;
            best = c;
          }
        }
        chosen.push(best);
      }

      return classifyCorners(chosen);
    }

    return classifyCorners(candidates);
  } finally {
    gray.delete();
    binary.delete();
    contours.delete();
    hierarchy.delete();
  }
}

/**
 * Perform perspective correction given detected corners.
 *
 * @param outputWidth  Desired output width  (default 800)
 * @param outputHeight Desired output height (default 1100)
 */
export function correctPerspective(
  cv: any,
  src: any,
  corners: DetectedCorners,
  outputWidth = 800,
  outputHeight = 1100
): ImageData {
  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    corners.topLeft.x,
    corners.topLeft.y,
    corners.topRight.x,
    corners.topRight.y,
    corners.bottomLeft.x,
    corners.bottomLeft.y,
    corners.bottomRight.x,
    corners.bottomRight.y,
  ]);

  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0,
    0,
    outputWidth,
    0,
    0,
    outputHeight,
    outputWidth,
    outputHeight,
  ]);

  const M = cv.getPerspectiveTransform(srcPts, dstPts);
  const warped = new cv.Mat();
  const dsize = new cv.Size(outputWidth, outputHeight);
  cv.warpPerspective(src, warped, M, dsize);

  // Convert to RGBA for ImageData
  const rgba = new cv.Mat();
  if (warped.channels() === 4) {
    warped.copyTo(rgba);
  } else if (warped.channels() === 3) {
    cv.cvtColor(warped, rgba, cv.COLOR_BGR2RGBA);
  } else {
    cv.cvtColor(warped, rgba, cv.COLOR_GRAY2RGBA);
  }

  const imageData = new ImageData(
    new Uint8ClampedArray(rgba.data),
    outputWidth,
    outputHeight
  );

  srcPts.delete();
  dstPts.delete();
  M.delete();
  warped.delete();
  rgba.delete();

  return imageData;
}

/**
 * Full pipeline: detect corners → correct perspective.
 *
 * @returns PerspectiveResult or null if corners not found.
 */
export function detectAndCorrect(
  cv: any,
  src: any,
  outputWidth = 800,
  outputHeight = 1100
): PerspectiveResult | null {
  const corners = detectCorners(cv, src);
  if (!corners) return null;

  const correctedImage = correctPerspective(
    cv,
    src,
    corners,
    outputWidth,
    outputHeight
  );
  return { correctedImage, corners };
}
