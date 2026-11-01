import { useEffect, useState } from 'react';
import { Activity, StopCircle, ChevronRight, RefreshCw } from 'lucide-react';

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
    <div className="p-4 space-y-3 text-zinc-100 pb-28 max-w-2xl mx-auto font-mono">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h2 className="text-base font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
          <Activity size={16} /> JOBS
        </h2>

        <button onClick={fetchJobs} className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center text-zinc-600 text-xs">
          SEM JOBS EM MEMÓRIA
        </div>
      ) : (
        <div className="grid gap-1.5 text-xs">
          {jobs.map((job: any) => {
            const isRunning = job.status === 'running';
            const isCompleted = job.status === 'completed';
            const isQueued = job.status === 'queued';
            const durationStr = formatDuration(job.start_time, job.end_time);

            return (
              <div
                key={job.id}
                onClick={() => onSelect(job.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isRunning 
                    ? 'bg-zinc-950 border-emerald-500/50' 
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isRunning ? 'bg-emerald-400 animate-pulse' : isCompleted ? 'bg-emerald-500' : isQueued ? 'bg-amber-400' : 'bg-rose-500'}`} />
                    <span className="font-bold text-white truncate">{job.target}</span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">{job.type}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span className="uppercase">{job.status}</span>
                    {isRunning && (
                      <Timer startTime={job.start_time} status={job.status} />
                    )}
                    {durationStr && !isRunning && (
                      <span>({durationStr})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isRunning && (
                    <button
                      onClick={(e) => handleCancel(job.id, e)}
                      title="Cancelar"
                      className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-bold"
                    >
                      <StopCircle size={14} />
                    </button>
                  )}
                  <ChevronRight size={14} className="text-zinc-600" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
