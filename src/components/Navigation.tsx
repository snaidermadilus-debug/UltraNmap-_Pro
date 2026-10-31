import { Home, Search, Activity, History, FileText } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab }: any) {
  const tabs = [
    { name: 'Painel', icon: Home, id: 'dashboard' },
    { name: 'Scanner', icon: Search, id: 'scanner' },
    { name: 'Exec', icon: Activity, id: 'executions' },
    { name: 'Hist', icon: History, id: 'history' },
    { name: 'Logs', icon: FileText, id: 'logs' },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-gray-900 border-t border-gray-800 p-2 flex justify-around">
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center p-1 rounded ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`}>
          <tab.icon size={20} />
          <span className="text-[10px]">{tab.name}</span>
        </button>
      ))}
    </nav>
  );
}
