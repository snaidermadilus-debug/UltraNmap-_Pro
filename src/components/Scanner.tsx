import { useState, useEffect } from 'react';
import { Search, Zap, List, Flame, Cpu, Globe, Server, Radio, Play } from 'lucide-react';

interface ScannerProps {
  setActiveTab: (tab: string) => void;
  onSelectJob: (id: string) => void;
  initialTarget?: string;
}

const scanCategories = [
  {
    category: 'DESCOBERTA',
    items: [
      {
        id: 'discovery',
        name: 'Descoberta de Host',
        icon: Zap,
        desc: 'Verifica se o alvo está ativo via ARP/ICMP (nmap -sn).',
        intensity: 'Super Rápido',
      },
      {
        id: 'network',
        name: 'Minha Rede Local',
        icon: Radio,
        desc: 'Varre toda a sub-rede CIDR local e descobre dispositivos.',
        intensity: 'Automático',
      },
    ],
  },
  {
    category: 'PORTAS TCP',
    items: [
      {
        id: 'fast',
        name: 'Scan Rápido (-Pn)',
        icon: Zap,
        desc: 'Verifica as 100 portas mais críticas sem ping prévio.',
        intensity: 'Rápido',
      },
      {
        id: 'common',
        name: 'Portas Comuns (Top 100)',
        icon: List,
        desc: 'Analisa as 100 portas TCP mais frequentes com -Pn.',
        intensity: 'Moderado',
      },
      {
        id: 'top1000',
        name: 'Top 1000 Portas',
        icon: Server,
        desc: 'Analisa as 1000 portas TCP mais utilizadas com -Pn.',
        intensity: 'Completo',
      },
      {
        id: 'all',
        name: 'Todas as Portas (65k)',
        icon: Flame,
        desc: 'Intervalo TCP completo de 1 a 65535 com -Pn.',
        intensity: 'Lento',
      },
    ],
  },
  {
    category: 'SERVIÇOS E WEB',
    items: [
      {
        id: 'services',
        name: 'Detecção de Serviços',
        icon: Cpu,
        desc: 'Identifica versões exatas de serviços rodando nas portas (-sV).',
        intensity: 'Detalhado',
      },
      {
        id: 'web',
        name: 'Servidores Web HTTP/S',
        icon: Globe,
        desc: 'Procura portas web (80,443,8080...) e testa requisições HTTP reais.',
        intensity: 'Focado',
      },
    ],
  },
  {
    category: 'SISTEMA E UDP',
    items: [
      {
        id: 'os',
        name: 'Detecção de SO',
        icon: Server,
        desc: 'Tenta identificar o Sistema Operacional do host (-O).',
        intensity: 'Avançado',
      },
      {
        id: 'udp',
        name: 'Portas UDP Comuns',
        icon: Radio,
        desc: 'Varre portas UDP essenciais (DNS, NTP, SNMP, mDNS).',
        intensity: 'Moderado',
      },
    ],
  },
];

export default function Scanner({ setActiveTab, onSelectJob, initialTarget }: ScannerProps) {
  const [target, setTarget] = useState(initialTarget || '192.168.1.8');
  const [selectedProfile, setSelectedProfile] = useState('fast');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialTarget) {
      setTarget(initialTarget);
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
    <div className="p-4 space-y-6 text-white pb-28 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Search className="text-blue-500" /> Scanner de Rede
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Selecione o perfil de auditoria Nmap e informe o alvo real para execução.
        </p>
      </div>

      {/* Target Input Card */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 space-y-3">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
          Endereço do Alvo
        </label>
        <div className="relative">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Ex: 192.168.1.8 ou 192.168.1.0/24"
            className="w-full bg-gray-950 p-3.5 rounded-lg border border-gray-700 text-white font-mono text-sm focus:border-blue-500 focus:outline-none pr-10"
          />
          <span className="absolute right-3 top-3.5 text-xs text-gray-500 font-mono">IPv4 / Host</span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Profile Categories Grid */}
      <div className="space-y-6">
        {scanCategories.map((cat) => (
          <div key={cat.category} className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
              {cat.category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cat.items.map((item) => {
                const IconComponent = item.icon;
                const isSelected = selectedProfile === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectOption(item.id)}
                    className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-950/90 border-blue-500 shadow-lg shadow-blue-950/50'
                        : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-800 text-blue-400'}`}>
                          <IconComponent size={18} />
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-gray-800 text-gray-400 border border-gray-700">
                          {item.intensity}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white mb-1">{item.name}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
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
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 p-4 rounded-xl font-bold text-sm text-white shadow-xl shadow-blue-950/50 flex items-center justify-center gap-2 transition-all border border-blue-400/30"
      >
        {loading ? (
          'Disparando Job Nmap...'
        ) : (
          <>
            <Play size={18} fill="currentColor" /> INICIAR AUDITORIA ({selectedProfile.toUpperCase()})
          </>
        )}
      </button>
    </div>
  );
}
