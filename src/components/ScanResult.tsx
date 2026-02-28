"use client";

import { useRef, useEffect } from "react";
import type { SheetQRData } from "@/lib/qr-decoder";

interface ScanResultProps {
  /** The perspective-corrected image to display. */
  correctedImage: ImageData | null;
  /** Decoded QR information from the sheet. */
  qrData: SheetQRData | null;
  /** Go back and scan again. */
  onRescan: () => void;
  /** Proceed (placeholder for Phase 2b — bubble reading). */
  onContinue: () => void;
}

export default function ScanResult({
  correctedImage,
  qrData,
  onRescan,
  onContinue,
}: ScanResultProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the corrected image onto the canvas
  useEffect(() => {
    if (!correctedImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = correctedImage.width;
    canvas.height = correctedImage.height;
    const ctx = canvas.getContext("2d");
    ctx?.putImageData(correctedImage, 0, 0);
  }, [correctedImage]);

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <h2 className="text-base font-semibold">Scan Result</h2>
        {qrData ? (
          <span className="text-xs bg-green-600/30 text-green-400 px-2 py-1 rounded-full">
            QR Decoded
          </span>
        ) : (
          <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-1 rounded-full">
            QR Not Found
          </span>
        )}
      </div>

      {/* Corrected Image Preview */}
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
        {correctedImage ? (
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto rounded-lg shadow-lg border border-gray-800"
          />
        ) : (
          <div className="text-gray-500 text-sm mt-12">
            No corrected image available.
          </div>
        )}
      </div>

      {/* QR Info Card */}
      {qrData && (
        <div className="mx-4 mb-3 bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-sm font-semibold mb-2 text-gray-300">
            Sheet Information
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Test ID:</span>{" "}
              <span className="font-mono">{qrData.testId}</span>
            </div>
            <div>
              <span className="text-gray-500">Items:</span> {qrData.items}
            </div>
            <div>
              <span className="text-gray-500">Choices:</span> {qrData.choices}
            </div>
            <div>
              <span className="text-gray-500">Paper:</span>{" "}
              {qrData.paperSize.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 pb-6 pt-2 flex gap-3">
        <button
          onClick={onRescan}
          className="flex-1 py-3 bg-gray-800 text-white text-sm font-medium rounded-xl border border-gray-700 active:bg-gray-700 transition-colors"
        >
          Re-scan
        </button>
        <button
          onClick={onContinue}
          disabled={!qrData}
          className="flex-1 py-3 bg-white text-black text-sm font-medium rounded-xl active:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
