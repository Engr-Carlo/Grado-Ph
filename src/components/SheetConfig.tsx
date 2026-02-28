"use client";

import { useState, useCallback } from "react";

export interface SheetConfigData {
  numItems: number;
  choicesPerItem: 4 | 5;
  paperSize: "a4" | "letter" | "folio";
  showName: boolean;
  showStudentId: boolean;
  showSection: boolean;
  showInstructor: boolean;
  showDate: boolean;
  testId: string;
}

function generateTestId(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

interface SheetConfigProps {
  onGenerate: (config: SheetConfigData) => void;
  onPrint: () => void;
  hasSheet: boolean;
}

export default function SheetConfig({ onGenerate, onPrint, hasSheet }: SheetConfigProps) {
  const [numItems, setNumItems] = useState<number>(50);
  const [choicesPerItem, setChoicesPerItem] = useState<4 | 5>(4);
  const [paperSize, setPaperSize] = useState<"a4" | "letter" | "folio">("a4");
  const [showName, setShowName] = useState(true);
  const [showStudentId, setShowStudentId] = useState(true);
  const [showSection, setShowSection] = useState(true);
  const [showInstructor, setShowInstructor] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [testId, setTestId] = useState<string>(generateTestId());

  const handleGenerate = useCallback(() => {
    onGenerate({
      numItems: Math.min(100, Math.max(5, numItems)),
      choicesPerItem,
      paperSize,
      showName,
      showStudentId,
      showSection,
      showInstructor,
      showDate,
      testId,
    });
  }, [numItems, choicesPerItem, paperSize, showName, showStudentId, showSection, showInstructor, showDate, testId, onGenerate]);

  const handleRegenTestId = () => {
    setTestId(generateTestId());
  };

  return (
    <div className="no-print bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Sheet Configuration</h2>

      {/* Number of Items */}
      <div className="mb-4">
        <label htmlFor="numItems" className="block text-sm font-medium text-gray-700 mb-1">
          Number of Items
        </label>
        <input
          type="number"
          id="numItems"
          min={5}
          max={100}
          value={numItems}
          onChange={(e) => setNumItems(parseInt(e.target.value) || 5)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">Min: 5, Max: 100</p>
      </div>

      {/* Choices Per Item */}
      <div className="mb-4">
        <label htmlFor="choices" className="block text-sm font-medium text-gray-700 mb-1">
          Choices Per Item
        </label>
        <select
          id="choices"
          value={choicesPerItem}
          onChange={(e) => setChoicesPerItem(parseInt(e.target.value) as 4 | 5)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
        >
          <option value={4}>4 choices (A–D)</option>
          <option value={5}>5 choices (A–E)</option>
        </select>
      </div>

      {/* Paper Size */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Paper Size</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaperSize("a4")}
            className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
              paperSize === "a4"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            A4
          </button>
          <button
            type="button"
            onClick={() => setPaperSize("letter")}
            className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
              paperSize === "letter"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            US Letter
          </button>
          <button
            type="button"
            onClick={() => setPaperSize("folio")}
            className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
              paperSize === "folio"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            8.5×13
          </button>
        </div>
      </div>

      {/* Student Info Fields */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Student Info Fields</label>
        <div className="space-y-2">
          {[
            { label: "Name", checked: showName, setter: setShowName },
            { label: "Student ID", checked: showStudentId, setter: setShowStudentId },
            { label: "Section", checked: showSection, setter: setShowSection },
            { label: "Instructor", checked: showInstructor, setter: setShowInstructor },
            { label: "Date", checked: showDate, setter: setShowDate },
          ].map((field) => (
            <label key={field.label} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={field.checked}
                onChange={(e) => field.setter(e.target.checked)}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              {field.label}
            </label>
          ))}
        </div>
      </div>

      {/* Test ID */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Test ID</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={testId}
            readOnly
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 font-mono"
          />
          <button
            type="button"
            onClick={handleRegenTestId}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            title="Regenerate Test ID"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full bg-gray-900 text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Generate Sheet
        </button>
        {hasSheet && (
          <button
            type="button"
            onClick={onPrint}
            className="w-full bg-white text-gray-900 py-2.5 px-4 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            🖨️ Print Sheet
          </button>
        )}
      </div>
    </div>
  );
}
