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
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        {[ { title: 'Totais', val: stats.total }, { title: 'Executando', val: stats.running }, 
           { title: 'Concluídas', val: stats.completed }, { title: 'Falhas', val: stats.failed }, 
           { title: 'Canceladas', val: stats.cancelled } ].map(s => (
          <div key={s.title} className="bg-gray-800 p-4 rounded text-center">
            <p className="text-sm text-gray-400">{s.title}</p>
            <p className="text-2xl font-bold">{s.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
