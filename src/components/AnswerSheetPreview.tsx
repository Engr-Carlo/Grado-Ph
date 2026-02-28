"use client";

import { QRCodeSVG } from "qrcode.react";
import { SheetConfigData } from "./SheetConfig";

interface AnswerSheetPreviewProps {
  config: SheetConfigData;
}

export default function AnswerSheetPreview({ config }: AnswerSheetPreviewProps) {
  const {
    numItems,
    choicesPerItem,
    paperSize,
    showName,
    showStudentId,
    showSection,
    showInstructor,
    showDate,
    testId,
  } = config;

  const choiceLabels =
    choicesPerItem === 4 ? ["A", "B", "C", "D"] : ["A", "B", "C", "D", "E"];

  // Determine layout: 2 columns if items > 50
  const useDoubleColumn = numItems > 50;
  const col1End = useDoubleColumn ? Math.ceil(numItems / 2) : numItems;
  const col2Start = useDoubleColumn ? col1End + 1 : 0;
  const col2End = useDoubleColumn ? numItems : 0;

  // QR data: encode test config for Phase 2 scanner
  const qrData = JSON.stringify({
    testId,
    items: numItems,
    choices: choicesPerItem,
    paperSize,
  });

  // Paper dimensions
  const paperClass =
    paperSize === "a4"
      ? "w-[210mm] min-h-[297mm]"
      : paperSize === "folio"
        ? "w-[8.5in] min-h-[13in]"
        : "w-[8.5in] min-h-[11in]";

  // Build bubble rows for a column
  const buildColumn = (start: number, end: number) => {
    const rows = [];
    for (let i = start; i <= end; i++) {
      rows.push(
        <div key={i} className="flex items-center gap-0">
          <span className="w-8 text-right pr-2 text-[11px] font-medium text-black shrink-0">
            {i}.
          </span>
          <div className="flex gap-[6px]">
            {choiceLabels.map((label) => (
              <div
                key={label}
                className="w-[20px] h-[20px] rounded-full border-[1.5px] border-black flex items-center justify-center"
              >
                <span className="text-[7px] font-medium text-black leading-none">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return rows;
  };

  // Column header row (A B C D or A B C D E)
  const renderColumnHeader = () => (
    <div className="flex items-center gap-0 mb-1">
      <span className="w-8" />
      <div className="flex gap-[6px]">
        {choiceLabels.map((label) => (
          <span
            key={label}
            className="w-[20px] text-center text-[8px] font-bold text-black"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );

  // Active student info fields
  const infoFields: string[] = [];
  if (showName) infoFields.push("Name");
  if (showStudentId) infoFields.push("Student ID");
  if (showSection) infoFields.push("Section");
  if (showInstructor) infoFields.push("Instructor");
  if (showDate) infoFields.push("Date");

  return (
    <div
      id="answer-sheet-print"
      className={`${paperClass} bg-white mx-auto p-[10mm] relative text-black`}
      style={{ boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}
    >
      {/* Corner Alignment Markers — critical for Phase 2 scanning */}
      <div className="absolute top-[5mm] left-[5mm] w-[16px] h-[16px] bg-black" />
      <div className="absolute top-[5mm] right-[5mm] w-[16px] h-[16px] bg-black" />
      <div className="absolute bottom-[5mm] left-[5mm] w-[16px] h-[16px] bg-black" />
      <div className="absolute bottom-[5mm] right-[5mm] w-[16px] h-[16px] bg-black" />

      {/* Header Section */}
      <div className="flex justify-between items-start mb-4 pt-2">
        <div>
          <h1 className="text-xl font-bold text-black m-0">Grado Ph</h1>
          <p className="text-xs text-gray-600 m-0">Answer Sheet</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <p className="text-xs font-medium text-black m-0">
              Test ID: {testId}
            </p>
            <p className="text-[10px] text-gray-500 m-0">
              {numItems} items &middot; {choicesPerItem} choices &middot;{" "}
              {paperSize.toUpperCase()}
            </p>
          </div>
          <QRCodeSVG value={qrData} size={56} level="M" />
        </div>
      </div>

      {/* Student Info Fields */}
      {infoFields.length > 0 && (
        <div className="border border-black p-3 mb-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {infoFields.map((field) => (
              <div key={field} className="flex items-end gap-1">
                <span className="text-[11px] font-medium text-black whitespace-nowrap">
                  {field}:
                </span>
                <div className="flex-1 border-b border-black min-w-[80px]" />
              </div>
            ))}
            {/* Score box — always shown */}
            <div className="flex items-end gap-1">
              <span className="text-[11px] font-medium text-black whitespace-nowrap">
                Score:
              </span>
              <div className="w-16 h-6 border border-black" />
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <p className="text-[9px] text-gray-600 mb-3 italic">
        Instructions: Fill the circle completely with a dark pen or pencil.
        Erase cleanly if you change an answer.
      </p>

      {/* Bubble Grid */}
      {useDoubleColumn ? (
        <div className="flex gap-6">
          {/* Column 1 */}
          <div className="flex-1">
            {renderColumnHeader()}
            <div className="space-y-[2px]">{buildColumn(1, col1End)}</div>
          </div>

          {/* Vertical divider */}
          <div className="w-px bg-gray-300" />

          {/* Column 2 */}
          <div className="flex-1">
            {renderColumnHeader()}
            <div className="space-y-[2px]">
              {buildColumn(col2Start, col2End)}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {renderColumnHeader()}
          <div className="space-y-[2px]">{buildColumn(1, numItems)}</div>
        </div>
      )}
    </div>
  );
}
