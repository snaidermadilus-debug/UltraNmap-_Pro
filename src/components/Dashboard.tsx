import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(d => {
      const jobs = d.data;
      setStats({
        total: jobs.length,
        running: jobs.filter((j: any) => j.status === 'running').length,
        completed: jobs.filter((j: any) => j.status === 'completed').length,
        failed: jobs.filter((j: any) => j.status === 'failed').length,
        cancelled: jobs.filter((j: any) => j.status === 'cancelled').length,
      });
    });
  }, []);

  if (!stats) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
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
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-400">Nmap: <span className="text-green-400 font-semibold">Disponível</span></p>
          <p className="text-sm text-gray-400">Servidor: <span className="text-green-400 font-semibold">Online</span></p>
      </div>
    </div>
  );
}
