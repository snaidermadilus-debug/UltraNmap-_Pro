import { Home, Search, Wifi, Activity, History as HistoryIcon, FileText } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { name: 'Painel', icon: Home, id: 'dashboard' },
    { name: 'Scanner', icon: Search, id: 'scanner' },
    { name: 'Minha Rede', icon: Wifi, id: 'network' },
    { name: 'Execuções', icon: Activity, id: 'executions' },
    { name: 'Histórico', icon: HistoryIcon, id: 'history' },
    { name: 'Logs', icon: FileText, id: 'logs' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur border-t border-gray-800 p-2 max-w-4xl mx-auto flex justify-around shadow-2xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center py-1 px-2 rounded-lg transition-all ${
              isActive ? 'text-blue-400 bg-blue-950/60 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon size={18} />
            <span className="text-[10px] mt-0.5">{tab.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
