import { useEffect, useState } from 'react';

export default function ScanDetails({ id }: any) {
  const [job, setJob] = useState<any>(null);
  const [showTech, setShowTech] = useState(false);

  useEffect(() => {
    fetch(`/api/scans/${id}`).then(r => r.json()).then(d => setJob(d.data));
  }, [id]);

  if (!job) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Resumo: {job.target}</h2>
      <div className="grid grid-cols-2 gap-2 text-sm bg-gray-800 p-4 rounded">
        <p>Status: {job.status}</p>
        <p>Duração: {job.end_time ? 'Concluído' : 'Em curso'}</p>
      </div>

      {job.parsedData && (
        <div className="space-y-2">
          {job.parsedData.map((host: any, i: number) => host.ports.map((p: any, j: number) => (
            <div key={`${i}-${j}`} className="bg-gray-800 p-4 rounded border-l-4 border-green-500">
              <p className="font-bold">Porta {p.port} / {p.service}</p>
              <p className="text-sm">Estado: {p.state}</p>
              <p className="text-xs text-gray-400">Versão: {p.version !== 'unknown' ? p.version : 'Não determinada'}</p>
            </div>
          )))}
        </div>
      )}

      <button onClick={() => setShowTech(!showTech)} className="w-full text-center text-blue-400 text-sm p-2 bg-gray-900 rounded">
        {showTech ? 'Esconder saída técnica' : 'Mostrar saída técnica'}
      </button>
      {showTech && <pre className="bg-black p-4 rounded text-xs overflow-x-auto">{job.stdout}</pre>}
    </div>
  );
}
