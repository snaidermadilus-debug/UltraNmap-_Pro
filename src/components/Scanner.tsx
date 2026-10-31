import { useState } from 'react';

const scanTypes = [
  { cat: 'DESCOBERTA', items: [
    { id: 'discovery', name: 'Descoberta de Host', icon: '⚡', desc: 'Verifica se o host responde.' },
    { id: 'fast', name: 'Scan Rápido', icon: '⚡', desc: 'Verificação rápida das portas.' },
    { id: 'common', name: 'Portas Comuns', icon: '🔎', desc: 'Verifica portas TCP mais usadas.' },
    { id: 'all', name: 'Todas as Portas', icon: '🔥', desc: 'Intervalo TCP completo.' },
  ]},
  { cat: 'SERVIÇOS', items: [
    { id: 'services', name: 'Detecção de Serviços', icon: '🛠️', desc: 'Identifica serviços nas portas.' },
    { id: 'os', name: 'Sistema Operacional', icon: '🖥️', desc: 'Tenta identificar SO.' },
  ]},
  { cat: 'WEB', items: [
    { id: 'web', name: 'Descoberta Web', icon: '🌐', desc: 'Procura serviços HTTP/HTTPS.' },
  ]},
  { cat: 'REDE', items: [
    { id: 'udp', name: 'UDP Comum', icon: '📡', desc: 'Verifica portas UDP comuns.' },
  ]},
];

export default function Scanner({ setActiveTab }: any) {
  const [target, setTarget] = useState('127.0.0.1');
  const [selected, setSelected] = useState('fast');

  const startScan = async () => {
    await fetch('/api/scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, type: selected }),
    });
    setActiveTab('executions');
  };

  return (
    <div className="p-4 space-y-6 text-white pb-24">
      <h2 className="text-2xl font-bold">Scanner</h2>
      
      {scanTypes.map(cat => (
        <div key={cat.cat} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">{cat.cat}</h3>
            <div className="grid grid-cols-2 gap-3">
                {cat.items.map(item => (
                    <button key={item.id} onClick={() => setSelected(item.id)} className={`p-3 rounded-lg border text-left ${selected === item.id ? 'bg-blue-900 border-blue-500' : 'bg-gray-800 border-gray-700'}`}>
                        <div className="text-xl mb-1">{item.icon}</div>
                        <div className="font-bold text-sm">{item.name}</div>
                        <div className="text-[10px] text-gray-400">{item.desc}</div>
                    </button>
                ))}
            </div>
        </div>
      ))}

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-500 uppercase">Alvo</label>
        <input type="text" value={target} onChange={e => setTarget(e.target.value)} placeholder="Ex: 192.168.1.1" className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 font-mono" />
      </div>

      <button onClick={startScan} className="w-full bg-blue-600 p-3 rounded-lg font-bold text-white shadow-lg shadow-blue-900/50">Configurar e iniciar</button>
    </div>
  );
}
