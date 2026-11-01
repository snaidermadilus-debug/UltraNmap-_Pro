import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Clock, XCircle, CheckCircle2, AlertCircle, StopCircle, Zap, Search, Terminal } from 'lucide-react';

interface ScanProgressProps {
  job: any;
  onCancel: () => void;
  onViewDetails: () => void;
}

const statusMessages = [
  "Preparando auditoria...",
  "Executando Nmap...",
  "Analisando portas...",
  "Identificando serviços...",
  "Processando resultados...",
  "Gerando diagnóstico..."
];

export default function ScanProgress({ job, onCancel, onViewDetails }: ScanProgressProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isQueued = job.status === 'queued';
  const isRunning = job.status === 'running';
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const isCancelled = job.status === 'cancelled';

  // Dynamic messages rotation
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setMsgIndex((prev) => (prev + 1) % statusMessages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  // Real-time timer
  useEffect(() => {
    if (isRunning) {
      if (!timerRef.current) {
        const startTime = job.start_time ? new Date(job.start_time).getTime() : Date.now();
        const updateTimer = () => {
          setElapsed(Math.floor((Date.now() - startTime) / 1000));
        };
        updateTimer();
        timerRef.current = setInterval(updateTimer, 1000);
      }
    } else if (isCompleted || isFailed || isCancelled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (job.end_time && job.start_time) {
        const end = new Date(job.end_time).getTime();
        const start = new Date(job.start_time).getTime();
        setElapsed(Math.max(0, Math.floor((end - start) / 1000)));
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isCompleted, isFailed, isCancelled, job.start_time, job.end_time]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (isQueued) return "Aguardando execução na fila...";
    if (isRunning) return statusMessages[msgIndex];
    if (isCompleted) return "Auditoria concluída";
    if (isFailed) return "Não foi possível concluir a auditoria.";
    if (isCancelled) return "Scan cancelado pelo usuário.";
    return "";
  };

  const host = Array.isArray(job.parsedData) && job.parsedData.length > 0 ? job.parsedData[0] : null;
  const isHostUp = host ? host.status === 'up' : false;
  const openPortsCount = host?.ports?.filter((p: any) => p.state === 'open').length || 0;
  const servicesCount = new Set(host?.ports?.filter((p: any) => p.state === 'open').map((p: any) => p.service)).size;
  const webServersCount = job.webResults?.length || 0;

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-5 font-mono">
      {/* Main Terminal Radar Status Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-950 border border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/20 relative"
      >
        {/* Tech Grid Background Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#052e16_1px,transparent_1px),linear-gradient(to_bottom,#052e16_1px,transparent_1px)] bg-[size:24px_24px] opacity-25 pointer-events-none" />

        {/* Radar Background Animation (only when running or queued) */}
        <AnimatePresence>
          {(isRunning || isQueued) && (
            <div className="absolute inset-0 pointer-events-none opacity-25">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-500/30 via-emerald-500/5 to-transparent rounded-full"
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center">
                <div className="w-48 h-48 border border-emerald-500/40 rounded-full animate-pulse" />
                <div className="absolute w-80 h-80 border border-emerald-500/15 rounded-full" />
              </div>
            </div>
          )}
        </AnimatePresence>

        <div className="p-6 relative z-10 flex flex-col items-center text-center space-y-6">
          {/* Header Badge */}
          <div className="flex flex-col items-center">
             {isQueued ? (
               <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-3 border border-amber-500/30 relative">
                 <Clock className="text-amber-400 relative z-10" size={24} />
               </div>
             ) : isRunning ? (
               <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-3 border border-emerald-500/40 relative">
                 <motion.div 
                   animate={{ scale: [1, 1.25, 1] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute inset-0 bg-emerald-500/15 rounded-2xl"
                 />
                 <Terminal className="text-emerald-400 relative z-10" size={24} />
               </div>
             ) : isCompleted ? (
               <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-3 border border-emerald-500/40">
                 <CheckCircle2 className="text-emerald-400" size={24} />
               </div>
             ) : isFailed ? (
               <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-3 border border-rose-500/40">
                 <XCircle className="text-rose-400" size={24} />
               </div>
             ) : (
               <div className="w-14 h-14 bg-zinc-800/40 rounded-2xl flex items-center justify-center mb-3 border border-zinc-700">
                 <StopCircle className="text-zinc-400" size={24} />
               </div>
             )}
             
             <h3 className={`text-base font-black tracking-widest uppercase ${isQueued ? 'text-amber-400' : isRunning ? 'text-emerald-400' : isCompleted ? 'text-emerald-400' : isFailed ? 'text-rose-400' : 'text-zinc-400'}`}>
                {isQueued ? '[ PREPARANDO AUDITORIA ]' : 
                 isRunning ? '[ SCANNER ACTIVE ]' : 
                 isCompleted ? '[ AUDITORIA CONCLUÍDA ]' : 
                 isFailed ? '[ AUDITORIA FALHOU ]' : '[ SCAN CANCELADO ]'}
             </h3>
             <p className="text-xs text-zinc-300 font-medium mt-1">{getStatusText()}</p>
          </div>

          {/* Technological Neon Radar Sweep Visualizer */}
          {(isRunning || isQueued) && (
            <div className="relative w-36 h-36 flex items-center justify-center my-2">
              <div className="absolute inset-0 border border-emerald-500/30 rounded-full" />
              <div className="absolute inset-4 border border-emerald-500/20 rounded-full" />
              <div className="absolute inset-8 border border-emerald-500/10 rounded-full" />
              <div className="absolute inset-12 border border-emerald-500/5 rounded-full" />
              
              {/* Radar Sweep Arc */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute w-full h-full"
              >
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-1/2 bg-gradient-to-t from-emerald-400 to-transparent origin-bottom shadow-[0_0_8px_#34d399]" />
              </motion.div>

              {/* Central Pulse Indicator */}
              <motion.div 
                 animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] }}
                 transition={{ duration: 1.5, repeat: Infinity }}
                 className="w-10 h-10 bg-emerald-500/20 rounded-full"
              />
              <Zap size={20} className="text-emerald-400 relative z-10 animate-pulse" />
            </div>
          )}

          {/* Info Parameter Grid */}
          <div className="w-full grid grid-cols-2 gap-3 text-left border-t border-b border-zinc-800/80 py-3.5">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">TARGET</span>
              <p className="text-xs font-bold text-zinc-100 truncate">{job.target}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">PROFILE</span>
              <p className="text-xs font-bold text-emerald-400 uppercase">{job.type}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">TEMPO DE SCAN</span>
              <p className="text-xs font-bold text-cyan-300 font-mono">{formatTime(elapsed)}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">STATUS REAL</span>
              <p className={`text-xs font-bold ${isRunning ? 'text-emerald-400' : isCompleted ? 'text-emerald-400' : isFailed ? 'text-rose-400' : 'text-zinc-400'}`}>
                {isQueued ? 'QUEUED' : isRunning ? 'RUNNING' : job.status.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Completed Audit Summary */}
          {isCompleted && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 space-y-3"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">[ RESULTADOS ]</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${isHostUp ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-rose-950 text-rose-400 border-rose-800'}`}>
                   {isHostUp ? '[ HOST ONLINE ]' : '[ HOST NÃO ENCONTRADO ]'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                 <div>
                    <span className="text-lg font-bold text-emerald-400 font-mono">{openPortsCount}</span>
                    <span className="text-[8px] text-zinc-500 block uppercase font-bold">PORTAS ABERTAS</span>
                 </div>
                 <div className="border-x border-zinc-800">
                    <span className="text-lg font-bold text-cyan-400 font-mono">{servicesCount}</span>
                    <span className="text-[8px] text-zinc-500 block uppercase font-bold">SERVIÇOS</span>
                 </div>
                 <div>
                    <span className="text-lg font-bold text-purple-400 font-mono">{webServersCount}</span>
                    <span className="text-[8px] text-zinc-500 block uppercase font-bold">SERVIDORES WEB</span>
                 </div>
              </div>
            </motion.div>
          )}

          {/* Failure Alert Box */}
          {isFailed && (
            <div className="w-full p-3.5 bg-rose-950/30 border border-rose-900/60 rounded-2xl">
               <p className="text-xs text-rose-300 font-medium">
                 Não foi possível concluir a auditoria técnica.
               </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full pt-1">
            {isRunning && (
              <button 
                onClick={onCancel}
                className="w-full bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 p-3.5 rounded-2xl font-bold text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 uppercase"
              >
                <StopCircle size={16} /> [ CANCELAR SCAN ]
              </button>
            )}
            
            {(isCompleted || isFailed || isCancelled) && (
              <button 
                onClick={onViewDetails}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black p-3.5 rounded-2xl font-bold text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-950/50 uppercase"
              >
                <Shield size={16} /> [ VER DIAGNÓSTICO ]
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
