export default function ResultsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📊</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Results</h1>
        <p className="text-gray-600 mb-4">
          Grading and results will be available in Phase 3. You&apos;ll be able to
          compare scanned answers against an answer key and see detailed
          breakdowns.
        </p>
        <span className="inline-block text-xs font-semibold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
          Coming Soon — Phase 3
        </span>
      </div>
    </div>
  );
}
