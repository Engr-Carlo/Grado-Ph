import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Grado Ph</h1>
        <p className="text-lg text-gray-600 mb-8">
          A ZipGrade-style grading scanner web app. Create answer sheets, scan
          them with your camera, and get instant grades.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="border border-gray-200 rounded-lg p-4 text-left">
            <div className="text-2xl mb-2">📝</div>
            <h3 className="font-semibold text-gray-900 mb-1">Create Sheets</h3>
            <p className="text-sm text-gray-600">
              Configure and print custom answer sheets with QR codes.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-left opacity-50">
            <div className="text-2xl mb-2">📷</div>
            <h3 className="font-semibold text-gray-900 mb-1">Scan Answers</h3>
            <p className="text-sm text-gray-600">
              Use your camera to scan filled answer sheets instantly.
            </p>
            <span className="text-xs text-gray-400">Coming in Phase 2</span>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-left opacity-50">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900 mb-1">View Results</h3>
            <p className="text-sm text-gray-600">
              Grade automatically and see detailed breakdowns.
            </p>
            <span className="text-xs text-gray-400">Coming in Phase 3</span>
          </div>
        </div>

        <Link
          href="/create"
          className="inline-block bg-gray-900 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Create Answer Sheet →
        </Link>
      </div>
    </div>
  );
}
