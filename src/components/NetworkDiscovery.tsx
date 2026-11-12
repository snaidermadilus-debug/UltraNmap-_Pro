import { useEffect, useState } from 'react';
import { Wifi, Search, RefreshCw, ArrowRight, ShieldCheck, Zap, Server, Globe, Cpu, X, Play } from 'lucide-react';

interface NetworkDiscoveryProps {
  onSelectTarget: (target: string) => void;
  onSelectJob?: (id: string) => void;
}

export default function NetworkDiscovery({ onSelectTarget, onSelectJob }: NetworkDiscoveryProps) {
  const [netInfo, setNetInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [selectedHostModal, setSelectedHostModal] = useState<string | null>(null);
  const [quickScanLoading, setQuickScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchNetwork = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/network');
      const data = await res.json();
      if (data.success) {
        setNetInfo(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetwork();
  }, []);

  useEffect(() => {
    if (!activeJobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/scans/${activeJobId}`);
        if (res.status === 404) {
          setScanError('O job de descoberta não foi encontrado (pode ter sido removido).');
          setScanning(false);
          setActiveJobId(null);
          return;
        }
        const data = await res.json();
        if (data.success) {
          const job = data.data;
          if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
            setScanResult(job);
            setScanning(false);
            setActiveJobId(null);
            if (job.status === 'failed') {
              setScanError(job.stderr || 'A varredura da rede falhou.');
            } else if (job.status === 'cancelled') {
              setScanError('A varredura da rede foi cancelada.');
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [activeJobId]);

  const startNetworkScan = async () => {
    if (!netInfo?.cidr || netInfo.cidr === 'não detectado') return;
    setScanning(true);
    setScanResult(null);
    setScanError(null);

    try {
      const res = await fetch('/api/network/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cidr: netInfo.cidr }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveJobId(data.data.id);
      } else {
        setScanError(data.error || 'Não foi possível iniciar a varredura da rede.');
        setScanning(false);
      }
    } catch (e) {
      console.error(e);
      setScanError('Falha de conexão com o servidor.');
      setScanning(false);
    }
  };

  const handleQuickScan = async (profile: string) => {
    if (!selectedHostModal) return;
    setQuickScanLoading(true);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: selectedHostModal, type: profile }),
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        setSelectedHostModal(null);
        if (onSelectJob) {
          onSelectJob(data.data.id);
        } else {
          onSelectTarget(selectedHostModal);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQuickScanLoading(false);
    }
  };

  const hosts = scanResult?.parsedData || [];
  const activeHosts = hosts.filter((h: any) => h.status === 'up');

  return (
    <div className="p-4 space-y-4 text-zinc-100 pb-28 max-w-2xl mx-auto font-mono">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <div>
          <h2 className="text-base font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
            <Wifi size={16} /> NETWORK DISCOVERY
          </h2>
          <p className="text-[10px] text-zinc-400">
            {netInfo?.cidr && netInfo.cidr !== 'não detectado' 
              ? `REDES CONECTADAS: ${netInfo.cidr}` 
              : 'ANALISANDO CIDR LOCAL...'}
          </p>
        </div>

        <button 
          onClick={fetchNetwork} 
          className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg flex items-center gap-1 text-[10px] font-bold"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> ATUALIZAR
        </button>
      </div>

      {/* Network Interface Information */}
      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-3">
        {loading ? (
          <div className="text-xs text-emerald-400 py-3 text-center">
            [ DETECTANDO ROUTING TABLE E INTERFACE DE REDE... ]
          </div>
        ) : netInfo && netInfo.cidr !== 'não detectado' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block uppercase font-bold">IP LOCAL</span>
              <span className="font-bold text-emerald-400 truncate block">{netInfo.ip}</span>
            </div>
            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block uppercase font-bold">CIDR</span>
              <span className="font-bold text-cyan-400 truncate block">{netInfo.cidr}</span>
            </div>
            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block uppercase font-bold">GATEWAY</span>
              <span className="font-bold text-zinc-200 truncate block">{netInfo.gateway}</span>
            </div>
            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block uppercase font-bold">INTERFACE</span>
              <span className="font-bold text-purple-400 truncate block">{netInfo.interface}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-rose-400 p-2 bg-rose-950/40 rounded-lg border border-rose-900">
            Não foi possível detectar a rede local. Verifique as permissões de rede.
          </div>
        )}

        <button
          onClick={startNetworkScan}
          disabled={scanning || !netInfo || netInfo.cidr === 'não detectado'}
          className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-black rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 uppercase tracking-wider transition-all"
        >
          {scanning ? (
            <>
              <RefreshCw className="animate-spin" size={16} /> [ VARRENDO REDE {netInfo?.cidr}... ]
            </>
          ) : (
            <>
              <Search size={16} /> [ ◉ SCAN NETWORK ]
            </>
          )}
        </button>
      </div>

      {scanError && !scanning && (
        <div role="alert" className="bg-red-950/40 p-3 rounded-xl border border-red-900/50 text-xs text-red-400">
          {scanError}
        </div>
      )}

      {/* Discovered Hosts Section */}
      {scanning && (
        <div className="bg-zinc-950 p-6 rounded-xl border border-emerald-900/40 text-center space-y-2">
          <div className="inline-block p-3 bg-emerald-950/60 rounded-full border border-emerald-700/40">
            <Search size={22} className="text-emerald-400 animate-pulse" />
          </div>
          <p className="font-bold text-xs text-emerald-400 uppercase">[ VARRENDO ALVOS ATIVOS VIA ARP/ICMP ]</p>
          <p className="text-[10px] text-zinc-400">
            AGUARDE RESPOSTAS EM <span className="text-cyan-400 font-bold">{netInfo?.cidr}</span>...
          </p>
        </div>
      )}

      {scanResult && !scanning && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-zinc-300 uppercase tracking-widest">
              [ HOSTS ENCONTRADOS ({activeHosts.length}) ]
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">JOB: {scanResult.id.slice(0, 8)}</span>
          </div>

          {activeHosts.length === 0 ? (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center text-zinc-500 text-xs">
              Nenhum dispositivo respondeu ao scan no alvo <span className="text-zinc-300">{scanResult.target}</span>.
            </div>
          ) : (
            <div className="grid gap-2">
              {activeHosts.map((host: any, idx: number) => {
                const isGateway = host.address === netInfo?.gateway;
                const isSelf = host.address === netInfo?.ip;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedHostModal(host.address)}
                    className="bg-zinc-950 hover:bg-zinc-900 p-3 rounded-xl border border-zinc-800 hover:border-emerald-500/50 cursor-pointer transition-all flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white truncate">{host.address}</span>
                          {isSelf && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                              MEU IP
                            </span>
                          )}
                          {isGateway && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 shrink-0">
                              ROUTER
                            </span>
                          )}
                        </div>
                        {host.vendor && (
                          <p className="text-[10px] text-zinc-400 truncate">
                            {host.vendor} {host.mac ? `(${host.mac})` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold shrink-0">
                      <span>AÇÕES</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Action Modal for Discovered Host */}
      {selectedHostModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-emerald-500/40 w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">[ AÇÃO RÁPIDA DE SCAN ]</span>
                <h3 className="text-base font-bold text-white font-mono">{selectedHostModal}</h3>
              </div>
              <button 
                onClick={() => setSelectedHostModal(null)}
                className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Selecione o perfil de auditoria Nmap para disparar imediatamente contra este host:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold font-mono">
              <button
                onClick={() => handleQuickScan('fast')}
                disabled={quickScanLoading}
                className="p-3 bg-zinc-900 hover:bg-emerald-400 hover:text-black border border-zinc-800 rounded-xl flex items-center justify-center gap-1.5 transition-all text-emerald-400 disabled:opacity-40"
              >
                <Zap size={14} /> [ FAST ]
              </button>
              
              <button
                onClick={() => handleQuickScan('top1000')}
                disabled={quickScanLoading}
                className="p-3 bg-zinc-900 hover:bg-emerald-400 hover:text-black border border-zinc-800 rounded-xl flex items-center justify-center gap-1.5 transition-all text-cyan-400 disabled:opacity-40"
              >
                <Server size={14} /> [ PORTS ]
              </button>

              <button
                onClick={() => handleQuickScan('services')}
                disabled={quickScanLoading}
                className="p-3 bg-zinc-900 hover:bg-emerald-400 hover:text-black border border-zinc-800 rounded-xl flex items-center justify-center gap-1.5 transition-all text-purple-400 disabled:opacity-40"
              >
                <Cpu size={14} /> [ SERVICES ]
              </button>

              <button
                onClick={() => handleQuickScan('web')}
                disabled={quickScanLoading}
                className="p-3 bg-zinc-900 hover:bg-emerald-400 hover:text-black border border-zinc-800 rounded-xl flex items-center justify-center gap-1.5 transition-all text-amber-400 disabled:opacity-40"
              >
                <Globe size={14} /> [ WEB ]
              </button>
            </div>

            <button
              onClick={() => {
                const target = selectedHostModal;
                setSelectedHostModal(null);
                onSelectTarget(target);
              }}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-700 text-center block"
            >
              [ CONFIGURAR AVANÇADO NO SCANNER ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

