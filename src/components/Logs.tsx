import { useState, useEffect } from 'react';

export default function Logs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch('/api/logs').then(r => r.json()).then(d => setLogs(d.data));
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Logs do Sistema</h2>
      <div className="bg-gray-800 p-4 rounded text-xs font-mono">
        {logs.map((l: any, i) => <p key={i}>{l}</p>)}
      </div>
    </div>
  );
}
