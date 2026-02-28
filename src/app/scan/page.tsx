"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useOpenCV } from "@/lib/opencv-loader";
import {
  detectCorners,
  correctPerspective,
  type DetectedCorners,
} from "@/lib/perspective";
import { decodeSheetQR, type SheetQRData } from "@/lib/qr-decoder";
import CameraFeed, { type CameraFeedHandle } from "@/components/CameraFeed";
import ScanResult from "@/components/ScanResult";

// ── Types ──────────────────────────────────────────────────────────

type ScanPhase = "scanning" | "processing" | "result";

// ── Page ───────────────────────────────────────────────────────────

export default function ScanPage() {
  const { ready: cvReady, loading: cvLoading, error: cvError, cv, statusText: cvStatus } = useOpenCV();

  const cameraRef = useRef<CameraFeedHandle>(null);

  const [phase, setPhase] = useState<ScanPhase>("scanning");
  const [statusText, setStatusText] = useState("Point camera at the answer sheet");
  const [correctedImage, setCorrectedImage] = useState<ImageData | null>(null);
  const [qrData, setQrData] = useState<SheetQRData | null>(null);

  // ── Corner detection feedback ──────────────────────────────────

  const handleCornersDetected = useCallback(
    (corners: DetectedCorners | null, stable: boolean) => {
      if (phase !== "scanning") return;
      if (!corners) {
        setStatusText("Point camera at the answer sheet");
      } else if (!stable) {
        setStatusText("Sheet detected — hold steady...");
      } else {
        setStatusText("Capturing...");
      }
    },
    [phase]
  );

  // ── Process a captured frame ───────────────────────────────────

  const processFrame = useCallback(
    (frameCanvas: HTMLCanvasElement) => {
      if (!cv || phase !== "scanning") return;

      setPhase("processing");
      setStatusText("Processing...");

      // Run in a timeout so the UI updates first
      setTimeout(() => {
        try {
          const ctx = frameCanvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) throw new Error("Cannot get canvas context");

          const imageData = ctx.getImageData(
            0,
            0,
            frameCanvas.width,
            frameCanvas.height
          );
          const mat = cv.matFromImageData(imageData);

          // Detect corners
          const corners = detectCorners(cv, mat);
          if (!corners) {
            mat.delete();
            setPhase("scanning");
            setStatusText("Corners lost — try again");
            return;
          }

          // Perspective correction
          const corrected = correctPerspective(cv, mat, corners, 800, 1100);
          mat.delete();

          // QR decode from corrected image
          const qr = decodeSheetQR(corrected);

          setCorrectedImage(corrected);
          setQrData(qr);
          setPhase("result");
        } catch (err) {
          console.error("Processing error:", err);
          setPhase("scanning");
          setStatusText("Processing failed — try again");
        }
      }, 50);
    },
    [cv, phase]
  );

  // ── Auto-capture handler ───────────────────────────────────────

  const handleAutoCapture = useCallback(
    (frameCanvas: HTMLCanvasElement) => {
      processFrame(frameCanvas);
    },
    [processFrame]
  );

  // ── Manual capture ────────────────────────────────────────────

  const handleManualCapture = useCallback(() => {
    const frame = cameraRef.current?.captureFrame();
    if (frame) processFrame(frame);
  }, [processFrame]);

  // ── Re-scan ────────────────────────────────────────────────────

  const handleRescan = useCallback(() => {
    setCorrectedImage(null);
    setQrData(null);
    setPhase("scanning");
    setStatusText("Point camera at the answer sheet");
  }, []);

  // ── Continue (Phase 2b placeholder) ────────────────────────────

  const handleContinue = useCallback(() => {
    // TODO Phase 2b: pass correctedImage + qrData to bubble reader
    alert(
      `Sheet captured!\n\nTest ID: ${qrData?.testId}\nItems: ${qrData?.items}\nChoices: ${qrData?.choices}\n\nBubble reading coming in Phase 2b.`
    );
  }, [qrData]);

  // ── OpenCV loading screen ──────────────────────────────────────

  if (cvLoading) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center text-white z-50">
        <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400 mb-1">Loading scanner engine...</p>
        <p className="text-xs text-gray-500 mb-2">{cvStatus}</p>
        <p className="text-xs text-gray-700">
          First load may take a few seconds
        </p>
      </div>
    );
  }

  // ── OpenCV error screen ────────────────────────────────────────

  if (cvError) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center text-white z-50 p-6">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-sm text-red-400 mb-2 text-center">{cvError}</p>
        <p className="text-xs text-gray-500 mb-6 text-center">
          Check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-lg"
        >
          Reload
        </button>
      </div>
    );
  }

  // ── Result phase ──────────────────────────────────────────────

  if (phase === "result") {
    return (
      <div className="fixed inset-0 z-50">
        <ScanResult
          correctedImage={correctedImage}
          qrData={qrData}
          onRescan={handleRescan}
          onContinue={handleContinue}
        />
      </div>
    );
  }

  // ── Scanning + processing phase ────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <Link
          href="/"
          className="text-white text-sm font-medium flex items-center gap-1.5"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </Link>
        <span className="text-white/70 text-xs font-medium">
          Grado Ph Scanner
        </span>
        <div className="w-12" /> {/* Spacer for centering */}
      </div>

      {/* Camera */}
      <div className="flex-1 relative">
        <CameraFeed
          ref={cameraRef}
          cv={cv}
          onCornersDetected={handleCornersDetected}
          onAutoCapture={handleAutoCapture}
          active={phase === "scanning"}
        />
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-8 px-6">
        {/* Status text */}
        <p className="text-white text-sm text-center mb-4">{statusText}</p>

        {/* Manual capture button */}
        <div className="flex justify-center">
          <button
            onClick={handleManualCapture}
            disabled={phase !== "scanning" || !cvReady}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
          >
            <div className="w-12 h-12 rounded-full bg-white" />
          </button>
        </div>
        <p className="text-white/50 text-xs text-center mt-2">
          Auto-captures when sheet is detected, or tap to capture manually
        </p>
      </div>

      {/* Processing overlay */}
      {phase === "processing" && (
        <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white text-sm">Processing sheet...</p>
          </div>
        </div>
      )}
    </div>
  );
}
