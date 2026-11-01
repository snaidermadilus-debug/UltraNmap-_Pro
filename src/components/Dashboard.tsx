import { useEffect, useState } from 'react';
import { Zap, Wifi, ChevronRight, Activity } from 'lucide-react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onSelectJob: (id: string) => void;
}

export default function Dashboard({ setActiveTab, onSelectJob }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSysModal, setShowSysModal] = useState(false);

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
      <div className="p-8 text-center text-emerald-400 font-mono text-xs space-y-2">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>[ CARREGANDO TERMINAL ]</p>
      </div>
    );
  }

  const { env, statusData } = data;
  const net = env.localNetwork || {};
  const hasDetectedCidr = net.cidr && net.cidr !== 'não detectado' && net.cidr !== '127.0.0.1/32';

  return (
    <div className="p-4 space-y-4 text-zinc-100 pb-28 max-w-2xl mx-auto font-mono">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-base font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
            ULTRA NMAP
          </h1>
        </div>

        <button 
          onClick={() => setShowSysModal(!showSysModal)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-emerald-500/40 text-[10px] font-bold text-emerald-400 hover:bg-zinc-900 transition-colors"
        >
          <span className={`w-2 h-2 rounded-full ${statusData.nmap === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          ● ONLINE
        </button>
      </div>

      {/* System Modal */}
      {showSysModal && (
        <div className="p-3 bg-zinc-950 rounded-xl border border-emerald-500/40 space-y-2 text-[10px] text-zinc-300 shadow-2xl">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-1 font-bold text-emerald-400">
            <span>[ SYSTEM SPECS ]</span>
            <button onClick={() => setShowSysModal(false)} className="text-zinc-500 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>NMAP: <span className="text-white">{env.nmapVersion || 'N/A'}</span></div>
            <div>LOCAL IP: <span className="text-emerald-400">{net.ip || 'NÃO DETECTADO'}</span></div>
            <div>INTERFACE: <span className="text-white">{net.interface || 'N/A'}</span></div>
            <div>CIDR: <span className="text-cyan-300">{hasDetectedCidr ? net.cidr : 'NÃO DETECTADO'}</span></div>
          </div>
        </div>
      )}

      {/* Big Metrics Grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
          <span className="text-[9px] font-bold text-zinc-500 block uppercase">SCANS</span>
          <span className="text-xl font-black text-zinc-100">{data.total}</span>
        </div>

        <div className="bg-zinc-950 p-3 rounded-xl border border-blue-500/30">
          <span className="text-[9px] font-bold text-blue-400 block uppercase">RUNNING</span>
          <span className={`text-xl font-black ${data.running > 0 ? 'text-blue-400 animate-pulse' : 'text-zinc-500'}`}>
            {data.running}
          </span>
        </div>

        <div className="bg-zinc-950 p-3 rounded-xl border border-emerald-500/30">
          <span className="text-[9px] font-bold text-emerald-400 block uppercase">OPEN</span>
          <span className="text-xl font-black text-emerald-400">{data.totalOpenPorts}</span>
        </div>

        <div className="bg-zinc-950 p-3 rounded-xl border border-purple-500/30">
          <span className="text-[9px] font-bold text-purple-400 block uppercase">WEB</span>
          <span className="text-xl font-black text-purple-300">{data.totalWebServers}</span>
        </div>
      </div>

      {/* Big Action Buttons */}
      <div className="grid grid-cols-2 gap-2 text-xs font-bold font-mono">
        <button
          onClick={() => setActiveTab('scanner')}
          className="p-3.5 bg-emerald-400 hover:bg-emerald-300 text-black rounded-xl font-black flex items-center justify-center gap-1.5 shadow-lg active:scale-95 uppercase tracking-wider transition-all"
        >
          <Zap size={16} fill="currentColor" /> ▶ NOVO SCAN
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className="p-3.5 bg-zinc-950 hover:bg-zinc-900 text-cyan-400 rounded-xl border border-cyan-500/40 font-black flex items-center justify-between px-3 active:scale-95 uppercase tracking-wider transition-all"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Wifi size={16} className="shrink-0" />
            <div className="text-left min-w-0">
              <span className="block text-[10px] text-cyan-400 truncate">◉ MINHA REDE</span>
              <span className="block text-[9px] text-zinc-400 truncate font-normal">
                {hasDetectedCidr ? net.cidr : 'REDE NÃO DETECTADA'}
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-cyan-400" />
        </button>
      </div>

      {/* Recentes List */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
          <span>RECENTES</span>
          <button onClick={() => setActiveTab('history')} className="text-emerald-400 hover:underline text-[10px]">
            VER TODOS →
          </button>
        </div>

        {data.recentJobs.length === 0 ? (
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center text-zinc-600 text-xs">
            Nenhum scan registrado.
          </div>
        ) : (
          <div className="grid gap-1.5">
            {data.recentJobs.map((job: any) => {
              const isCompleted = job.status === 'completed';
              const isRunning = job.status === 'running';

              return (
                <div
                  key={job.id}
                  onClick={() => onSelectJob(job.id)}
                  className="bg-zinc-950 hover:bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 flex justify-between items-center cursor-pointer transition-colors text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isCompleted ? 'bg-emerald-400' : isRunning ? 'bg-blue-400 animate-pulse' : 'bg-rose-500'}`} />
                    <span className="font-bold text-zinc-200 truncate">{job.target}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">
                      {job.type} {isCompleted ? '✓' : ''}
                    </span>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
