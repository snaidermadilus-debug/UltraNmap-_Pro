import { useEffect, useState } from 'react';

export default function Executions({ onSelect }: any) {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      const res = await fetch('/api/history');
      const data = await res.json();
      setJobs(data.data);
    };
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const cancelScan = async (id: string) => {
    await fetch(`/api/scans/${id}/cancel`, { method: 'POST' });
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold text-white">Execuções</h2>
      {jobs.map((job: any) => (
        <div key={job.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              job.status === 'completed' ? 'bg-green-900 text-green-300' :
              job.status === 'running' ? 'bg-blue-900 text-blue-300' :
              job.status === 'queued' ? 'bg-yellow-900 text-yellow-300' :
              'bg-red-900 text-red-300'
            }`}>
              {job.status.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">{new Date(job.start_time).toLocaleTimeString()}</span>
          </div>
          <p className="font-bold text-white text-lg">{job.target}</p>
          <p className="text-sm text-gray-400 capitalize">{job.type} • {job.status}</p>
          {job.status === 'completed' && (
            <div className="mt-4 pt-2 border-t border-gray-700 flex justify-between items-center">
                <button onClick={() => onSelect(job.id)} className="text-blue-400 text-sm font-semibold hover:underline">Ver resultado</button>
            </div>
          )}
          {job.status === 'running' && (
            <button onClick={() => cancelScan(job.id)} className="mt-4 bg-red-900 text-red-300 px-3 py-1 rounded text-sm w-full">Cancelar</button>
          )}
        </div>
      ))}
    </div>
  );
}
