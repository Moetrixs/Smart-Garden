import React, { useState } from 'react';
import { Download, Search, AlertTriangle, Radio, Activity, Info } from 'lucide-react';
import type { ActivityLog } from '../types/telemetry';
import { formatDateTime } from '../utils/formatters';

interface ActivityLogsViewProps {
  logs: ActivityLog[];
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ logs }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'all' && log.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.node.toLowerCase().includes(q) ||
        log.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['Timestamp', 'Tipe', 'Node', 'Pesan Log'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.type}"`,
      `"${l.node}"`,
      `"${l.message.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `esp32_iot_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `esp32_iot_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Log Aktivitas & Riwayat Transmisi
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit trail event hardware, tombol push button, dan transmisi paket ESP-NOW
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor JSON</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Interactive Segmented Filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterType === 'all' ? 'bg-slate-800 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({logs.length})
          </button>
          <button
            onClick={() => setFilterType('button')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterType === 'button' ? 'bg-slate-800 text-amber-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tombol Push Button
          </button>
          <button
            onClick={() => setFilterType('espnow')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterType === 'espnow' ? 'bg-slate-800 text-emerald-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ESP-NOW Paket
          </button>
          <button
            onClick={() => setFilterType('alert')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterType === 'alert' ? 'bg-slate-800 text-rose-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Peringatan
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari pesan atau kata kunci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Table of logs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="py-2.5 px-4 font-medium">TIMESTAMP</th>
                <th className="py-2.5 px-4 font-medium">SUMBER NODE</th>
                <th className="py-2.5 px-4 font-medium">KATEGORI</th>
                <th className="py-2.5 px-4 font-medium">DETAIL PESAN EVENT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Tidak ada log aktivitas yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap tabular-nums">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 font-sans font-medium whitespace-nowrap">
                        {log.node}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 font-sans">
                          {log.type === 'button' && (
                            <>
                              <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-amber-400 font-medium">Push Button</span>
                            </>
                          )}
                          {log.type === 'espnow' && (
                            <>
                              <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-emerald-400 font-medium">ESP-NOW Sync</span>
                            </>
                          )}
                          {log.type === 'alert' && (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span className="text-rose-400 font-medium">Peringatan</span>
                            </>
                          )}
                          {log.type === 'info' && (
                            <>
                              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="text-cyan-400 font-medium">Info Sistem</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-200 font-sans">
                        {log.message}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
