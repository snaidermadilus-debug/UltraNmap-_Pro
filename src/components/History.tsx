import { useState, useEffect } from 'react';
import { History as HistoryIcon, Trash2, Search, ChevronRight } from 'lucide-react';

export default function History({ onSelect }: { onSelect: (id: string) => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) {
        setHistory(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Excluir esta auditoria?')) {
      return;
    }

    try {
      const res = await fetch(`/api/scans/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Apagar histórico?')) {
      return;
    }

    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setHistory([]);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const filtered = history.filter((h: any) => {
    const matchesSearch = (h.target || '').includes(search.trim());
    if (filter === 'all') return matchesSearch;
    if (filter === 'completed') return matchesSearch && h.status === 'completed';
    if (filter === 'failed') return matchesSearch && h.status === 'failed';
    if (filter === 'cancelled') return matchesSearch && h.status === 'cancelled';
    return matchesSearch;
  });

  const getCompactDate = (h: any) => {
    const ref = h.start_time || h.queued_at;
    if (!ref) return 'N/A';
    const d = new Date(ref);
    const day = d.getDate().toString().padStart(2, '0');
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const month = months[d.getMonth()];
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month} ${time}`;
  };

  return (
    <div className="p-4 space-y-3 text-zinc-100 pb-28 max-w-2xl mx-auto font-mono">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h2 className="text-base font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
          <HistoryIcon size={16} /> HISTÓRICO
        </h2>

        <button
          onClick={handleClearHistory}
          className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all uppercase"
        >
          <Trash2 size={12} /> LIMPAR
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="PESQUISAR IP..."
          className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs text-emerald-400 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono pl-8"
        />
        <Search size={12} className="absolute left-2.5 top-3 text-zinc-600" />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-1 overflow-x-auto text-[10px] font-bold pb-1">
        {[
          { id: 'all', label: 'TODOS' },
          { id: 'completed', label: 'OK' },
          { id: 'failed', label: 'FALHOU' },
          { id: 'cancelled', label: 'CANCELADO' },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`px-3 py-1 rounded-lg border uppercase transition-colors shrink-0 ${
              filter === c.id
                ? 'bg-emerald-400 text-black border-emerald-400 font-black'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Audit Log Entries List */}
      {loading ? (
        <div className="text-xs text-center text-zinc-500 py-6">[ CARREGANDO HISTÓRICO ]</div>
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center text-zinc-600 text-xs">
          SEM REGISTROS
        </div>
      ) : (
        <div className="grid gap-1.5 text-xs">
          {filtered.map((h: any) => {
            const isRunning = h.status === 'running';
            const isQueued = h.status === 'queued';
            const canDelete = !isRunning && !isQueued;
            const isCompleted = h.status === 'completed';

            return (
              <div
                key={h.id}
                onClick={() => onSelect(h.id)}
                className="bg-zinc-950 hover:bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 flex justify-between items-center cursor-pointer transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span>{getCompactDate(h)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate">{h.target}</span>
                    <span className="text-[10px] text-emerald-400 uppercase font-bold">
                      {h.type} {isCompleted ? '✓' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ChevronRight size={14} className="text-zinc-600" />
                  {canDelete && (
                    <button
                      onClick={(e) => handleDeleteItem(h.id, e)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
