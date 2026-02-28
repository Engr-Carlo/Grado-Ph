"use client";

import { useState, useCallback } from "react";
import SheetConfig, { SheetConfigData } from "@/components/SheetConfig";
import AnswerSheetPreview from "@/components/AnswerSheetPreview";

export default function CreatePage() {
  const [config, setConfig] = useState<SheetConfigData | null>(null);

  const handleGenerate = useCallback((newConfig: SheetConfigData) => {
    setConfig(newConfig);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="no-print-container">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="no-print mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Answer Sheet</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure your answer sheet, preview it, and print.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Configuration Panel */}
          <div className="no-print w-full lg:w-80 shrink-0">
            <SheetConfig
              onGenerate={handleGenerate}
              onPrint={handlePrint}
              hasSheet={config !== null}
            />
          </div>

          {/* Preview Area */}
          <div className="flex-1 overflow-auto">
            {config ? (
              <AnswerSheetPreview config={config} />
            ) : (
              <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <p className="text-gray-500 text-lg mb-2">No sheet generated yet</p>
                  <p className="text-gray-400 text-sm">
                    Configure settings and click &quot;Generate Sheet&quot; to preview.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
