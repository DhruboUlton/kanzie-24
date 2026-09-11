// Shown while the aggregation queries run. Mirrors the real layout so the
// page doesn't jump when the numbers arrive.
function Block({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Block className="h-7 w-40" />
        <Block className="h-9 w-64" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="p-4 bg-white rounded-xl border border-gray-200 space-y-2"
          >
            <Block className="h-3 w-24" />
            <Block className="h-7 w-20" />
            <Block className="h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <Block className="h-4 w-40" />
        <Block className="h-72 w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <Block className="h-4 w-32" />
          <Block className="h-56 w-full" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <Block className="h-4 w-28" />
          <Block className="h-56 w-full" />
        </div>
      </div>
    </div>
  );
}
