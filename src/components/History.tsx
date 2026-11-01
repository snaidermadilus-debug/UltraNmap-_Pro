import { useState, useEffect } from 'react';

export default function History({ onSelect }: any) {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(d => setHistory(d.data || []));
  }, []);

  const filtered = history.filter((h: any) => 
    (h.target || '').includes(search) && (filter === 'all' || h.status === filter)
  );

  const getDisplayDate = (h: any) => {
    const ref = h.start_time || h.queued_at;
    if (!ref) return 'Data N/A';
    return new Date(ref).toLocaleDateString() + ' ' + new Date(ref).toLocaleTimeString();
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto text-white pb-28">
      <h2 className="text-xl font-bold">Histórico</h2>
      <input className="w-full bg-gray-900 border border-gray-800 p-3 rounded-xl text-sm" placeholder="Pesquisar alvo..." onChange={e => setSearch(e.target.value)} />
      <select className="w-full bg-gray-900 border border-gray-800 p-3 rounded-xl text-sm" onChange={e => setFilter(e.target.value)}>
        <option value="all">Todos</option>
        <option value="completed">Concluídos</option>
        <option value="running">Executando</option>
        <option value="failed">Falhos</option>
        <option value="cancelled">Cancelados</option>
      </select>
      <div className="grid gap-3">
        {filtered.map((h: any) => (
          <div key={h.id} className="bg-gray-900 hover:bg-gray-850 border border-gray-800 p-4 rounded-2xl cursor-pointer space-y-1" onClick={() => onSelect(h.id)}>
            <p className="font-bold text-base text-white">{h.target}</p>
            <p className="text-xs text-gray-400 font-mono">{h.status.toUpperCase()} • {getDisplayDate(h)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
