import { useEffect, useState } from 'react';
import { Activity, Play, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, StopCircle, Zap } from 'lucide-react';

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
    <span className="font-mono text-blue-400 font-bold">
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
      return `Na fila (${new Date(job.queued_at).toLocaleTimeString()})`;
    }
    return 'Na fila...';
  }
  
  const referenceTime = job.start_time || job.queued_at;
  if (!referenceTime) return 'Horário N/A';
  
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
    <div className="p-4 space-y-6 text-white pb-28 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-blue-500" /> Execuções & Jobs
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-medium tracking-tight">
            Acompanhe o progresso em tempo real das auditorias ativas.
          </p>
        </div>

        <button onClick={fetchJobs} className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-gray-900 p-12 rounded-3xl border border-gray-800 text-center text-gray-500 space-y-3">
          <Zap size={32} className="mx-auto text-gray-800" />
          <p className="text-sm font-medium">Nenhuma auditoria registrada ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job: any) => {
            const isRunning = job.status === 'running';
            const isCompleted = job.status === 'completed';
            const isQueued = job.status === 'queued';
            const isFailed = job.status === 'failed';
            const isCancelled = job.status === 'cancelled';
            const durationStr = formatDuration(job.start_time, job.end_time);

            return (
              <div
                key={job.id}
                onClick={() => onSelect(job.id)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-4 group ${
                  isRunning 
                    ? 'bg-blue-950/20 border-blue-500/30 shadow-lg shadow-blue-900/10' 
                    : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-lg text-white tracking-tight">{job.target}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 uppercase border border-gray-700">
                        {job.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider flex-wrap">
                      <Clock size={10} />
                      {getDisplayTime(job)}

                      {isRunning && (
                         <>
                           <span className="text-gray-700">•</span>
                           <Timer startTime={job.start_time} status={job.status} />
                         </>
                      )}

                      {(isCompleted || isFailed || isCancelled) && durationStr && (
                         <>
                           <span className="text-gray-700">•</span>
                           <span className="font-mono text-gray-400 font-bold">
                             Duração: {durationStr}
                           </span>
                         </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest flex items-center gap-1.5 border transition-all ${
                      isCompleted
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800/50'
                        : isRunning
                        ? 'bg-blue-500 text-white border-blue-400 shadow-md animate-pulse'
                        : isQueued
                        ? 'bg-amber-950 text-amber-300 border-amber-800/50'
                        : 'bg-red-950 text-red-300 border-red-800/50'
                    }`}
                  >
                    {isRunning ? 'EXECUTANDO' : isQueued ? 'NA FILA' : job.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-800/50">
                  <span className="text-[11px] text-blue-400 font-bold group-hover:text-blue-300 transition-colors uppercase tracking-widest flex items-center gap-1">
                    Ver Diagnóstico <Zap size={10} fill="currentColor" />
                  </span>

                  {isRunning && (
                    <button
                      onClick={(e) => handleCancel(job.id, e)}
                      className="bg-red-950/90 hover:bg-red-900 text-red-300 border border-red-800/50 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest flex items-center gap-1.5 transition-colors uppercase"
                    >
                      <StopCircle size={12} /> Cancelar
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
