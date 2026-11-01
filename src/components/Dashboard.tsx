import { useEffect, useState } from 'react';
import { Home, Search, Activity, Wifi, Shield, CheckCircle2, AlertTriangle, Terminal, Cpu } from 'lucide-react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onSelectJob: (id: string) => void;
}

export default function Dashboard({ setActiveTab, onSelectJob }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [historyRes, envRes] = await Promise.all([
          fetch('/api/history'),
          fetch('/api/system/environment'),
        ]);
        const historyJson = await historyRes.json();
        const envJson = await envRes.json();

        const jobs = historyJson.data || [];
        const env = envJson.data || {};

        let totalOpenPorts = 0;
        let totalWebServers = 0;

        jobs.forEach((j: any) => {
          if (j.parsedData && Array.isArray(j.parsedData)) {
            j.parsedData.forEach((h: any) => {
              if (h.ports && Array.isArray(h.ports)) {
                totalOpenPorts += h.ports.filter((p: any) => p.state === 'open').length;
              }
            });
          }
          if (j.webResults && Array.isArray(j.webResults)) {
            totalWebServers += j.webResults.length;
          }
        });

        setData({
          total: jobs.length,
          running: jobs.filter((j: any) => j.status === 'running').length,
          completed: jobs.filter((j: any) => j.status === 'completed').length,
          failed: jobs.filter((j: any) => j.status === 'failed').length,
          cancelled: jobs.filter((j: any) => j.status === 'cancelled').length,
          totalOpenPorts,
          totalWebServers,
          env,
          recentJobs: jobs.slice(0, 5),
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading || !data) {
    return <div className="p-6 text-gray-400 text-center text-sm">Carregando painel de diagnóstico...</div>;
  }

  const { env } = data;

  return (
    <div className="p-4 space-y-6 text-white pb-28 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Home className="text-blue-500" /> Ultra Nmap Pro
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Painel principal de diagnóstico, status do scanner e resumo de rede.
          </p>
        </div>
      </div>

      {/* System & Scanner Environment Card */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 p-5 rounded-xl border border-gray-800 shadow-xl space-y-3">
        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <Terminal size={14} /> Ambiente de Execução
          </span>
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${env.nmapInstalled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
            NMAP: {env.nmapInstalled ? 'INSTALADO' : 'NÃO ENCONTRADO'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-gray-950 p-2.5 rounded border border-gray-800">
            <span className="text-gray-500 block">Hostname</span>
            <span className="font-mono font-bold text-gray-200">{env.hostname || 'Local'}</span>
          </div>
          <div className="bg-gray-950 p-2.5 rounded border border-gray-800">
            <span className="text-gray-500 block">Nmap Versão</span>
            <span className="font-mono font-bold text-blue-300 truncate block">{env.nmapVersion || 'Indeterminado'}</span>
          </div>
          <div className="bg-gray-950 p-2.5 rounded border border-gray-800">
            <span className="text-gray-500 block">IP Local</span>
            <span className="font-mono font-bold text-emerald-400">{env.localNetwork?.ip || '127.0.0.1'}</span>
          </div>
          <div className="bg-gray-950 p-2.5 rounded border border-gray-800">
            <span className="text-gray-500 block">Sub-Rede CIDR</span>
            <span className="font-mono font-bold text-purple-300">{env.localNetwork?.cidr || '127.0.0.1/32'}</span>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total Auditorias</span>
          <span className="text-2xl font-bold font-mono text-white">{data.total}</span>
        </div>

        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Execuções Concluídas</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">{data.completed}</span>
        </div>

        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Portas Abertas</span>
          <span className="text-2xl font-bold font-mono text-blue-400">{data.totalOpenPorts}</span>
        </div>

        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Servidores Web</span>
          <span className="text-2xl font-bold font-mono text-purple-400">{data.totalWebServers}</span>
        </div>
      </div>

      {/* Quick Launch Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab('scanner')}
          className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40 transition-all border border-blue-400/30"
        >
          <Search size={16} /> INICIAR NOVA AUDITORIA NMAP
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className="p-4 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 transition-all border border-purple-400/30"
        >
          <Wifi size={16} /> VARRER REDE LOCAL ({env.localNetwork?.cidr || 'CIDR'})
        </button>
      </div>

      {/* Recent Audits List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Últimas Auditorias</h3>
          <button onClick={() => setActiveTab('executions')} className="text-xs text-blue-400 font-semibold hover:underline">
            Ver todas →
          </button>
        </div>

        {data.recentJobs.length === 0 ? (
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 text-center text-gray-400 text-xs">
            Nenhuma auditoria executada recentemente.
          </div>
        ) : (
          <div className="grid gap-2">
            {data.recentJobs.map((job: any) => (
              <div
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                className="bg-gray-900 hover:bg-gray-850 p-3.5 rounded-xl border border-gray-800 flex justify-between items-center cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">{job.target}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300 uppercase">
                      {job.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(job.start_time).toLocaleString()}
                  </span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                    job.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : job.status === 'running'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {job.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
