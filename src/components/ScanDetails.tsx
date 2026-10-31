import { useEffect, useState } from 'react';

export default function ScanDetails({ id }: any) {
  const [job, setJob] = useState<any>(null);
  const [showTech, setShowTech] = useState(false);

  useEffect(() => {
    fetch(`/api/scans/${id}`).then(r => r.json()).then(d => setJob(d.data));
  }, [id]);

  if (!job) return <div className="p-4 text-white">Carregando auditoria...</div>;

  const { parsedData, status, target, stdout, stderr } = job;
  const host = parsedData?.[0];
  const ports = host?.ports || [];
  const open = ports.filter((p: any) => p.state === 'open');

  const getDiagnosis = () => {
    if (status !== 'completed') return "A auditoria ainda está em processamento.";
    if (!host) return "O alvo não respondeu ao método de descoberta utilizado.";
    
    let diag = [`O alvo respondeu ao escaneamento e foram encontradas ${ports.length} portas.`];
    if (open.length > 0) diag.push(`Foram encontradas ${open.length} portas abertas.`);
    open.forEach((p: any) => diag.push(`Foi identificado um serviço ${p.service.toUpperCase()} na porta ${p.port}.`));
    return diag.join(' ');
  };

  return (
    <div className="p-4 space-y-6 text-white pb-24">
      <h2 className="text-2xl font-bold">Diagnóstico da Auditoria</h2>
      
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <p className="text-gray-400 text-sm">Alvo: <span className="text-white font-mono">{target}</span></p>
        <p className="text-gray-400 text-sm">Estado: <span className="font-semibold">{status === 'completed' ? '✓ Concluído' : status.toUpperCase()}</span></p>
        {host && <p className="text-gray-400 text-sm">Host: <span className="text-white">{host.address} (Online)</span></p>}
      </div>

      <div className="space-y-2">
        <h3 className="font-bold text-lg">Resumo</h3>
        <p className="text-sm text-gray-300 leading-relaxed bg-gray-900 p-3 rounded border border-gray-800">{getDiagnosis()}</p>
      </div>

      {job.webResults && job.webResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Servidores Web Encontrados</h3>
          {job.webResults.map((web: any, i: number) => (
            <div key={i} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono font-bold text-lg">{web.url}</span>
                <span className="px-2 py-1 rounded text-xs font-bold bg-green-900 text-green-300">ONLINE</span>
              </div>
              <p className="text-sm text-gray-300">Status: {web.status}</p>
              <p className="text-sm text-gray-300">Título: {web.title}</p>
              <a href={web.url} target="_blank" rel="noopener noreferrer" className="block mt-3 text-center bg-blue-600 text-white font-bold p-2 rounded-lg">ABRIR NO NAVEGADOR</a>
            </div>
          ))}
        </div>
      )}

      {status === 'completed' && ports.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Portas identificadas</h3>
          {ports.map((p: any, i: number) => (
            <div key={i} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono font-bold text-lg">{p.port} / TCP</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${p.state === 'open' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                  {p.state.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-300">Serviço: <span className="text-white">{p.service}</span></p>
              {p.version !== 'unknown' && <p className="text-sm text-gray-300">Versão: <span className="text-white">{p.version}</span></p>}
              <p className="text-xs text-gray-500 mt-2 italic">
                {p.state === 'open' ? `Esta porta está aceitando conexões TCP e o Nmap identificou um serviço ${p.service.toUpperCase()}.` :
                 p.state === 'filtered' ? "A porta está sendo filtrada ou não foi possível determinar seu estado devido à ausência/bloqueio de respostas." :
                 "O host respondeu, mas não há um serviço aceitando conexões nessa porta."}
              </p>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setShowTech(!showTech)} className="w-full text-center text-blue-400 text-sm p-3 bg-gray-900 rounded-lg border border-gray-800">
        {showTech ? 'Esconder saída técnica' : 'Mostrar saída técnica'}
      </button>
      {showTech && (
        <div className="space-y-2">
          <h4 className="font-bold text-sm text-gray-400">Saída técnica do Nmap</h4>
          <pre className="bg-black p-4 rounded-lg text-xs overflow-x-auto border border-gray-800 text-gray-300">{stdout || 'Sem saída'}</pre>
          {stderr && <pre className="bg-red-950 p-4 rounded-lg text-xs overflow-x-auto border border-red-900 text-red-300">{stderr}</pre>}
        </div>
      )}
    </div>
  );
}
