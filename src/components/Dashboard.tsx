import { useEffect, useState } from 'react';
import { Search, Wifi, Terminal, Activity, Shield, Cpu, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
        const [historyRes, envRes, statusRes] = await Promise.all([
          fetch('/api/history'),
          fetch('/api/system/environment'),
          fetch('/api/status'),
        ]);
        const historyJson = await historyRes.json();
        const envJson = await envRes.json();
        const statusJson = await statusRes.json();

        const jobs = historyJson.data || [];
        const env = envJson.data || {};
        const statusData = statusJson.data || {};

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
          statusData,
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
    return (
      <div className="p-8 text-center text-emerald-500 font-mono text-xs tracking-wider space-y-3">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>[ INITIALIZING TERMINAL DASHBOARD... ]</p>
      </div>
    );
  }

  const { env, statusData } = data;
  const net = env.localNetwork || {};

  return (
    <div className="p-4 space-y-5 text-zinc-100 pb-28 max-w-4xl mx-auto font-sans">
      {/* Top Banner */}
      <div className="flex flex-col gap-1 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
            <h1 className="text-xl font-black tracking-widest font-mono text-emerald-400 uppercase">
              ULTRA NMAP // NETWORK AUDITOR
            </h1>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
            v2.0 TERMINAL
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 font-mono tracking-wide">
          [ SYSTEM MONITOR // REAL-TIME NETWORK AUDIT PLATFORM ]
        </p>
      </div>

      {/* System & Nmap Status Terminal Card */}
      <div className="bg-zinc-950/80 p-4 rounded-2xl border border-emerald-500/20 shadow-xl shadow-emerald-950/10 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2.5">
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
            <Terminal size={14} /> [ ENVIRONMENT DIAGNOSTICS ]
          </span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusData.nmap === 'online' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-rose-950 text-rose-400 border-rose-800'}`}>
              NMAP: {statusData.nmap ? statusData.nmap.toUpperCase() : 'OFFLINE'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
              SERVER: ONLINE
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px] font-mono">
          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 text-[9px] uppercase block mb-0.5">Versão Nmap</span>
            <span className="font-bold text-cyan-300 truncate block">{env.nmapVersion || 'N/A'}</span>
          </div>
          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 text-[9px] uppercase block mb-0.5">IP Local</span>
            <span className="font-bold text-emerald-400 truncate block">{net.ip || 'não detectado'}</span>
          </div>
          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 text-[9px] uppercase block mb-0.5">Interface</span>
            <span className="font-bold text-zinc-300 truncate block">{net.interface || 'não detectado'}</span>
          </div>
          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 text-[9px] uppercase block mb-0.5">CIDR</span>
            <span className="font-bold text-purple-300 truncate block">{net.cidr || 'não detectado'}</span>
          </div>
          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 text-[9px] uppercase block mb-0.5">Gateway</span>
            <span className="font-bold text-amber-300 truncate block">{net.gateway || 'não detectado'}</span>
          </div>
          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-500 text-[9px] uppercase block mb-0.5">Máscara</span>
            <span className="font-bold text-zinc-400 truncate block">{net.netmask || 'não detectado'}</span>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 font-mono">
        <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 text-center space-y-0.5">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Auditorias</span>
          <span className="text-2xl font-bold text-zinc-100">{data.total}</span>
        </div>

        <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-blue-500/30 text-center space-y-0.5">
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider block">Em Execução</span>
          <span className={`text-2xl font-bold ${data.running > 0 ? 'text-blue-400 animate-pulse' : 'text-zinc-400'}`}>
            {data.running}
          </span>
        </div>

        <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-emerald-500/30 text-center space-y-0.5">
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Portas Abertas</span>
          <span className="text-2xl font-bold text-emerald-400">{data.totalOpenPorts}</span>
        </div>

        <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-purple-500/30 text-center space-y-0.5">
          <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider block">Servidores Web</span>
          <span className="text-2xl font-bold text-purple-300">{data.totalWebServers}</span>
        </div>

        <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-rose-500/30 text-center space-y-0.5 col-span-2 sm:col-span-1">
          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">Falhas</span>
          <span className="text-2xl font-bold text-rose-400">{data.failed}</span>
        </div>
      </div>

      {/* Quick Launch Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab('scanner')}
          className="p-3.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-2xl font-mono font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500/40 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
        >
          <Search size={16} /> [ INICIAR NOVA AUDITORIA ]
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className="p-3.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 rounded-2xl font-mono font-bold text-xs flex items-center justify-center gap-2 border border-cyan-500/40 shadow-lg shadow-cyan-950/40 transition-all active:scale-95"
        >
          <Wifi size={16} /> [ VARRER REDE LOCAL ]
        </button>
      </div>

      {/* Recent Audits List */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <Activity size={14} className="text-emerald-400" /> [ AUDITORIAS RECENTES ]
          </h3>
          <button onClick={() => setActiveTab('executions')} className="text-[11px] font-mono text-emerald-400 font-bold hover:underline">
            VER TODAS →
          </button>
        </div>

        {data.recentJobs.length === 0 ? (
          <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 text-center text-zinc-500 font-mono text-xs">
            NENHUMA AUDITORIA REGISTRADA.
          </div>
        ) : (
          <div className="grid gap-2 font-mono">
            {data.recentJobs.map((job: any) => (
              <div
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                className="bg-zinc-900/80 hover:bg-zinc-850 p-3.5 rounded-2xl border border-zinc-800 flex justify-between items-center cursor-pointer transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-100">{job.target}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase border border-zinc-700">
                      {job.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    {job.start_time ? new Date(job.start_time).toLocaleString() : job.queued_at ? `Fila: ${new Date(job.queued_at).toLocaleString()}` : 'N/A'}
                  </span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-[9px] font-bold border ${
                    job.status === 'completed'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : job.status === 'running'
                      ? 'bg-blue-950/80 text-blue-300 border-blue-800 animate-pulse'
                      : job.status === 'queued'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-rose-950/80 text-rose-300 border-rose-800'
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
