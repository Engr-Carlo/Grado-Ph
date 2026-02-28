"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { detectCorners, type DetectedCorners } from "@/lib/perspective";

// ── Types ──────────────────────────────────────────────────────────

export interface CameraFeedHandle {
  /** Grab the current video frame as a <canvas>. */
  captureFrame(): HTMLCanvasElement | null;
}

interface CameraFeedProps {
  cv: any; // OpenCV.js instance
  /**
   * Called each processing tick with detected corners (or null).
   * When `stable` is true the corners have been consistent for ~0.5 s.
   */
  onCornersDetected?: (
    corners: DetectedCorners | null,
    stable: boolean
  ) => void;
  /** Called when auto-capture fires. Passes the raw video frame canvas. */
  onAutoCapture?: (frameCanvas: HTMLCanvasElement) => void;
  /** Set to false to pause processing (e.g. while reviewing results). */
  active?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────

const PROCESS_INTERVAL_MS = 200; // 5 FPS
const STABLE_FRAMES_NEEDED = 3; // ~0.6 s of stability
const STABLE_TOLERANCE_PX = 20; // max drift per corner for "stable"

// ── Component ──────────────────────────────────────────────────────

const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(
  function CameraFeed({ cv, onCornersDetected, onAutoCapture, active = true }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Stability tracking
    const prevCornersRef = useRef<DetectedCorners | null>(null);
    const stableCountRef = useRef(0);
    const autoCapturedRef = useRef(false);

    // ── Imperative handle ────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      captureFrame() {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return null;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        return canvas;
      },
    }));

    // ── Camera start / stop ──────────────────────────────────────

    const startCamera = useCallback(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        setCameraError(
          err.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access."
            : err.name === "NotFoundError"
              ? "No camera found on this device."
              : `Camera error: ${err.message}`
        );
      }
    }, []);

    const stopCamera = useCallback(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }, []);

    useEffect(() => {
      startCamera();
      return () => stopCamera();
    }, [startCamera, stopCamera]);

    // ── Corner detection + overlay drawing ──────────────────────

    useEffect(() => {
      if (!cv || !cameraReady || !active) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!video || !canvas || !overlay) return;

      let raf: number;
      let lastTick = 0;

      const process = (timestamp: number) => {
        raf = requestAnimationFrame(process);

        if (timestamp - lastTick < PROCESS_INTERVAL_MS) return;
        lastTick = timestamp;

        if (video.readyState < 2) return; // HAVE_CURRENT_DATA

        // Draw video frame onto canvas
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Run corner detection
        let mat: any = null;
        let corners: DetectedCorners | null = null;
        try {
          mat = cv.matFromImageData(
            ctx.getImageData(0, 0, canvas.width, canvas.height)
          );
          corners = detectCorners(cv, mat);
        } catch {
          // Swallow — OpenCV may throw on weird frames
        } finally {
          mat?.delete();
        }

        // Draw overlay
        const oCtx = overlay.getContext("2d");
        if (oCtx) {
          overlay.width = video.videoWidth;
          overlay.height = video.videoHeight;
          oCtx.clearRect(0, 0, overlay.width, overlay.height);

          if (corners) {
            const pts = [
              corners.topLeft,
              corners.topRight,
              corners.bottomRight,
              corners.bottomLeft,
            ];

            // Check stability
            let isStable = false;
            if (prevCornersRef.current) {
              const prev = prevCornersRef.current;
              const prevPts = [prev.topLeft, prev.topRight, prev.bottomRight, prev.bottomLeft];
              const maxDrift = Math.max(
                ...pts.map((p, i) =>
                  Math.hypot(p.x - prevPts[i].x, p.y - prevPts[i].y)
                )
              );
              if (maxDrift < STABLE_TOLERANCE_PX) {
                stableCountRef.current++;
              } else {
                stableCountRef.current = 0;
                autoCapturedRef.current = false;
              }
            } else {
              stableCountRef.current = 0;
            }

            isStable = stableCountRef.current >= STABLE_FRAMES_NEEDED;
            prevCornersRef.current = corners;

            // Draw corner polygon
            oCtx.beginPath();
            oCtx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
              oCtx.lineTo(pts[i].x, pts[i].y);
            }
            oCtx.closePath();
            oCtx.strokeStyle = isStable ? "#22c55e" : "#f59e0b";
            oCtx.lineWidth = 3;
            oCtx.stroke();

            // Corner circles
            for (const pt of pts) {
              oCtx.beginPath();
              oCtx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
              oCtx.fillStyle = isStable ? "#22c55e" : "#f59e0b";
              oCtx.fill();
            }

            // Notify parent
            onCornersDetected?.(corners, isStable);

            // Auto-capture
            if (isStable && !autoCapturedRef.current) {
              autoCapturedRef.current = true;
              onAutoCapture?.(canvas);
            }
          } else {
            prevCornersRef.current = null;
            stableCountRef.current = 0;
            onCornersDetected?.(null, false);
          }
        }
      };

      raf = requestAnimationFrame(process);
      return () => cancelAnimationFrame(raf);
    }, [cv, cameraReady, active, onCornersDetected, onAutoCapture]);

    // ── Reset auto-capture flag when re-activated ────────────────

    useEffect(() => {
      if (active) {
        autoCapturedRef.current = false;
        stableCountRef.current = 0;
        prevCornersRef.current = null;
      }
    }, [active]);

    // ── Render ──────────────────────────────────────────────────

    return (
      <div className="relative w-full h-full bg-black overflow-hidden">
        {/* Video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setCameraReady(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Processing canvas (hidden) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay canvas (visible, on top of video) */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Guide frame */}
        {cameraReady && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[85%] h-[75%] border-2 border-white/30 rounded-lg" />
          </div>
        )}

        {/* Camera error overlay */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <div className="text-center">
              <div className="text-5xl mb-3">📷</div>
              <p className="text-white text-sm mb-4">{cameraError}</p>
              <button
                onClick={() => {
                  setCameraError(null);
                  startCamera();
                }}
                className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/70 text-sm">Starting camera...</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default CameraFeed;
