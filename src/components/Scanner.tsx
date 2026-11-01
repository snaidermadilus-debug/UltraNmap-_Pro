import { useState, useEffect } from 'react';
import { Search, Zap, List, Flame, Cpu, Globe, Server, Radio, Play, RefreshCw, Terminal, Wifi } from 'lucide-react';

interface ScannerProps {
  setActiveTab: (tab: string) => void;
  onSelectJob: (id: string) => void;
  initialTarget?: string;
}

const scanCategories = [
  {
    category: 'DESCOBERTA DE REDE',
    items: [
      {
        id: 'discovery',
        name: 'Descoberta de Host (-sn)',
        icon: Zap,
        desc: 'Verifica se o alvo está ativo via ARP/ICMP ping.',
        intensity: 'SUPER RÁPIDO',
      },
      {
        id: 'network',
        name: 'Minha Rede Local',
        icon: Radio,
        desc: 'Varre a sub-rede CIDR local e descobre todos os dispositivos.',
        intensity: 'AUTOMÁTICO',
      },
    ],
  },
  {
    category: 'PORTAS TCP',
    items: [
      {
        id: 'fast',
        name: 'Scan Rápido (-Pn -F)',
        icon: Zap,
        desc: 'Analisa as 100 portas TCP mais críticas sem ICMP prévio.',
        intensity: 'RÁPIDO',
      },
      {
        id: 'common',
        name: 'Top 100 Portas (-Pn)',
        icon: List,
        desc: 'Analisa as 100 portas TCP mais frequentes com -Pn.',
        intensity: 'MODERADO',
      },
      {
        id: 'top1000',
        name: 'Top 1000 Portas (-Pn)',
        icon: Server,
        desc: 'Analisa as 1000 portas TCP padrão do Nmap.',
        intensity: 'COMPLETO',
      },
      {
        id: 'all',
        name: 'Todas as Portas (-p-)',
        icon: Flame,
        desc: 'Intervalo TCP completo de 1 a 65535 com -Pn.',
        intensity: 'LENTO',
      },
    ],
  },
  {
    category: 'SERVIÇOS E WEB',
    items: [
      {
        id: 'services',
        name: 'Detecção de Serviços (-sV)',
        icon: Cpu,
        desc: 'Identifica versões exatas de serviços rodando nas portas.',
        intensity: 'DETALHADO',
      },
      {
        id: 'web',
        name: 'Servidores Web HTTP/S',
        icon: Globe,
        desc: 'Varre portas HTTP/S (80,443,8080...) com probe web automático.',
        intensity: 'FOCADO',
      },
    ],
  },
  {
    category: 'SISTEMA E UDP',
    items: [
      {
        id: 'os',
        name: 'Detecção de SO (-O)',
        icon: Server,
        desc: 'Tenta identificar o Sistema Operacional do host.',
        intensity: 'AVANÇADO',
      },
      {
        id: 'udp',
        name: 'Portas UDP Comuns (-sU)',
        icon: Radio,
        desc: 'Varre portas UDP essenciais (DNS, NTP, SNMP, mDNS).',
        intensity: 'MODERADO',
      },
    ],
  },
];

export default function Scanner({ setActiveTab, onSelectJob, initialTarget }: ScannerProps) {
  const [target, setTarget] = useState(initialTarget || '');
  const [selectedProfile, setSelectedProfile] = useState('fast');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [detectedCidr, setDetectedCidr] = useState<string | null>(null);

  useEffect(() => {
    if (initialTarget) {
      setTarget(initialTarget);
    } else {
      fetch('/api/network')
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data?.cidr && d.data.cidr !== 'não detectado') {
            setDetectedCidr(d.data.cidr);
          }
        })
        .catch(() => {});
    }
  }, [initialTarget]);

  const handleSelectOption = (id: string) => {
    if (id === 'network') {
      setActiveTab('network');
      return;
    }
    setSelectedProfile(id);
  };

  const startScan = async () => {
    if (!target.trim()) {
      setErrorMsg('Informe um endereço IP, CIDR ou Hostname válido.');
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
      setErrorMsg('Erro de conexão ao servidor: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-5 text-zinc-100 pb-28 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-3 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-black font-mono tracking-widest text-emerald-400 uppercase flex items-center gap-2">
            <Terminal size={18} /> TARGET // CONFIGURATION
          </h2>
          <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
            [ DEFINE AUDIT TARGET AND NMAP PROFILE PARAMETERS ]
          </p>
        </div>
        <span className="text-[10px] font-mono text-emerald-400/80 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30">
          [ NMAP READY ]
        </span>
      </div>

      {/* Target Input Card */}
      <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 space-y-3 shadow-xl">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
            TARGET ADDRESS (IP / CIDR / HOSTNAME)
          </label>
          {detectedCidr && !target && (
            <button
              onClick={() => setTarget(detectedCidr)}
              className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Wifi size={10} /> Usar {detectedCidr}
            </button>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Ex: 192.168.1.1 ou 192.168.1.0/24 ou target.local"
            className="w-full bg-zinc-900/90 p-3.5 rounded-xl border border-zinc-700 text-emerald-400 font-mono text-sm focus:border-emerald-500 focus:outline-none pr-24 shadow-inner"
          />
          <span className="absolute right-3 top-3.5 text-[10px] text-zinc-500 font-mono uppercase border border-zinc-800 px-2 py-0.5 rounded bg-black">
            IPv4 / HOST
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-mono rounded-xl">
            [ ERROR ]: {errorMsg}
          </div>
        )}
      </div>

      {/* Profile Categories Grid */}
      <div className="space-y-5">
        {scanCategories.map((cat) => (
          <div key={cat.category} className="space-y-2.5">
            <h3 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {cat.category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {cat.items.map((item) => {
                const IconComponent = item.icon;
                const isSelected = selectedProfile === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectOption(item.id)}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/50'
                        : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-emerald-400'}`}>
                          <IconComponent size={16} />
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold bg-zinc-950 text-zinc-400 border border-zinc-800">
                          {item.intensity}
                        </span>
                      </div>
                      <h4 className="font-mono font-bold text-xs text-zinc-100 mb-1">{item.name}</h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={startScan}
        disabled={loading}
        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 p-4 rounded-2xl font-mono font-black text-sm text-black shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all active:scale-95 border border-emerald-400/30 tracking-widest uppercase"
      >
        {loading ? (
          <div className="flex items-center gap-2 text-black">
            <RefreshCw size={18} className="animate-spin" />
            [ SCANNER ACTIVE ]
          </div>
        ) : (
          <>
            <Play size={18} fill="currentColor" /> [ INICIAR AUDITORIA: {selectedProfile.toUpperCase()} ]
          </>
        )}
      </button>
    </div>
  );
}
