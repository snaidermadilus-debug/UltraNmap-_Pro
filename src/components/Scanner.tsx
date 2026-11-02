import { useState, useEffect } from 'react';
import { 
  Search, Play, RefreshCw, Wifi, Monitor, Zap, ShieldAlert, Cpu, 
  Terminal, Globe, Lock, Server, ShieldCheck, Database, Camera, 
  Flame, Radio, AlertTriangle 
} from 'lucide-react';

interface ScannerProps {
  setActiveTab: (tab: string) => void;
  onSelectJob: (id: string) => void;
  initialTarget?: string;
}

const ROOT_PROFILES = ['firewall', 'udp', 'os', 'aggressive'];

const allProfiles = [
  { id: 'fast', name: 'RÁPIDO', flag: 'FAST SCAN (-F)', icon: Zap },
  { id: 'common', name: 'TOP 100', flag: 'TOP 100 PORTAS', icon: Server },
  { id: 'top1000', name: 'TOP 1000', flag: 'TOP 1000 PORTAS', icon: Server },
  { id: 'all', name: 'TODAS', flag: '1–65535 PORTAS', icon: Flame },
  { id: 'services', name: 'SERVIÇOS', flag: 'VERSION DETECT (-sV)', icon: Cpu },
  { id: 'web', name: 'WEB', flag: 'HTTP/HTTPS PORTS', icon: Globe },
  { id: 'os', name: 'SISTEMA OPERACIONAL', flag: 'OS DETECTION (-O)', icon: Terminal },
  { id: 'udp', name: 'UDP', flag: 'UDP SCAN (-sU)', icon: Radio },
  { id: 'discovery', name: 'DESCOBERTA', flag: 'HOST DISCOVERY (-sn)', icon: Search },
  { id: 'aggressive', name: 'AGRESSIVO', flag: 'OS + VERSÃO + SCRIPTS (-A)', icon: ShieldAlert },
  { id: 'vuln', name: 'VULNERABILIDADES', flag: 'NSE VULN (--script vuln)', icon: ShieldAlert },
  { id: 'scripts', name: 'SCRIPTS', flag: 'DEFAULT NSE (-sC)', icon: Terminal },
  { id: 'db', name: 'BANCO DE DADOS', flag: 'MYSQL/PG/MONGO/REDIS', icon: Database },
  { id: 'iot', name: 'IOT / CÂMERAS', flag: 'RTSP/MQTT (554,1883...)', icon: Camera },
  { id: 'smb', name: 'SMB / WINDOWS', flag: 'SMB/RDP/NETBIOS (139,445)', icon: Server },
  { id: 'ssl', name: 'SSL / TLS', flag: 'CERTIFICADOS (ssl-enum)', icon: Lock },
  { id: 'firewall', name: 'FIREWALL', flag: 'ACK SCAN (-sA)', icon: ShieldCheck },
  { id: 'stealth', name: 'STEALTH', flag: 'SYN LENTO (-sS -T2)', icon: Lock },
];

