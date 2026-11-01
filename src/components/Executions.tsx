import { useEffect, useState } from 'react';
import { Activity, Play, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, StopCircle } from 'lucide-react';

interface ExecutionsProps {
  onSelect: (id: string) => void;
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
          <p className="text-xs text-gray-400 mt-1">
            Acompanhe o progresso e estado em tempo real das auditorias ativas e anteriores.
          </p>
        </div>

        <button onClick={fetchJobs} className="p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 text-center text-gray-400 text-sm">
          Nenhuma auditoria foi registrada ainda. Inicie um scan na aba Scanner.
        </div>
      ) : (
        <div className="grid gap-3">
          {jobs.map((job: any) => {
            const isRunning = job.status === 'running';
            const isCompleted = job.status === 'completed';
            const isQueued = job.status === 'queued';
            const isFailed = job.status === 'failed';
            const isCancelled = job.status === 'cancelled';

            return (
              <div
                key={job.id}
                onClick={() => onSelect(job.id)}
                className="bg-gray-900 hover:bg-gray-850 p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-all cursor-pointer space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg text-white">{job.target}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300 uppercase border border-gray-700">
                        {job.type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 block mt-0.5 font-mono">
                      Iniciado às {new Date(job.start_time).toLocaleTimeString()}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                      isCompleted
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : isRunning
                        ? 'bg-blue-950 text-blue-300 border-blue-800 animate-pulse'
                        : isQueued
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-red-950 text-red-300 border-red-800'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 size={13} />}
                    {isRunning && <RefreshCw size={13} className="animate-spin" />}
                    {isQueued && <Clock size={13} />}
                    {(isFailed || isCancelled) && <XCircle size={13} />}
                    {job.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-800/80">
                  <span className="text-xs text-blue-400 font-bold hover:underline">
                    VER DIAGNÓSTICO →
                  </span>

                  {isRunning && (
                    <button
                      onClick={(e) => handleCancel(job.id, e)}
                      className="bg-red-950/90 hover:bg-red-900 text-red-300 border border-red-800 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <StopCircle size={13} /> Cancelar Job
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
