import { useState, useEffect } from 'react';
import { History as HistoryIcon, Trash2, Shield, Search, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function History({ onSelect }: { onSelect: (id: string) => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
    if (!window.confirm('Tem certeza que deseja excluir esta auditoria do histórico?')) {
      return;
    }

    try {
      const res = await fetch(`/api/scans/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Auditoria removida com sucesso.', type: 'success' });
        setHistory((prev) => prev.filter((item) => item.id !== id));
      } else {
        setMessage({ text: data.error || 'Erro ao remover auditoria.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: 'Erro de conexão: ' + err.message, type: 'error' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Tem certeza que deseja apagar o histórico das auditorias concluídas?')) {
      return;
    }

    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `Histórico limpo. ${data.removedCount || 0} registros removidos.`, type: 'success' });
        fetchHistory();
      } else {
        setMessage({ text: data.error || 'Erro ao limpar histórico.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: 'Erro de conexão: ' + err.message, type: 'error' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const filtered = history.filter((h: any) => 
    (h.target || '').includes(search.trim()) && (filter === 'all' || h.status === filter)
  );

  const getDisplayDate = (h: any) => {
    const ref = h.start_time || h.queued_at;
    if (!ref) return 'N/A';
    const d = new Date(ref);
    return d.toISOString().split('T')[0] + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 space-y-5 text-zinc-100 pb-28 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
        <div>
          <h2 className="text-xl font-mono font-black tracking-widest text-emerald-400 uppercase flex items-center gap-2">
            <HistoryIcon size={18} /> HISTORY // AUDIT LOGS
          </h2>
          <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
            [ PERSISTED NETWORK AUDIT RECORDS ]
          </p>
        </div>

        <button
          onClick={handleClearHistory}
          className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold tracking-widest flex items-center gap-1.5 transition-all uppercase active:scale-95"
        >
          <Trash2 size={12} /> LIMPAR HISTÓRICO
        </button>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className={`p-3 rounded-xl font-mono text-xs flex items-center gap-2 border ${
          message.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
            : 'bg-rose-950/80 border-rose-800 text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono">
        <div className="relative sm:col-span-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por IP / Alvo..."
            className="w-full bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl text-xs text-emerald-400 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono pl-9"
          />
          <Search size={14} className="absolute left-3 top-3.5 text-zinc-600" />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500"
        >
          <option value="all">TODOS OS STATUS</option>
          <option value="completed">COMPLETED</option>
          <option value="running">RUNNING</option>
          <option value="failed">FAILED</option>
          <option value="cancelled">CANCELLED</option>
        </select>
      </div>

      {/* Audit Log Entries List */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-950/80 p-12 rounded-2xl border border-zinc-800 text-center text-zinc-500 font-mono text-xs">
          NENHUM REGISTRO DE AUDITORIA ENCONTRADO.
        </div>
      ) : (
        <div className="grid gap-2.5 font-mono">
          {filtered.map((h: any) => {
            const isRunning = h.status === 'running';
            const isQueued = h.status === 'queued';
            const canDelete = !isRunning && !isQueued;

            return (
              <div
                key={h.id}
                onClick={() => onSelect(h.id)}
                className="bg-zinc-950/80 hover:bg-zinc-850 p-3.5 rounded-2xl border border-zinc-800/80 hover:border-zinc-700 flex justify-between items-center cursor-pointer transition-all space-x-2"
              >
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-zinc-500">{getDisplayDate(h)}</span>
                    <span className="font-bold text-sm text-zinc-100">{h.target}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-emerald-400 border border-zinc-800 uppercase">
                      {h.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded text-[9px] font-bold border ${
                      h.status === 'completed'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : h.status === 'running'
                        ? 'bg-blue-950/80 text-blue-300 border-blue-800 animate-pulse'
                        : h.status === 'queued'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                        : 'bg-rose-950/80 text-rose-300 border-rose-800'
                    }`}
                  >
                    {h.status.toUpperCase()}
                  </span>

                  <button
                    onClick={(e) => handleDeleteItem(h.id, e)}
                    disabled={!canDelete}
                    title={canDelete ? 'Excluir auditoria' : 'Auditorias ativas não podem ser excluídas'}
                    className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 ${
                      canDelete
                        ? 'bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 border-zinc-800 hover:border-rose-800'
                        : 'bg-zinc-900/40 text-zinc-700 border-zinc-900 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 size={12} />
                    <span className="hidden sm:inline text-[9px] uppercase">EXCLUIR</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
