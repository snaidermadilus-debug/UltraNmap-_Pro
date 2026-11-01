import { useState, useEffect } from 'react';
import { Search, Zap, List, Flame, Cpu, Globe, Server, Radio, Play, RefreshCw, Wifi, Monitor } from 'lucide-react';

interface ScannerProps {
  setActiveTab: (tab: string) => void;
  onSelectJob: (id: string) => void;
  initialTarget?: string;
}

const compactProfiles = [
  { id: 'fast', name: '⚡ RÁPIDO', flag: '-F · -Pn' },
  { id: 'common', name: '◉ TOP 100', flag: '100 PORTAS' },
  { id: 'top1000', name: '◉ TOP 1000', flag: '1000 PORTAS' },
  { id: 'all', name: '🔥 TODAS', flag: '1–65535' },
  { id: 'services', name: '⚙ SERVIÇOS', flag: '-sV' },
  { id: 'web', name: '🌐 WEB', flag: 'HTTP / HTTPS' },
  { id: 'os', name: '🖥 SO', flag: '-O' },
  { id: 'udp', name: '◉ UDP', flag: 'DNS · NTP' },
];

export default function Scanner({ setActiveTab, onSelectJob, initialTarget }: ScannerProps) {
  const [target, setTarget] = useState(initialTarget || '');
  const [selectedProfile, setSelectedProfile] = useState('fast');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [netInfo, setNetInfo] = useState<any>(null);

  useEffect(() => {
    if (initialTarget) {
      setTarget(initialTarget);
    }
    fetch('/api/network')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setNetInfo(d.data);
        }
      })
      .catch(() => {});
  }, [initialTarget]);

  const startScan = async () => {
    if (!target.trim()) {
      setErrorMsg('Informe um endereço IP, CIDR ou Hostname.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim(), type: selectedProfile }),
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        onSelectJob(data.data.id);
      } else {
        setErrorMsg(data.error || 'Falha ao agendar auditoria.');
      }
    } catch (e: any) {
      setErrorMsg('Erro: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 text-zinc-100 pb-28 max-w-2xl mx-auto font-mono">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h2 className="text-base font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
          <Search size={16} /> SCANNER
        </h2>

        {netInfo?.cidr && netInfo.cidr !== 'não detectado' && (
          <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded-lg font-bold">
            NET {netInfo.cidr}
          </span>
        )}
      </div>

      {/* Target Area */}
      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
          <span>TARGET</span>
          {netInfo?.ip && netInfo.ip !== 'não detectado' && (
            <span className="text-zinc-500">IP: {netInfo.ip}</span>
          )}
        </div>

        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Ex: 192.168.1.1 ou 192.168.1.0/24"
          className="w-full bg-zinc-900 p-3 rounded-lg border border-zinc-700 text-emerald-400 font-mono text-xs focus:border-emerald-500 focus:outline-none"
        />

        {/* Quick Fill Buttons */}
        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold pt-1">
          <button
            onClick={() => setActiveTab('network')}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-cyan-800 rounded-lg flex items-center justify-center gap-1"
          >
            <Wifi size={12} /> MINHA REDE
          </button>
          
          <button
            onClick={() => netInfo?.ip && netInfo.ip !== 'não detectado' && setTarget(netInfo.ip)}
            disabled={!netInfo?.ip || netInfo.ip === 'não detectado'}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-800 rounded-lg flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <Monitor size={12} /> MEU IP
          </button>

          <button
            onClick={() => setTarget('127.0.0.1')}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-800 rounded-lg flex items-center justify-center gap-1"
          >
            <Server size={12} /> LOCALHOST
          </button>
        </div>

        {errorMsg && (
          <div className="p-2 bg-rose-950/80 border border-rose-800 text-rose-300 text-[10px] rounded-lg">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Profiles Grid */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-zinc-500 block uppercase">PROFILE</span>
        <div className="grid grid-cols-2 gap-2">
          {compactProfiles.map((p) => {
            const isSelected = selectedProfile === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProfile(p.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-400 text-black border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="text-xs font-black">{p.name}</div>
                <div className={`text-[9px] ${isSelected ? 'text-zinc-900' : 'text-zinc-500'}`}>{p.flag}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Action Button */}
      <button
        onClick={startScan}
        disabled={loading}
        className="w-full bg-emerald-400 hover:bg-emerald-300 text-black p-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 active:scale-95 transition-all tracking-wider uppercase"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="animate-spin" />
            ◉ SCANNER ATIVO
          </div>
        ) : (
          <>
            <Play size={18} fill="currentColor" /> ▶ INICIAR SCAN
          </>
        )}
      </button>
    </div>
  );
}
