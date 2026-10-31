import { useState } from 'react';

export default function Scanner({ setActiveTab }: any) {
  const [target, setTarget] = useState('127.0.0.1');
  const [scanType, setScanType] = useState('fast');

  const startScan = async () => {
    await fetch('/api/scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, type: scanType })
    });
    setActiveTab('executions');
  };

  const scanOptions = [
    { id: 'fast', name: 'Scan Rápido', desc: 'Descoberta rápida de portas e serviços.', intensity: 'Baixa' },
    { id: 'common', name: 'Portas Comuns', desc: 'Analisa as 100 portas mais utilizadas.', intensity: 'Média' },
    { id: 'all', name: 'Todas as Portas', desc: 'Scan completo TCP. Pode ser demorado.', intensity: 'Alta' },
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Scanner</h2>
      {scanOptions.map(opt => (
        <div key={opt.id} onClick={() => setScanType(opt.id)} className={`p-4 rounded border ${scanType === opt.id ? 'border-blue-500 bg-gray-800' : 'border-gray-700 bg-gray-900'}`}>
          <h3 className="font-bold">{opt.name}</h3>
          <p className="text-sm text-gray-400">{opt.desc}</p>
          <p className="text-xs text-gray-500 mt-2">Intensidade: {opt.intensity}</p>
        </div>
      ))}
      <input className="w-full bg-gray-800 p-3 rounded" value={target} onChange={e => setTarget(e.target.value)} placeholder="Alvo (IP ou Host)" />
      <button className="w-full bg-blue-600 p-3 rounded font-bold" onClick={startScan}>Configurar e Iniciar</button>
    </div>
  );
}
