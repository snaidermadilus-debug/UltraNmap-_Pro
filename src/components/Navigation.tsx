import { Home, Search, Wifi, Activity, History as HistoryIcon, FileText } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { name: 'Painel', icon: Home, id: 'dashboard' },
    { name: 'Scanner', icon: Search, id: 'scanner' },
    { name: 'Rede', icon: Wifi, id: 'network' },
    { name: 'Execuções', icon: Activity, id: 'executions' },
    { name: 'Histórico', icon: HistoryIcon, id: 'history' },
    { name: 'Logs', icon: FileText, id: 'logs' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-t border-zinc-800 p-1.5 max-w-4xl mx-auto flex justify-around shadow-2xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
              isActive 
                ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 shadow-sm shadow-emerald-950/50 font-bold' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon size={18} />
            <span className="text-[9px] font-mono mt-0.5 tracking-wider uppercase">{tab.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
