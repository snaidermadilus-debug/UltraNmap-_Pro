import { useEffect, useState } from 'react';
import { Terminal, FileText, ChevronRight, Zap } from 'lucide-react';

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
          completed: jobs.filter((j: any) => j.status === 'completed').length,
          failed: jobs.filter((j: any) => j.status === 'failed').length,
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
        <p>LOADING</p>
      </div>
    );
  }

  const { env, statusData } = data;
  const net = env.localNetwork || {};

  return (
    <div className="p-4 space-y-4 text-zinc-100 pb-28 max-w-2xl mx-auto font-mono">
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-lg font-black text-emerald-400 uppercase tracking-widest">
            ULTRA NMAP
          </h1>
          <span className="text-[10px] text-zinc-500 block font-bold">NETWORK AUDITOR</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSysModal(!showSysModal)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-emerald-400 hover:border-emerald-500/50"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            title="Ver Logs"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <FileText size={14} />
          </button>
        </div>
      </div>

      {/* Small System Status Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px] font-bold">
        <button 
          onClick={() => setShowSysModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 shrink-0"
        >
          NMAP <span className={`w-1.5 h-1.5 rounded-full ${statusData.nmap === 'online' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
        </button>
        <button 
          onClick={() => setShowSysModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 shrink-0"
        >
          SERVER <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </button>
        <button 
          onClick={() => setShowSysModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 shrink-0"
        >
          NET <span className={`w-1.5 h-1.5 rounded-full ${net.ip && net.ip !== 'não detectado' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        </button>
        <button 
          onClick={() => setShowSysModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 shrink-0"
        >
          WIFI <span className={`w-1.5 h-1.5 rounded-full ${net.interface && net.interface !== 'não detectado' ? 'bg-cyan-400' : 'bg-zinc-600'}`} />
        </button>
      </div>

      {/* Modal / Overlay for Detailed Environment System Specs */}
      {showSysModal && (
        <div className="p-3 bg-zinc-950 rounded-xl border border-emerald-500/40 space-y-2 text-[10px] text-zinc-300">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-1 font-bold text-emerald-400">
            <span>[ SYSTEM ENVIRONMENT ]</span>
            <button onClick={() => setShowSysModal(false)} className="text-zinc-500 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>NMAP VER: <span className="text-white">{env.nmapVersion || 'N/A'}</span></div>
            <div>LOCAL IP: <span className="text-emerald-400">{net.ip || 'N/A'}</span></div>
            <div>INTERFACE: <span className="text-white">{net.interface || 'N/A'}</span></div>
            <div>CIDR: <span className="text-cyan-300">{net.cidr || 'N/A'}</span></div>
            <div>GATEWAY: <span className="text-amber-300">{net.gateway || 'N/A'}</span></div>
            <div>NETMASK: <span className="text-zinc-400">{net.netmask || 'N/A'}</span></div>
          </div>
        </div>
      )}

      {/* Compact Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-center">
          <span className="text-[9px] font-bold text-zinc-500 uppercase block">SCANS</span>
          <span className="text-xl font-bold text-zinc-100">{data.total}</span>
        </div>

        <div className="bg-zinc-950 p-3 rounded-xl border border-blue-500/30 text-center">
          <span className="text-[9px] font-bold text-blue-400 uppercase block">RUNNING</span>
          <span className={`text-xl font-bold ${data.running > 0 ? 'text-blue-400 animate-pulse' : 'text-zinc-400'}`}>
            {data.running.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="bg-zinc-950 p-3 rounded-xl border border-emerald-500/30 text-center">
          <span className="text-[9px] font-bold text-emerald-400 uppercase block">OPEN PORTS</span>
          <span className="text-xl font-bold text-emerald-400">{data.totalOpenPorts}</span>
        </div>

        <div className="bg-zinc-950 p-3 rounded-xl border border-purple-500/30 text-center">
          <span className="text-[9px] font-bold text-purple-400 uppercase block">WEB</span>
          <span className="text-xl font-bold text-purple-300">{data.totalWebServers.toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Direct Action Buttons */}
      <div className="grid grid-cols-2 gap-2 font-bold text-xs">
        <button
          onClick={() => setActiveTab('scanner')}
          className="p-3 bg-emerald-400 hover:bg-emerald-300 text-black rounded-xl font-black flex items-center justify-center gap-1.5 shadow-lg active:scale-95 uppercase tracking-wider"
        >
          <Zap size={14} fill="currentColor" /> ▶ NEW SCAN
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className="p-3 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 rounded-xl border border-cyan-500/40 font-black flex items-center justify-center gap-1.5 active:scale-95 uppercase tracking-wider"
        >
          ◉ NET DISCOVERY
        </button>
      </div>

      {/* Recentes List */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
          <span>RECENTES</span>
          <button onClick={() => setActiveTab('history')} className="text-emerald-400 hover:underline text-[10px]">
            VER TODOS →
          </button>
        </div>

        {data.recentJobs.length === 0 ? (
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center text-zinc-600 text-xs">
            Nenhum scan recente.
          </div>
        ) : (
          <div className="grid gap-1.5">
            {data.recentJobs.map((job: any) => (
              <div
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                className="bg-zinc-950 hover:bg-zinc-900 p-2.5 rounded-xl border border-zinc-800/80 flex justify-between items-center cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${job.status === 'completed' ? 'bg-emerald-400' : job.status === 'running' ? 'bg-blue-400 animate-pulse' : 'bg-rose-500'}`} />
                  <span className="font-bold text-xs text-zinc-200">{job.target}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    {job.type} {job.status === 'completed' ? '✓' : ''}
                  </span>
                  <ChevronRight size={14} className="text-zinc-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
