import { useState, useEffect } from 'react';

export default function History({ onSelect }: any) {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(d => setHistory(d.data));
  }, []);

  const filtered = history.filter((h: any) => 
    h.target.includes(search) && (filter === 'all' || h.status === filter)
  );

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Histórico</h2>
      <input className="w-full bg-gray-800 p-2 rounded" placeholder="Pesquisar alvo..." onChange={e => setSearch(e.target.value)} />
      <select className="w-full bg-gray-800 p-2 rounded" onChange={e => setFilter(e.target.value)}>
        <option value="all">Todos</option>
        <option value="completed">Concluídos</option>
        <option value="running">Executando</option>
        <option value="failed">Falhos</option>
      </select>
      {filtered.map((h: any) => (
        <div key={h.id} className="bg-gray-800 p-4 rounded cursor-pointer" onClick={() => onSelect(h.id)}>
          <p className="font-bold">{h.target}</p>
          <p className="text-sm text-gray-400">{h.status} • {new Date(h.start_time).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
