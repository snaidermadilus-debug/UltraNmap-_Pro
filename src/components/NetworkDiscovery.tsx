import { useEffect, useState } from 'react';
import { Wifi, Search, Server, Cpu, Play, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';

export default function NetworkDiscovery({ onSelectTarget }: { onSelectTarget: (target: string) => void }) {
  const [netInfo, setNetInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);

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
        const data = await res.json();
        if (data.success) {
          const job = data.data;
          if (job.status === 'completed' || job.status === 'failed') {
            setScanResult(job);
            setScanning(false);
            setActiveJobId(null);
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
    if (!netInfo?.cidr) return;
    setScanning(true);
    setScanResult(null);

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
        setScanning(false);
      }
    } catch (e) {
      console.error(e);
      setScanning(false);
    }
  };

  const hosts = scanResult?.parsedData || [];
  const activeHosts = hosts.filter((h: any) => h.status === 'up');

  return (
    <div className="p-4 space-y-6 text-white pb-28 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Wifi className="text-blue-500" /> Dispositivos da Minha Rede
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Descubra automaticamente os hosts ativos conectados à sua sub-rede local.
        </p>
      </div>

      {/* Local Connection Card */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 rounded-xl border border-blue-950/60 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck size={14} /> Minha Conexão Local
          </span>
          <button onClick={fetchNetwork} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 py-4">Detectando interfaces de rede...</div>
        ) : netInfo ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800">
              <span className="text-gray-500 block">IP Local</span>
              <span className="font-mono font-bold text-sm text-emerald-400">{netInfo.ip}</span>
            </div>
            <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800">
              <span className="text-gray-500 block">Rede (CIDR)</span>
              <span className="font-mono font-bold text-sm text-blue-300">{netInfo.cidr}</span>
            </div>
            <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800">
              <span className="text-gray-500 block">Gateway</span>
              <span className="font-mono font-bold text-sm text-gray-200">{netInfo.gateway}</span>
            </div>
            <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800">
              <span className="text-gray-500 block">Interface</span>
              <span className="font-mono font-bold text-sm text-purple-300">{netInfo.interface}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-red-400">Não foi possível obter dados da interface de rede.</div>
        )}

        <button
          onClick={startNetworkScan}
          disabled={scanning || !netInfo}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
            scanning
              ? 'bg-blue-900/50 text-blue-300 cursor-not-allowed border border-blue-700/50'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 border border-blue-400/30'
          }`}
        >
          {scanning ? (
            <>
              <RefreshCw className="animate-spin" size={16} /> Executando nmap -sn {netInfo?.cidr}...
            </>
          ) : (
            <>
              <Search size={16} /> ESCANEAR REDE LOCAL ({netInfo?.cidr || 'Detectando'})
            </>
          )}
        </button>
      </div>

      {/* Discovered Hosts Section */}
      {scanning && (
        <div className="bg-gray-900 p-6 rounded-xl border border-blue-900/40 text-center space-y-3">
          <div className="inline-block p-3 bg-blue-950/80 rounded-full border border-blue-700/40">
            <Search size={24} className="text-blue-400 animate-pulse" />
          </div>
          <p className="font-bold text-white">Varrendo alvos ativos na rede...</p>
          <p className="text-xs text-gray-400">
            Disparando descoberta ARP/ICMP via Nmap em <span className="font-mono text-blue-300">{netInfo?.cidr}</span>.
          </p>
        </div>
      )}

      {scanResult && !scanning && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-100">
              Dispositivos Encontrados ({activeHosts.length})
            </h3>
            <span className="text-xs text-gray-400 font-mono">ID: {scanResult.id}</span>
          </div>

          {activeHosts.length === 0 ? (
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 text-center text-gray-400 text-sm">
              Nenhum dispositivo respondeu ao scan de descoberta no intervalo <span className="font-mono">{scanResult.target}</span>.
            </div>
          ) : (
            <div className="grid gap-3">
              {activeHosts.map((host: any, idx: number) => {
                const isGateway = host.address === netInfo?.gateway;
                const isSelf = host.address === netInfo?.ip;

                return (
                  <div
                    key={idx}
                    className="bg-gray-900 p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span className="font-mono font-bold text-base text-white">{host.address}</span>
                        {isSelf && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/80 text-blue-300 border border-blue-700/40">
                            Este Dispositivo
                          </span>
                        )}
                        {isGateway && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/80 text-purple-300 border border-purple-700/40">
                            Gateway / Roteador
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 space-y-0.5">
                        {host.hostname && <p>Hostname: <span className="text-gray-200">{host.hostname}</span></p>}
                        {host.mac && (
                          <p className="font-mono text-gray-400">
                            MAC: {host.mac} {host.vendor ? <span className="text-blue-300 font-sans">({host.vendor})</span> : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectTarget(host.address)}
                      className="bg-gray-800 hover:bg-gray-700 text-blue-400 hover:text-blue-300 border border-gray-700 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      Escanear este dispositivo <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
