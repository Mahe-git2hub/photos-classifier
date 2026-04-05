import { useState, useEffect } from 'react';
import { startScan, getScanStatus, getAnnotationStats } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import type { AnnotationStats } from '../types';

export default function SettingsPage() {
  const [directory, setDirectory] = useState('');
  const [scanning, setScanning] = useState(false);
  const [stats, setStats] = useState<AnnotationStats | null>(null);
  const { status } = useWebSocket();

  useEffect(() => {
    getScanStatus().then((s) => {
      setScanning(s.is_scanning);
    });
    getAnnotationStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (status) {
      setScanning(status.is_scanning);
    }
  }, [status]);

  const handleScan = async () => {
    if (!directory.trim()) return;
    setScanning(true);
    try {
      await startScan(directory.trim());
    } catch (err) {
      console.error(err);
      setScanning(false);
    }
  };

  return (
    <div>
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-10 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
      </div>

      <div className="max-w-2xl mx-auto py-8 px-6 space-y-8">
        {/* Scan section */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Photo Directory</h3>
          <p className="text-sm text-gray-500 mb-4">
            Enter the path to your photos directory. The system will scan for images,
            detect faces, and cluster them automatically.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              placeholder="/home/user/Pictures"
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={scanning}
            />
            <button
              onClick={handleScan}
              disabled={scanning || !directory.trim()}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {scanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>

          {/* Progress */}
          {status && status.is_scanning && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span className="capitalize">{status.phase}</span>
                <span>{Math.round(status.progress * 100)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${status.progress * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{status.message}</p>
            </div>
          )}

          {status && status.phase === 'done' && !status.is_scanning && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">{status.message}</p>
            </div>
          )}

          {status && status.phase === 'error' && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">Error: {status.message}</p>
            </div>
          )}
        </section>

        {/* Stats section */}
        {stats && stats.total_faces > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Statistics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-semibold text-gray-900">{stats.total_faces}</p>
                <p className="text-xs text-gray-400">Total Faces</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-semibold text-green-600">{stats.auto_assigned + stats.confirmed}</p>
                <p className="text-xs text-gray-400">Resolved</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-semibold text-orange-600">{stats.pending}</p>
                <p className="text-xs text-gray-400">Pending Review</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-semibold text-gray-500">{stats.skipped}</p>
                <p className="text-xs text-gray-400">Skipped</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
