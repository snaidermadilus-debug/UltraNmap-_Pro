import { useEffect, useState } from 'react';

export default function Executions() {
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
      <h2 className="text-xl font-bold">Execuções</h2>
      {jobs.map((job: any) => (
        <div key={job.id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
          <div>
            <p className="font-bold">{job.target}</p>
            <p className="text-sm text-gray-400">{job.type} • {job.status}</p>
          </div>
          {job.status === 'running' && (
            <button onClick={() => cancelScan(job.id)} className="bg-red-600 px-2 py-1 rounded text-xs">Cancelar</button>
          )}
        </div>
      ))}
    </div>
  );
}
