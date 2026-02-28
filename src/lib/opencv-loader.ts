"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Extend window to include cv from OpenCV.js
declare global {
  interface Window {
    cv: any;
    Module: any;
  }
}

const OPENCV_CDN_URL =
  "https://docs.opencv.org/4.9.0/opencv.js";

interface OpenCVState {
  ready: boolean;
  loading: boolean;
  error: string | null;
  cv: any;
}

let globalLoadPromise: Promise<any> | null = null;
let globalCv: any = null;

function loadOpenCV(): Promise<any> {
  if (globalCv) return Promise.resolve(globalCv);
  if (globalLoadPromise) return globalLoadPromise;

  globalLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== "undefined" && window.cv && window.cv.Mat) {
      globalCv = window.cv;
      resolve(globalCv);
      return;
    }

    const script = document.createElement("script");
    script.src = OPENCV_CDN_URL;
    script.async = true;

    // OpenCV.js uses Module pattern — we need to wait for onRuntimeInitialized
    window.Module = {
      onRuntimeInitialized: () => {
        globalCv = window.cv;
        resolve(globalCv);
      },
    };

    script.onerror = () => {
      globalLoadPromise = null;
      reject(new Error("Failed to load OpenCV.js from CDN"));
    };

    document.head.appendChild(script);
  });

  return globalLoadPromise;
}

export function useOpenCV(): OpenCVState {
  const [state, setState] = useState<OpenCVState>({
    ready: !!globalCv,
    loading: !globalCv,
    error: null,
    cv: globalCv,
  });
  const mountedRef = useRef(true);

  const init = useCallback(async () => {
    if (globalCv) {
      setState({ ready: true, loading: false, error: null, cv: globalCv });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const cv = await loadOpenCV();
      if (mountedRef.current) {
        setState({ ready: true, loading: false, error: null, cv });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState({
          ready: false,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load OpenCV",
          cv: null,
        });
      }
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