export default function Scanner({ setActiveTab, onSelectJob, initialTarget }: ScannerProps) {
  const [target, setTarget] = useState(initialTarget || '');
  const [selectedProfile, setSelectedProfile] = useState('fast');
  const [speed, setSpeed] = useState('T4');
  const [customPorts, setCustomPorts] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [netInfo, setNetInfo] = useState<any>(null);
  const [previewCommand, setPreviewCommand] = useState('nmap -Pn -T4 -F 192.168.1.1 -oX -');

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

  // Dynamic preview from server endpoint
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch('/api/scans/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: target.trim() || '192.168.1.1',
            type: selectedProfile,
            speed,
            customPorts: customPorts.trim() || undefined
          })
        });
        const data = await res.json();
        if (data.success && data.data?.command) {
          setPreviewCommand(data.data.command);
        }
      } catch (e) {}
    };

    fetchPreview();
  }, [target, selectedProfile, speed, customPorts]);

  const handleSelectProfile = (id: string) => {
    setSelectedProfile(id);
    if (id === 'stealth') {
      setSpeed('T2');
    }
  };

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
        body: JSON.stringify({ 
          target: target.trim(), 
          type: selectedProfile,
          speed,
          customPorts: customPorts.trim() || undefined
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        onSelectJob(data.data.id);
      } else {
        setErrorMsg(data.error || 'Falha ao agendar auditoria.');
      }
    } catch (e: any) {
      setErrorMsg('Erro de conexão com o servidor: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const isRoot = netInfo?.isRoot || false;
  const isCloudOrAp = netInfo?.ip?.startsWith('169.254.') || netInfo?.cidr?.endsWith('/32');
  const hasDetectedCidr = netInfo?.cidr && netInfo.cidr !== 'não detectado' && netInfo.cidr !== '127.0.0.1/32';

  return (
    <div className="p-4 space-y-4 text-zinc-100 pb-28 max-w-2xl mx-auto font-mono">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h2 className="text-base font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
          <Search size={16} /> SCANNER
        </h2>

        {hasDetectedCidr && (
          <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded-lg font-bold">
            NET {netInfo.cidr}
          </span>
        )}
      </div>

      {/* Cloud/Termux Network Warning Banner */}
      {isCloudOrAp && (
        <div className="bg-cyan-950/60 border border-cyan-800 p-3 rounded-xl flex items-center gap-2.5 text-[11px] text-cyan-200 font-sans">
          <AlertTriangle size={18} className="text-cyan-400 shrink-0" />
          <span>Este servidor não está na sua rede local. Para escanear seu Wi-Fi, rode o app no Termux.</span>
        </div>
      )}

      {/* Target Input Area */}
      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
          <span>ALVO (TARGET)</span>
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

        {/* Quick Action Target Fill Buttons */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold pt-1">
          <button
            onClick={() => setActiveTab('network')}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-cyan-800 rounded-lg flex items-center justify-center gap-1 uppercase"
          >
            <Wifi size={12} /> MINHA REDE
          </button>
          
          <button
            onClick={() => netInfo?.ip && netInfo.ip !== 'não detectado' && setTarget(netInfo.ip)}
            disabled={!netInfo?.ip || netInfo.ip === 'não detectado'}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-800 rounded-lg flex items-center justify-center gap-1 disabled:opacity-40 uppercase"
          >
            <Monitor size={12} /> MEU IP
          </button>
        </div>
      </div>

      {/* Custom Ports Input (Optional) */}
      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1.5">
        <div className="text-[10px] font-bold text-zinc-400 flex justify-between">
          <span>PORTAS CUSTOMIZADAS (OPCIONAL)</span>
          {customPorts && <span className="text-emerald-400">ATIVADO</span>}
        </div>
        <input
          type="text"
          value={customPorts}
          onChange={(e) => setCustomPorts(e.target.value)}
          placeholder="Ex: 80,443,8080 ou 1-1000"
          className="w-full bg-zinc-900 p-2.5 rounded-lg border border-zinc-700 text-cyan-300 font-mono text-xs focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {/* Speed Timing Selector */}
      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
        <span className="text-[10px] font-bold text-zinc-400 block uppercase">VELOCIDADE (TIMING -T)</span>
        <div className="grid grid-cols-4 gap-1.5 text-[10px] font-bold">
          {[
            { id: 'T2', name: 'T2 (STEALTH)' },
            { id: 'T3', name: 'T3 (NORMAL)' },
            { id: 'T4', name: 'T4 (RÁPIDO)' },
            { id: 'T5', name: 'T5 (INSANO)' },
          ].map((s) => {
            const isSelected = speed === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSpeed(s.id)}
                className={`py-2 px-1 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'bg-emerald-400 text-black border-emerald-400 font-black shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Profiles Grid (2 Columns) */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
          <span>PERFIL DE AUDITORIA ({allProfiles.length})</span>
          <span className="text-zinc-500">DESLIZE PARA VER MAIS ↓</span>
        </div>

        <div className="max-h-64 overflow-y-auto grid grid-cols-2 gap-2 pr-1 scrollbar-thin">
          {allProfiles.map((p) => {
            const isSelected = selectedProfile === p.id;
            const Icon = p.icon;
            const requiresRoot = ROOT_PROFILES.includes(p.id);

            return (
              <button
                key={p.id}
                onClick={() => handleSelectProfile(p.id)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? 'bg-emerald-400 text-black border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between min-w-0 mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-black truncate">
                    <Icon size={14} className={isSelected ? 'text-black shrink-0' : 'text-emerald-400 shrink-0'} />
                    <span className="truncate">{p.name}</span>
                  </div>

                  {requiresRoot && !isRoot && (
                    <span className={`text-[8px] font-bold px-1 py-0.2 rounded border shrink-0 ${isSelected ? 'bg-black text-amber-300 border-black' : 'bg-amber-950/80 text-amber-300 border-amber-800'}`}>
                      REQUER ROOT
                    </span>
                  )}
                </div>

                <div className={`text-[9px] truncate ${isSelected ? 'text-zinc-950 font-bold' : 'text-zinc-500'}`}>
                  {p.flag}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time Final Command Preview Card */}
      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">
          COMANDO NMAP EXECUTADO:
        </span>
        <div className="p-2 bg-black rounded-lg border border-zinc-800 text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-nowrap">
          {previewCommand}
        </div>
      </div>

      {/* Legal Authorization Warning Banner */}
      <div className="bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-xl flex items-center gap-2 text-[10px] text-amber-200 font-sans">
        <AlertTriangle size={16} className="text-amber-400 shrink-0" />
        <span>Use apenas em redes e dispositivos que você tem autorização para testar.</span>
      </div>

      {/* Main Action Button */}
      <button
        onClick={startScan}
        disabled={loading}
        className="w-full bg-emerald-400 hover:bg-emerald-300 text-black p-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 active:scale-95 transition-all tracking-wider uppercase"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            SCANNING...
          </div>
        ) : (
          <>
            <Play size={16} fill="currentColor" /> INICIAR SCAN
          </>
        )}
      </button>

      {/* Server Error Message Prominently Displayed Below Action Button */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/90 border border-rose-800 text-rose-200 text-xs rounded-xl font-bold font-mono text-center">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
