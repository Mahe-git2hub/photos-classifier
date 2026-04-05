import { useWebSocket } from '../hooks/useWebSocket';

export default function ScanProgress() {
  const { status } = useWebSocket();

  if (!status || !status.is_scanning) return null;

  const percent = Math.round(status.progress * 100);

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-80 z-40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 capitalize">{status.phase}</span>
        <span className="text-sm text-gray-400">{percent}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 truncate">{status.message}</p>
    </div>
  );
}
