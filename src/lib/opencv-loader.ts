"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Extend window to include cv from OpenCV.js
declare global {
  interface Window {
    cv: any;
    Module: any;
  }
}

/**
 * CDN sources in priority order.
 * jsdelivr is fast & globally cached. The others are fallbacks.
 */
const OPENCV_CDN_URLS = [
  "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.9.0-release.2/dist/opencv.js",
  "https://cdn.jsdelivr.net/npm/mirada@0.0.15/dist/src/opencv.js",
  "https://docs.opencv.org/4.9.0/opencv.js",
];

const LOAD_TIMEOUT_MS = 25_000; // 25 s per CDN attempt

interface OpenCVState {
  ready: boolean;
  loading: boolean;
  error: string | null;
  cv: any;
  /** Human-readable loading status. */
  statusText: string;
}

let globalLoadPromise: Promise<any> | null = null;
let globalCv: any = null;
let statusListeners: Array<(msg: string) => void> = [];

function notifyStatus(msg: string) {
  statusListeners.forEach((fn) => fn(msg));
}

/** Try loading from a single CDN URL with a timeout. */
function tryLoadFrom(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout loading from ${url}`));
    }, LOAD_TIMEOUT_MS);

    // Remove any previous Module hooks
    window.Module = {
      onRuntimeInitialized: () => {
        cleanup();
        resolve(window.cv);
      },
    };

    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    script.onerror = () => {
      cleanup();
      reject(new Error(`Network error loading ${url}`));
    };

    function cleanup() {
      clearTimeout(timer);
    }

    document.head.appendChild(script);
  });
}

async function loadOpenCV(): Promise<any> {
  if (globalCv) return globalCv;
  if (globalLoadPromise) return globalLoadPromise;

  globalLoadPromise = (async () => {
    // Check if already loaded from a previous visit
    if (typeof window !== "undefined" && window.cv && window.cv.Mat) {
      globalCv = window.cv;
      return globalCv;
    }

    let lastError: Error | null = null;

    for (let i = 0; i < OPENCV_CDN_URLS.length; i++) {
      const url = OPENCV_CDN_URLS[i];
      const cdnName = url.includes("jsdelivr")
        ? "jsdelivr"
        : url.includes("docs.opencv")
          ? "opencv.org"
          : "mirror";

      notifyStatus(
        i === 0
          ? `Connecting to ${cdnName}...`
          : `Retrying from ${cdnName} (attempt ${i + 1}/${OPENCV_CDN_URLS.length})...`
      );

      try {
        const cv = await tryLoadFrom(url);
        if (cv && cv.Mat) {
          globalCv = cv;
          notifyStatus("Ready!");
          return cv;
        }
        throw new Error("OpenCV loaded but cv.Mat not available");
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`OpenCV CDN ${i + 1} failed:`, lastError.message);
        // Remove the failed script tag so the next attempt starts fresh
        const scripts = document.querySelectorAll(`script[src="${url}"]`);
        scripts.forEach((s) => s.remove());
      }
    }

    globalLoadPromise = null;
    throw new Error(
      lastError?.message || "All OpenCV CDN sources failed. Check your internet connection."
    );
  })();

  return globalLoadPromise;
}

export function useOpenCV(): OpenCVState {
  const [state, setState] = useState<OpenCVState>({
    ready: !!globalCv,
    loading: !globalCv,
    error: null,
    cv: globalCv,
    statusText: globalCv ? "Ready!" : "Initializing...",
  });
  const mountedRef = useRef(true);

  const init = useCallback(async () => {
    if (globalCv) {
      setState({ ready: true, loading: false, error: null, cv: globalCv, statusText: "Ready!" });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    // Subscribe to status updates
    const onStatus = (msg: string) => {
      if (mountedRef.current) {
        setState((s) => ({ ...s, statusText: msg }));
      }
    };
    statusListeners.push(onStatus);

    try {
      const cv = await loadOpenCV();
      if (mountedRef.current) {
        setState({ ready: true, loading: false, error: null, cv, statusText: "Ready!" });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState({
          ready: false,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load OpenCV",
          cv: null,
          statusText: "Failed",
        });
      }
    } finally {
      statusListeners = statusListeners.filter((fn) => fn !== onStatus);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    init();
    return () => {
      mountedRef.current = false;
    };
  }, [init]);

  return state;
}
