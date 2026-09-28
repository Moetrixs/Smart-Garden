import React from 'react';
import { Volume2, VolumeX, Sparkles, SlidersHorizontal, LayoutDashboard, Lock } from 'lucide-react';
import { soundEffects } from '../utils/audioAlert';

interface TopBarProps {
  activeTab: 'dashboard' | 'irrigation';
  setActiveTab: (tab: 'dashboard' | 'irrigation') => void;
  isStreaming: boolean;
  simulationActive: boolean;
  onToggleSimulation: () => void;
  isIrrigationUnlocked?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  isStreaming: _isStreaming,
  simulationActive,
  onToggleSimulation,
  isIrrigationUnlocked = false,
}) => {
  const [soundOn, setSoundOn] = React.useState(true);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundEffects.enabled = next;
    if (next) soundEffects.playButtonChime();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
      {/* Zone 1: Brand title */}
      <div className="flex items-center gap-2.5">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
          className="text-sm sm:text-base font-bold tracking-tight text-white hover:text-emerald-400 transition-colors flex items-center gap-2.5 shrink-0"
        >
          <img
            src="/src/assets/images/smart_garden_logo_1790632945274.jpg"
            alt="Smart Garden Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-md shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span>Smart Garden</span>
        </a>
      </div>

      {/* Zone 2: STRICTLY 2 CLEAN TABS (Optimized for Mobile & Desktop) */}
      <nav className="flex items-center p-0.5 sm:p-1 bg-slate-900 border border-slate-800 rounded-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dashboard Real-time</span>
          <span className="sm:hidden">Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab('irrigation')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'irrigation'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isIrrigationUnlocked ? (
            <SlidersHorizontal className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="hidden sm:inline">Pengaturan Penyiraman</span>
          <span className="sm:hidden">Penyiraman</span>
        </button>
      </nav>

      {/* Zone 3: Actions (Sound & Simulation) */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleSound}
          title={soundOn ? 'Matikan suara' : 'Nyalakan suara'}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-md border border-slate-800 transition-colors"
        >
          {soundOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        <button
          onClick={onToggleSimulation}
          title="Toggle mode simulasi / hardware asli"
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            simulationActive
              ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300 hover:bg-cyan-900/60'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">{simulationActive ? 'Simulasi' : 'Hardware'}</span>
        </button>
      </div>
    </header>
  );
};
