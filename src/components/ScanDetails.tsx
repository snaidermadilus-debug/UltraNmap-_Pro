import { useEffect, useState } from 'react';
import { Shield, ExternalLink, Terminal, CheckCircle2, XCircle, AlertCircle, Server, Globe, ChevronLeft, ChevronRight, Cpu } from 'lucide-react';
import ScanProgress from './ScanProgress';
import { isVulnerableOutput } from '../scanner/utils';

interface ScanDetailsProps {
  id: string;
  onBack?: () => void;
}

export default function ScanDetails({ id, onBack }: ScanDetailsProps) {
  const [job, setJob] = useState<any>(null);
  const [showTech, setShowTech] = useState(false);
  const [viewMode, setViewMode] = useState<'progress' | 'technical'>('progress');
  const [loading, setLoading] = useState(true);
  const [selectedHostIndex, setSelectedHostIndex] = useState<number>(0);
  const [expandedPortIndex, setExpandedPortIndex] = useState<number | null>(null);
  const [rawOutput, setRawOutput] = useState<string | null>(null);
  const [loadingRaw, setLoadingRaw] = useState(false);

  const handleToggleRaw = async () => {
    if (!showTech) {
      setShowTech(true);
      if (!rawOutput) {
        setLoadingRaw(true);
        try {
          const res = await fetch(`/api/scans/${id}/raw`);
          if (res.ok) {
            const text = await res.text();
            setRawOutput(text);
          } else {
            setRawOutput(job?.stdout || 'Sem saída em stdout');
          }
        } catch (e) {
          setRawOutput(job?.stdout || 'Sem saída em stdout');
        } finally {
          setLoadingRaw(false);
        }
      }
    } else {
      setShowTech(false);
    }
  };

  useEffect(() => {
    let interval: any = null;

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/scans/${id}`);
        if (res.status === 404) {
          if (interval) clearInterval(interval);
          setJob(null);
          return;
        }
        const data = await res.json();
        if (data.success) {
          setJob(data.data);
          const isFinal = ['completed', 'failed', 'cancelled'].includes(data.data.status);
          // Keep polling while web probes are still being collected after nmap finished
          if (isFinal && !data.data.webProbePending) {
            if (interval) clearInterval(interval);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
    interval = setInterval(fetchJob, 2000);
    return () => clearInterval(interval);
  }, [id]);

  // Set default selected host to first host with open ports
  useEffect(() => {
    if (job?.parsedData && Array.isArray(job.parsedData) && job.parsedData.length > 0) {
      const firstWithOpen = job.parsedData.findIndex((h: any) => 
        Array.isArray(h.ports) && h.ports.some((p: any) => p.state === 'open')
      );
      if (firstWithOpen !== -1) {
        setSelectedHostIndex(firstWithOpen);
      } else {
        setSelectedHostIndex(0);
      }
    }
  }, [job?.parsedData]);

  const handleCancel = async () => {
    try {
      await fetch(`/api/scans/${id}/cancel`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !job) {
    return (
      <div className="p-8 text-center text-emerald-400 font-mono text-xs tracking-wider space-y-4">
        <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>[ CARREGANDO RELATÓRIO DA AUDITORIA... ]</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center text-rose-400 font-mono space-y-3">
        <XCircle className="mx-auto" size={40} />
        <p className="font-bold">[ AUDITORIA NÃO ENCONTRADA ]</p>
        {onBack && (
           <button onClick={onBack} className="text-emerald-400 text-xs font-bold underline">[ VOLTAR ]</button>
        )}
      </div>
    );
  }

  const { parsedData, status, target, type, stdout, stderr, nmapCommand, exit_code, webResults } = job;

  if (viewMode === 'progress') {
    return (
      <div className="pb-28 font-mono">
         <div className="p-4 flex items-center gap-3">
           {onBack && (
             <button onClick={onBack} className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-emerald-400">
               <ChevronLeft size={18} />
             </button>
           )}
           <h2 className="text-lg font-bold text-emerald-400 uppercase tracking-widest">[ ANDAMENTO DA AUDITORIA ]</h2>
         </div>
         <ScanProgress 
            job={job} 
            onCancel={handleCancel} 
            onViewDetails={() => setViewMode('technical')} 
          />
      </div>
    );
  }

  const hostsList = Array.isArray(parsedData) ? parsedData : [];
  const activeHost = hostsList.length > 0 ? (hostsList[selectedHostIndex] || hostsList[0]) : null;
  const ports = activeHost?.ports || [];
  const openPorts = ports.filter((p: any) => p.state === 'open');
  const isHostUp = activeHost ? activeHost.status === 'up' : false;
  const confirmedWebServers = webResults || [];

  const osMatches = activeHost?.osMatches || [];
  const hostScripts = activeHost?.hostScripts || [];

  const allScripts: { id: string; output: string; port?: string }[] = [];
  if (Array.isArray(hostScripts)) {
    hostScripts.forEach((s: any) => allScripts.push({ ...s }));
  }
  if (Array.isArray(ports)) {
    ports.forEach((p: any) => {
      if (Array.isArray(p.scripts)) {
        p.scripts.forEach((s: any) => allScripts.push({ ...s, port: `${p.port}/${p.protocol.toUpperCase()}` }));
      }
    });
  }

  const getHumanDiagnosis = () => {
    if (status === 'failed') {
      return "FALHA NA EXECUÇÃO DO NMAP: O processo terminou com erro ou dependência ausente. Verifique a saída técnica abaixo.";
    }
    if (status === 'running') {
      return "A auditoria Nmap está em andamento. Aguarde enquanto os pacotes são transmitidos e as respostas analisadas.";
    }
    if (status === 'queued') {
      return "A auditoria está na fila de processamento e será iniciada em instantes.";
    }
    if (status === 'cancelled') {
      return "A auditoria foi interrompida pelo usuário antes da conclusão.";
    }

    if (type === 'discovery') {
      if (isHostUp) {
        return `O alvo ${activeHost?.address || target} respondeu aos pacotes de descoberta (ARP/ICMP/TCP ping). O host está CONFIRMADO ONLINE.`;
      } else {
        return `O alvo ${activeHost?.address || target} NÃO respondeu aos pacotes de descoberta. O host pode estar offline ou bloqueando pings.`;
      }
    }

    if (!isHostUp && openPorts.length === 0) {
      return `HOST NÃO ENCONTRADO / NÃO RESPONDEU. O Nmap não recebeu resposta do alvo ${activeHost?.address || target} para confirmar disponibilidade. Nenhuma porta foi aberta.`;
    }

    if (openPorts.length === 0) {
      return `O alvo ${activeHost?.address || target} respondeu ao escaneamento, mas NENHUMA das portas analisadas foi confirmada como aberta.`;
    }

    const servicesList = openPorts.map((p: any) => p.service.toUpperCase()).filter(Boolean);
    const uniqueServices = Array.from(new Set(servicesList));

    return `O alvo ${activeHost?.address || target} respondeu ao escaneamento. Foram analisadas ${ports.length} portas, sendo ${openPorts.length} confirmada(s) aberta(s). Serviços identificados: ${uniqueServices.join(', ')}.`;
  };

  const getPortExplanation = (p: any) => {
    const svc = (p.service || '').toLowerCase();
    const state = (p.state || '').toLowerCase();

    if (state === 'open') {
      if (svc.includes('http') || svc.includes('web')) {
        return `Esta porta está aceitando conexões TCP e o Nmap identificou um serviço HTTP. Existe um servidor web acessível nesse endereço.`;
      }
      if (svc.includes('ssh')) {
        return `Esta porta está aceitando conexões SSH. Um cliente SSH pode ser utilizado para acesso remoto seguro caso haja autenticação válida.`;
      }
      if (svc.includes('domain') || svc.includes('dns')) {
        return `Serviço DNS detectado. O host aceita consultas de resolução de nomes nesta porta.`;
      }
      return `Esta porta está aceitando conexões TCP ativas e o Nmap confirmou a disponibilidade do serviço ${p.service.toUpperCase()}.`;
    }

    if (state === 'filtered') {
      return `A porta está sendo filtrada. O Nmap não recebeu resposta devido a um firewall ou regras de rede bloqueando pacotes.`;
    }

    return `O host respondeu enviando um pacote RST/rejeição, confirmando que não há serviço ativo nesta porta.`;
  };

  return (
    <div className="p-4 space-y-5 text-zinc-100 pb-28 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-zinc-800 pb-4 font-mono">
        <div className="flex items-center gap-3">
           <button onClick={() => setViewMode('progress')} className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-emerald-400">
             <ChevronLeft size={18} />
           </button>
           <div>
             <span className="text-[10px] text-emerald-400 block uppercase font-bold tracking-widest">[ DIAGNÓSTICO TÉCNICO ]</span>
             <h2 className="text-xl font-bold text-white tracking-tight">{target}</h2>
             {hostsList.length > 0 && (
               <span className="text-[10px] text-zinc-400 block font-normal">
                 {hostsList.length} {hostsList.length === 1 ? 'host encontrado' : 'hosts encontrados'}
               </span>
             )}
           </div>
        </div>

        <span
          className={`px-3 py-1 rounded-xl text-[9px] font-bold flex items-center gap-1.5 border ${
            status === 'completed'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : status === 'running'
              ? 'bg-blue-950 text-blue-300 border-blue-800 animate-pulse'
              : status === 'queued'
              ? 'bg-amber-950 text-amber-300 border-amber-800'
              : 'bg-rose-950 text-rose-300 border-rose-800'
          }`}
        >
          {status === 'completed' && <CheckCircle2 size={12} />}
          {status === 'failed' && <XCircle size={12} />}
          {status.toUpperCase()}
        </span>
      </div>

      {/* Multi-Host Selector Tabs (if more than 1 host) */}
      {hostsList.length > 1 && (
        <div className="space-y-2 font-mono">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
            [ SELECIONE O HOST ({hostsList.length}) ]
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {hostsList.map((h: any, idx: number) => {
              const openCount = Array.isArray(h.ports) ? h.ports.filter((p: any) => p.state === 'open').length : 0;
              const isSelected = selectedHostIndex === idx;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedHostIndex(idx);
                    setExpandedPortIndex(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left shrink-0 transition-all ${
                    isSelected
                      ? 'bg-emerald-400 text-black border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-mono font-bold text-xs">{h.address}</div>
                  <div className={`text-[9px] ${isSelected ? 'text-zinc-950 font-bold' : 'text-zinc-500'}`}>
                    {h.hostname ? h.hostname + ' · ' : ''}{openCount} portas
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Indicators Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono">
        <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
          <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">STATUS HOST</span>
          <span className={`text-xs font-bold ${isHostUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isHostUp ? '[ 🟢 HOST ONLINE ]' : '[ 🔴 HOST OFFLINE ]'}
          </span>
        </div>

        <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
          <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">PORTAS ABERTAS</span>
          <span className="text-lg font-bold text-emerald-400 font-mono">{openPorts.length}</span>
        </div>

        <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
          <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">SERVIÇOS</span>
          <span className="text-lg font-bold text-cyan-400 font-mono">
            {new Set(openPorts.map((p: any) => p.service)).size}
          </span>
        </div>

        <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
          <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">SERVIDORES WEB</span>
          <span className="text-lg font-bold text-purple-400 font-mono">{confirmedWebServers.length}</span>
        </div>
      </div>

      {/* Human Diagnosis Card */}
      <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
        <h3 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
          <Shield size={14} /> [ DIAGNÓSTICO DE AUDITORIA ]
        </h3>
        <p className="text-xs text-zinc-200 leading-relaxed bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800 font-sans">
          {getHumanDiagnosis()}
        </p>

        {activeHost?.mac && (
          <p className="text-[10px] text-zinc-500 font-mono pt-1">
            Endereço MAC: <span className="text-zinc-200">{activeHost.mac}</span> {activeHost.vendor ? <span className="text-cyan-400">({activeHost.vendor})</span> : ''}
          </p>
        )}
      </div>

      {/* OS Matches Section */}
      {osMatches.length > 0 && (
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2 font-mono">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
            <Cpu size={14} /> [ SISTEMA OPERACIONAL ]
          </h3>
          <div className="grid gap-1.5 text-xs">
            {osMatches.map((osItem: any, idx: number) => (
              <div key={idx} className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 flex justify-between items-center">
                <span className="font-bold text-white">{osItem.name}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Acurácia: {osItem.accuracy}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NSE Scripts Section */}
      {allScripts.length > 0 && (
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2.5 font-mono">
          <h3 className="text-xs font-bold text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
            <Terminal size={14} /> [ SCRIPTS NSE ({allScripts.length}) ]
          </h3>
          <div className="grid gap-2">
            {allScripts.map((s, idx) => {
              const isVuln = isVulnerableOutput(s.output);
              return (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border ${
                    isVuln 
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200' 
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1 text-[11px] font-bold">
                    <span className={isVuln ? 'text-rose-400' : 'text-purple-300'}>
                      SCRIPT: {s.id} {s.port ? `(Porta ${s.port})` : ''}
                    </span>
                    {isVuln && (
                      <span className="px-1.5 py-0.2 bg-rose-900 text-rose-200 text-[9px] rounded font-black border border-rose-700">
                        VULNERÁVEL
                      </span>
                    )}
                  </div>
                  <pre className="text-[10px] whitespace-pre-wrap font-mono overflow-x-auto bg-black/60 p-2 rounded-lg border border-zinc-800/60">
                    {s.output}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failure Alert Box */}
      {status === 'failed' && (
        <div className="bg-rose-950/40 p-4 rounded-2xl border border-rose-800/80 text-rose-200 space-y-2 font-mono">
          <h4 className="font-bold text-xs text-rose-100 flex items-center gap-2 uppercase tracking-wider">
            <AlertCircle size={16} /> [ FALHA NA EXECUÇÃO DA AUDITORIA ]
          </h4>
          <div className="text-[11px] bg-black p-3 rounded-xl border border-rose-900/60 space-y-1">
            <p><span className="text-rose-400">Comando:</span> {nmapCommand || 'N/A'}</p>
            <p><span className="text-rose-400">Exit Code:</span> {exit_code ?? 'Desconhecido'}</p>
          </div>
          {stderr && (
            <pre className="text-[10px] p-3 bg-rose-950/60 rounded-xl border border-rose-900 overflow-x-auto text-rose-200">
              {stderr}
            </pre>
          )}
        </div>
      )}

      {/* Confirmed Web Servers Section */}
      {confirmedWebServers.length > 0 && (
        <div className="space-y-2.5 font-mono">
          <h3 className="text-xs font-bold text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
            <Globe size={14} /> [ SERVIDORES WEB CONFIRMADOS ({confirmedWebServers.length}) ]
          </h3>
          <div className="grid gap-2.5">
            {confirmedWebServers.map((web: any, idx: number) => (
              <div key={idx} className="bg-zinc-950 p-4 rounded-2xl border border-purple-900/40 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-sm text-purple-200">{web.url}</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Título: <span className="text-white font-medium">{web.title}</span></p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    HTTP {web.status}
                  </span>
                </div>

                <div className="text-[10px] text-zinc-400 space-y-0.5 bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <p>Servidor HTTP: <span className="text-zinc-200">{web.server}</span></p>
                  <p>Content-Type: <span className="text-zinc-200">{web.contentType}</span></p>
                </div>

                <a
                  href={web.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs p-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-purple-950/40"
                >
                  <ExternalLink size={14} /> [ ABRIR NO NAVEGADOR ]
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Identified Ports Section */}
      {status === 'completed' && ports.length > 0 && (
        <div className="space-y-2.5 font-mono">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
              <Server size={14} className="text-emerald-400" /> [ PORTAS ANALISADAS ({ports.length}) ]
            </h3>
            <span className="text-[10px] text-zinc-500">TOQUE PARA EXPANDIR</span>
          </div>

          <div className="grid gap-1.5">
            {ports.map((p: any, idx: number) => {
              const isOpen = p.state === 'open';
              const isFiltered = p.state === 'filtered';
              const isExpanded = expandedPortIndex === idx;
              const svcName = (p.service || '').toLowerCase();
              const isWebSvc = isOpen && (svcName.includes('http') || svcName.includes('ssl') || svcName.includes('web'));
              const webUrl = isWebSvc ? `${svcName.includes('https') || svcName.includes('ssl') ? 'https' : 'http'}://${activeHost?.address || target}:${p.port}` : null;

              return (
                <div
                  key={idx}
                  className={`rounded-xl border transition-all ${
                    isOpen
                      ? 'bg-zinc-950 border-emerald-900/60'
                      : isFiltered
                      ? 'bg-zinc-950 border-amber-900/40'
                      : 'bg-zinc-950/60 border-zinc-850 opacity-80'
                  }`}
                >
                  {/* Compact Collapsed Row */}
                  <div 
                    onClick={() => setExpandedPortIndex(isExpanded ? null : idx)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-xs truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isOpen ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : isFiltered ? 'bg-amber-500' : 'bg-zinc-600'}`} />
                      <span className="text-white w-20 font-mono">{p.port} / {p.protocol.toUpperCase()}</span>
                      <span className="text-emerald-400 uppercase truncate">{p.service || 'UNKNOWN'}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded text-[9px] font-bold ${
                          isOpen
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : isFiltered
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {p.state.toUpperCase()}
                      </span>
                      <ChevronRight size={14} className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-90 text-emerald-400' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded Port Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-zinc-800/80 space-y-2 text-xs">
                      {p.product && (
                        <p className="text-zinc-300">
                          Versão/Produto: <span className="text-cyan-300 font-bold">{p.product} {p.version || ''}</span>
                        </p>
                      )}

                      <p className="text-[11px] text-zinc-400 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 leading-relaxed font-sans">
                        {getPortExplanation(p)}
                      </p>

                      {webUrl && (
                        <a
                          href={webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs p-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors uppercase mt-1"
                        >
                          <ExternalLink size={12} /> ABRIR NO NAVEGADOR ({webUrl})
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible Technical Details */}
      <div className="pt-2 font-mono">
        <button
          onClick={handleToggleRaw}
          className="w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-900 text-emerald-400 text-xs font-bold rounded-2xl border border-zinc-800 flex items-center justify-center gap-2 transition-colors uppercase tracking-wider"
        >
          <Terminal size={14} /> {showTech ? '[ ESCONDER DADOS RAW/XML ]' : '[ MOSTRAR DADOS RAW/XML ]'}
        </button>

        {showTech && (
          <div className="mt-3 bg-black p-4 rounded-2xl border border-zinc-800 space-y-3">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase">Comando Executado:</span>
              <p className="text-xs text-emerald-400 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 overflow-x-auto">
                {nmapCommand || 'nmap -oX -'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase">Exit Code:</span>
              <p className="text-xs text-zinc-300">{exit_code ?? 'Indeterminado'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase">Saída Stdout (XML / Text):</span>
              {loadingRaw ? (
                <p className="text-xs text-emerald-400 font-mono py-2">[ Carregando saída bruta... ]</p>
              ) : (
                <pre className="bg-zinc-950 p-3 rounded-xl text-[10px] text-emerald-400 overflow-x-auto max-h-64 border border-zinc-800">
                  {rawOutput || stdout || 'Sem saída em stdout'}
                </pre>
              )}
            </div>

            {stderr && (
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-rose-400 uppercase">Saída Stderr:</span>
                <pre className="bg-rose-950/40 p-3 rounded-xl text-[10px] text-rose-200 overflow-x-auto max-h-48 border border-rose-900">
                  {stderr}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
