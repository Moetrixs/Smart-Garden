import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Send } from 'lucide-react';

interface ApiIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
}

export const ApiIngestModal: React.FC<ApiIngestModalProps> = ({ isOpen, onClose, appUrl }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);

  if (!isOpen) return null;

  const endpoint = `${appUrl}/api/telemetry`;

  const sampleJson = {
    gatewayId: "ESP32-GW-ALPHA",
    gatewayMac: "24:0a:c4:15:40:25",
    wifiSsid: "IoT-Lab-WiFi",
    wifiRssi: -58,
    sensors: {
      airTemp: 29.2,
      airHumidity: 64.5,
      lightLux: 750,
      buttonState: 1
    },
    soilNode: {
      id: "ESP32-SOIL-01",
      mac: "24:6F:28:B1:C0:8A",
      rssi: -66,
      batteryVoltage: 3.92,
      sensors: {
        soilMoisture: 44.0,
        soilTemp: 24.5,
        moistureRaw: 1950
      }
    }
  };

  const curlCommand = `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(sampleJson, null, 2)}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendTestPacket = async () => {
    setTesting(true);
    setTestResponse(null);
    try {
      const res = await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleJson),
      });
      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResponse(`Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">
              Dokumentasi REST API Ingestion Sensor
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <p className="text-slate-300 leading-relaxed">
            ESP32 Gateway mengirim data telemetri yang terkumpul (sensor lokal + paket ESP-NOW remote) ke endpoint HTTP berikut:
          </p>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-cyan-300">
            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold">
              POST
            </span>
            <span className="truncate">{endpoint}</span>
          </div>

          <div>
            <div className="flex items-center justify-between text-slate-400 mb-1.5 font-mono">
              <span>Uji dengan cURL / Terminal:</span>
              <button
                onClick={copyCurl}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin cURL'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
              {curlCommand}
            </pre>
          </div>

          {/* Test Live Button */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={sendTestPacket}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testing ? 'Mengirim...' : 'Kirim Paket Tes Sekarang (Live Trigger)'}</span>
            </button>

            {testResponse && (
              <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400">
                <div className="text-slate-500 mb-1">Respon Server:</div>
                <pre>{testResponse}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
