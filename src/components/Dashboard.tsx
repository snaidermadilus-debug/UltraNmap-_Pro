import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
        const [historyRes, envRes] = await Promise.all([
            fetch('/api/history'),
            fetch('/api/system/environment')
        ]);
        const historyData = await historyRes.json();
        const envData = await envRes.json();
        
        const jobs = historyData.data;
        setStats({
          total: jobs.length,
          running: jobs.filter((j: any) => j.status === 'running').length,
          completed: jobs.filter((j: any) => j.status === 'completed').length,
          failed: jobs.filter((j: any) => j.status === 'failed').length,
          cancelled: jobs.filter((j: any) => j.status === 'cancelled').length,
          ...envData.data,
          isLocal: envData.data.executionMode === 'local' && envData.data.hostname === 'localhost'
        });
    };
    fetchData();
  }, []);

  if (!stats) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      
      {/* Ambiente Card */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Ambiente do Scanner</h2>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-3 h-3 rounded-full ${stats.isLocal ? 'bg-green-500' : 'bg-orange-500'}`}></span>
            <span className="font-bold text-white">{stats.isLocal ? 'Scanner Local' : 'Scanner Remoto'}</span>
          </div>
          <p className="text-xs text-gray-400">Hostname: {stats.hostname}</p>
          <p className="text-xs text-gray-400">Nmap: {stats.nmapInstalled ? `Instalado (${stats.nmapVersion})` : 'Não instalado'}</p>
          {!stats.isLocal && (
              <p className="text-xs text-orange-400 mt-2 font-semibold">Este servidor não está na mesma rede local do seu dispositivo.</p>
          )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[ { title: 'Totais', val: stats.total, color: 'text-white' }, 
           { title: 'Executando', val: stats.running, color: 'text-blue-400' }, 
           { title: 'Concluídas', val: stats.completed, color: 'text-green-400' }, 
           { title: 'Falhas', val: stats.failed, color: 'text-red-400' } ].map(s => (
          <div key={s.title} className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg text-center">
            <p className="text-xs uppercase text-gray-500 font-semibold">{s.title}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
