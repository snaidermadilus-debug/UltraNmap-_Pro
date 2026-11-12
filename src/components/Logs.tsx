import { useState, useEffect } from 'react';

export default function Logs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/logs')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.data)) {
          setLogs(d.data);
        } else {
          setError(d?.error || 'Não foi possível carregar os logs.');
        }
      })
      .catch(() => setError('Falha de conexão com o servidor.'));
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Logs do Sistema</h2>
      <div className="bg-gray-800 p-4 rounded text-xs font-mono">
        {error && <p className="text-red-400">{error}</p>}
        {!error && logs.length === 0 && <p className="text-gray-400">Nenhum log disponível.</p>}
        {logs.map((l, i) => <p key={i}>{typeof l === 'string' ? l : JSON.stringify(l)}</p>)}
      </div>
    </div>
  );
}
