import { Home, Search, Wifi, Activity, History as HistoryIcon } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { label: 'HOME', icon: Home, id: 'dashboard' },
    { label: 'SCAN', icon: Search, id: 'scanner' },
    { label: 'NET', icon: Wifi, id: 'network' },
    { label: 'JOBS', icon: Activity, id: 'executions' },
    { label: 'HIST', icon: HistoryIcon, id: 'history' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-zinc-800/80 p-1.5 max-w-2xl mx-auto flex justify-around shadow-2xl backdrop-blur-md">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
              isActive 
                ? 'text-black bg-emerald-400 font-mono font-black shadow-md shadow-emerald-500/30 scale-105' 
                : 'text-zinc-500 hover:text-zinc-300 font-mono'
            }`}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[9px] mt-0.5 tracking-wider uppercase font-mono">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
