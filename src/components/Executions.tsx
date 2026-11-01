import { useEffect, useState } from 'react';
import { Activity, Play, CheckCircle2, XCircle, Clock, RefreshCw, StopCircle, Zap, Terminal } from 'lucide-react';

interface ExecutionsProps {
  onSelect: (id: string) => void;
}

function Timer({ startTime, status }: { startTime: string | null, status: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'running' || !startTime) return;
    
    const start = new Date(startTime).getTime();
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, status]);

  if (status !== 'running' || !startTime) return null;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="font-mono text-emerald-400 font-bold">
      {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

function formatDuration(startTime: string | null, endTime: string | null): string | null {
  if (!startTime || !endTime) return null;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getDisplayTime(job: any): string {
  if (job.status === 'queued') {
    if (job.queued_at) {
      return `EM FILA (${new Date(job.queued_at).toLocaleTimeString()})`;
    }
    return 'EM FILA...';
  }
  
  const referenceTime = job.start_time || job.queued_at;
  if (!referenceTime) return 'N/A';
  
  return new Date(referenceTime).toLocaleTimeString();
}

export default function Executions({ onSelect }: ExecutionsProps) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/scans/${id}/cancel`, { method: 'POST' });
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 space-y-5 text-zinc-100 pb-28 max-w-4xl mx-auto font-sans">
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
        <div>
          <h2 className="text-xl font-mono font-black tracking-widest text-emerald-400 uppercase flex items-center gap-2">
            <Activity size={18} /> JOBS // EXECUTIONS
          </h2>
          <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
            [ ACTIVE AND PAST NETWORK AUDIT PROCESSES ]
          </p>
        </div>

        <button onClick={fetchJobs} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-zinc-950/80 p-12 rounded-2xl border border-zinc-800 text-center text-zinc-500 font-mono space-y-2">
          <Terminal size={32} className="mx-auto text-zinc-800" />
          <p className="text-xs">[ NENHUM JOB REGISTRADO EM MEMÓRIA ]</p>
        </div>
      ) : (
        <div className="grid gap-3 font-mono">
          {jobs.map((job: any) => {
            const isRunning = job.status === 'running';
            const isCompleted = job.status === 'completed';
            const isQueued = job.status === 'queued';
            const isFailed = job.status === 'failed';
            const isCancelled = job.status === 'cancelled';
            const durationStr = formatDuration(job.start_time, job.end_time);

            const host = Array.isArray(job.parsedData) && job.parsedData.length > 0 ? job.parsedData[0] : null;
            const openPortsCount = host?.ports?.filter((p: any) => p.state === 'open').length || 0;

            return (
              <div
                key={job.id}
                onClick={() => onSelect(job.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 group ${
                  isRunning 
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/30' 
                    : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-zinc-100 tracking-tight">{job.target}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-emerald-400 uppercase border border-zinc-800">
                        {job.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex-wrap">
                      <Clock size={10} />
                      {getDisplayTime(job)}

                      {isRunning && (
                         <>
                           <span className="text-zinc-700">•</span>
                           <Timer startTime={job.start_time} status={job.status} />
                           <span className="text-zinc-700">•</span>
                           <span className="text-emerald-400 animate-pulse">NMAP PROCESS ACTIVE</span>
                         </>
                      )}

                      {(isCompleted || isFailed || isCancelled) && (
                         <>
                           {durationStr && (
                              <>
                                <span className="text-zinc-700">•</span>
                                <span className="text-zinc-400">DURAÇÃO: {durationStr}</span>
                              </>
                           )}
                           {isCompleted && (
                             <>
                               <span className="text-zinc-700">•</span>
                               <span className="text-emerald-400">{openPortsCount} PORTAS ABERTAS</span>
                             </>
                           )}
                         </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-[9px] font-bold tracking-widest flex items-center gap-1.5 border transition-all ${
                      isCompleted
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : isRunning
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-md animate-pulse'
                        : isQueued
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                        : 'bg-rose-950/80 text-rose-300 border-rose-800'
                    }`}
                  >
                    {isRunning ? '● RUNNING' : isQueued ? '● QUEUED' : isCompleted ? '● COMPLETED' : isFailed ? '● FAILED' : '● CANCELLED'}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-zinc-800/80">
                  <span className="text-[10px] text-emerald-400 font-bold group-hover:text-emerald-300 transition-colors tracking-widest flex items-center gap-1 uppercase">
                    [ DIAGNÓSTICO ] <Zap size={10} fill="currentColor" />
                  </span>

                  {isRunning && (
                    <button
                      onClick={(e) => handleCancel(job.id, e)}
                      className="bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-800 px-3 py-1 rounded-xl text-[9px] font-bold tracking-widest flex items-center gap-1 transition-colors uppercase"
                    >
                      <StopCircle size={11} /> CANCELAR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
