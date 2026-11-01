import { useEffect, useState } from 'react';
import { Shield, ExternalLink, Terminal, CheckCircle2, XCircle, AlertCircle, Clock, Server, Globe } from 'lucide-react';

interface ScanDetailsProps {
  id: string;
}

export default function ScanDetails({ id }: ScanDetailsProps) {
  const [job, setJob] = useState<any>(null);
  const [showTech, setShowTech] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: any = null;

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/scans/${id}`);
        const data = await res.json();
        if (data.success) {
          setJob(data.data);
          if (data.data.status === 'completed' || data.data.status === 'failed' || data.data.status === 'cancelled') {
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

  if (loading && !job) {
    return (
      <div className="p-8 text-center text-gray-400 space-y-3">
        <Clock className="animate-spin mx-auto text-blue-500" size={32} />
        <p className="text-sm font-semibold">Carregando relatório da auditoria...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6 text-center text-red-400 space-y-2">
        <XCircle className="mx-auto" size={32} />
        <p className="font-bold">Auditoria não encontrada.</p>
      </div>
    );
  }

  const { parsedData, status, target, type, stdout, stderr, nmapCommand, exit_code, webResults } = job;
  const host = Array.isArray(parsedData) && parsedData.length > 0 ? parsedData[0] : null;
  const ports = host?.ports || [];
  const openPorts = ports.filter((p: any) => p.state === 'open');
  const isHostUp = host ? host.status === 'up' : false;

  const confirmedWebServers = webResults || [];

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
        return `O alvo ${target} respondeu aos pacotes de descoberta (ARP/ICMP/TCP ping). O host está CONFIRMADO ONLINE.`;
      } else {
        return `O alvo ${target} NÃO respondeu aos pacotes de descoberta. O host pode estar offline ou bloqueando pings.`;
      }
    }

    if (!isHostUp && openPorts.length === 0) {
      return `HOST NÃO ENCONTRADO / NÃO RESPONDEU. O Nmap não recebeu resposta do alvo ${target} para confirmar disponibilidade. Nenhuma porta foi aberta.`;
    }

    if (openPorts.length === 0) {
      return `O alvo ${target} respondeu ao escaneamento, mas NENHUMA das portas analisadas foi confirmada como aberta.`;
    }

    const servicesList = openPorts.map((p: any) => p.service.toUpperCase()).filter(Boolean);
    const uniqueServices = Array.from(new Set(servicesList));

    return `O alvo ${target} respondeu ao escaneamento. Foram analisadas ${ports.length} portas, sendo ${openPorts.length} confirmada(s) aberta(s). Serviços identificados: ${uniqueServices.join(', ')}.`;
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
    <div className="p-4 space-y-6 text-white pb-28 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-gray-800 pb-4">
        <div>
          <span className="text-xs font-mono text-blue-400 block uppercase">Relatório de Auditoria</span>
          <h2 className="text-2xl font-bold font-mono text-white">{target}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Perfil: <span className="text-gray-200 uppercase font-semibold">{type}</span></p>
        </div>

        <span
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
            status === 'completed'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              : status === 'running'
              ? 'bg-blue-950/80 text-blue-300 border-blue-800 animate-pulse'
              : status === 'queued'
              ? 'bg-amber-950/80 text-amber-300 border-amber-800'
              : 'bg-red-950/80 text-red-300 border-red-800'
          }`}
        >
          {status === 'completed' && <CheckCircle2 size={14} />}
          {status === 'failed' && <XCircle size={14} />}
          {status.toUpperCase()}
        </span>
      </div>

      {/* Top Indicators Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900 p-3.5 rounded-xl border border-gray-800 text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Status Host</span>
          <span className={`text-sm font-bold ${isHostUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isHostUp ? '🟢 ONLINE' : '🔴 OFFLINE'}
          </span>
        </div>

        <div className="bg-gray-900 p-3.5 rounded-xl border border-gray-800 text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Portas Abertas</span>
          <span className="text-xl font-bold text-emerald-400 font-mono">{openPorts.length}</span>
        </div>

        <div className="bg-gray-900 p-3.5 rounded-xl border border-gray-800 text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Serviços</span>
          <span className="text-xl font-bold text-blue-400 font-mono">
            {new Set(openPorts.map((p: any) => p.service)).size}
          </span>
        </div>

        <div className="bg-gray-900 p-3.5 rounded-xl border border-gray-800 text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Servidores Web</span>
          <span className="text-xl font-bold text-purple-400 font-mono">{confirmedWebServers.length}</span>
        </div>
      </div>

      {/* Human Diagnosis Card */}
      <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Shield size={14} className="text-blue-400" /> Diagnóstico Humano
        </h3>
        <p className="text-sm text-gray-200 leading-relaxed bg-gray-950 p-4 rounded-lg border border-gray-800 font-sans">
          {getHumanDiagnosis()}
        </p>

        {host?.mac && (
          <p className="text-xs text-gray-400 font-mono pt-1">
            Endereço MAC: <span className="text-white">{host.mac}</span> {host.vendor ? <span className="text-blue-300">({host.vendor})</span> : ''}
          </p>
        )}
      </div>

      {/* Failure Alert Box */}
      {status === 'failed' && (
        <div className="bg-red-950/80 p-5 rounded-xl border border-red-800 text-red-200 space-y-3">
          <h4 className="font-bold text-sm text-red-100 flex items-center gap-2">
            <AlertCircle size={18} /> FALHA NA EXECUÇÃO DA AUDITORIA
          </h4>
          <div className="text-xs font-mono bg-black/60 p-3 rounded border border-red-900/60 space-y-1">
            <p><span className="text-red-400">Comando:</span> {nmapCommand || 'N/A'}</p>
            <p><span className="text-red-400">Exit Code:</span> {exit_code ?? 'Desconhecido'}</p>
          </div>
          {stderr && (
            <pre className="text-xs p-3 bg-red-900/40 rounded border border-red-800 overflow-x-auto text-red-200 font-mono">
              {stderr}
            </pre>
          )}
        </div>
      )}

      {/* Confirmed Web Servers Section */}
      {confirmedWebServers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
            <Globe size={16} /> Servidores Web Confirmados ({confirmedWebServers.length})
          </h3>
          <div className="grid gap-3">
            {confirmedWebServers.map((web: any, idx: number) => (
              <div key={idx} className="bg-gray-900 p-4 rounded-xl border border-purple-900/40 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-bold text-base text-purple-200">{web.url}</span>
                    <p className="text-xs text-gray-400 mt-0.5">Título: <span className="text-white font-medium">{web.title}</span></p>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    HTTP {web.status}
                  </span>
                </div>

                <div className="text-xs text-gray-400 space-y-0.5 bg-gray-950 p-2.5 rounded border border-gray-800">
                  <p>Servidor HTTP: <span className="text-gray-200 font-mono">{web.server}</span></p>
                  <p>Content-Type: <span className="text-gray-200 font-mono">{web.contentType}</span></p>
                </div>

                <a
                  href={web.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs p-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-purple-950/40"
                >
                  <ExternalLink size={14} /> ABRIR NO NAVEGADOR
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Identified Ports Section */}
      {status === 'completed' && ports.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Server size={16} className="text-blue-400" /> Portas Analisadas ({ports.length})
          </h3>

          <div className="grid gap-3">
            {ports.map((p: any, idx: number) => {
              const isOpen = p.state === 'open';
              const isFiltered = p.state === 'filtered';
              const svcName = (p.service || '').toLowerCase();
              const isWebSvc = isOpen && (svcName.includes('http') || svcName.includes('ssl') || svcName.includes('web'));
              const webUrl = isWebSvc ? `${svcName.includes('https') || svcName.includes('ssl') ? 'https' : 'http'}://${target}:${p.port}` : null;

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isOpen
                      ? 'bg-gray-900 border-emerald-900/60'
                      : isFiltered
                      ? 'bg-gray-900 border-amber-900/40'
                      : 'bg-gray-900/60 border-gray-800 opacity-80'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-500' : isFiltered ? 'bg-amber-500' : 'bg-gray-500'}`}></span>
                      <span className="font-mono font-bold text-lg text-white">
                        {p.port} / {p.protocol.toUpperCase()}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                        isOpen
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isFiltered
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}
                    >
                      {p.state.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs text-gray-300 space-y-1">
                    <p>
                      Serviço: <span className="font-bold text-white uppercase">{p.service}</span>
                      {p.product && <span className="text-blue-300 font-normal"> ({p.product} {p.version || ''})</span>}
                    </p>
                  </div>

                  <p className="text-xs text-gray-400 mt-2 bg-gray-950 p-2.5 rounded border border-gray-800 leading-relaxed font-sans">
                    {getPortExplanation(p)}
                  </p>

                  {webUrl && (
                    <a
                      href={webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs p-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink size={14} /> ABRIR NO NAVEGADOR ({webUrl})
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible Technical Details */}
      <div className="pt-2">
        <button
          onClick={() => setShowTech(!showTech)}
          className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-850 text-blue-400 hover:text-blue-300 text-xs font-bold rounded-xl border border-gray-800 flex items-center justify-center gap-2 transition-colors"
        >
          <Terminal size={16} /> {showTech ? 'Esconder detalhes técnicos' : 'Mostrar detalhes técnicos (Saída Raw/XML)'}
        </button>

        {showTech && (
          <div className="mt-4 bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Comando Executado:</span>
              <p className="font-mono text-xs text-blue-300 bg-black p-2.5 rounded border border-gray-800 overflow-x-auto">
                {nmapCommand || 'nmap -oX -'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Exit Code:</span>
              <p className="font-mono text-xs text-gray-300">{exit_code ?? 'Indeterminado'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Saída Stdout (XML / Text):</span>
              <pre className="bg-black p-3 rounded text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-64 border border-gray-850">
                {stdout || 'Sem saída em stdout'}
              </pre>
            </div>

            {stderr && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-red-400 uppercase">Saída Stderr:</span>
                <pre className="bg-red-950/60 p-3 rounded text-[11px] font-mono text-red-200 overflow-x-auto max-h-48 border border-red-900">
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
