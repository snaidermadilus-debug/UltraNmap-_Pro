import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Clock, XCircle, CheckCircle2, AlertCircle, StopCircle, Zap, Search } from 'lucide-react';

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
    if (isQueued) return "Aguardando execução...";
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
    <div className="w-full max-w-md mx-auto p-4 space-y-6">
      {/* Main Status Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative"
      >
        {/* Radar Background Animation (only when running) */}
        <AnimatePresence>
          {(isRunning || isQueued) && (
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full"
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center">
                <div className="w-48 h-48 border border-blue-500/30 rounded-full animate-pulse" />
                <div className="absolute w-80 h-80 border border-blue-500/10 rounded-full" />
              </div>
            </div>
          )}
        </AnimatePresence>

        <div className="p-6 relative z-10 flex flex-col items-center text-center space-y-6">
          {/* Header Status */}
          <div className="flex flex-col items-center">
             {isQueued ? (
               <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-3 border border-amber-500/20 relative">
                 <motion.div 
                   animate={{ scale: [1, 1.15, 1] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute inset-0 bg-amber-500/10 rounded-full"
                 />
                 <Clock className="text-amber-400 relative z-10" size={28} />
               </div>
             ) : isRunning ? (
               <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-3 border border-blue-500/20 relative">
                 <motion.div 
                   animate={{ scale: [1, 1.2, 1] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute inset-0 bg-blue-500/10 rounded-full"
                 />
                 <Search className="text-blue-400 relative z-10" size={28} />
               </div>
             ) : isCompleted ? (
               <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3 border border-emerald-500/20">
                 <CheckCircle2 className="text-emerald-400" size={28} />
               </div>
             ) : isFailed ? (
               <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-3 border border-red-500/20">
                 <XCircle className="text-red-400" size={28} />
               </div>
             ) : (
               <div className="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center mb-3 border border-gray-500/20">
                 <StopCircle className="text-gray-400" size={28} />
               </div>
             )}
             
             <h3 className={`text-lg font-bold tracking-tight ${isQueued ? 'text-amber-400' : isRunning ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-gray-400'}`}>
                {isQueued ? 'Preparando auditoria' : 
                 isRunning ? '🔵 SCANNER ATIVO' : 
                 isCompleted ? '✓ Auditoria concluída' : 
                 isFailed ? '🔴 AUDITORIA FALHOU' : '⚪ SCAN CANCELADO'}
             </h3>
             <p className="text-sm text-gray-300 font-medium mt-1">{getStatusText()}</p>
          </div>

          {/* Progress Radar Visualization */}
          {(isRunning || isQueued) && (
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* Radar Circles */}
              <div className="absolute inset-0 border border-blue-500/20 rounded-full" />
              <div className="absolute inset-4 border border-blue-500/10 rounded-full" />
              <div className="absolute inset-8 border border-blue-500/5 rounded-full" />
              
              {/* Radar Sweep */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute w-full h-full"
              >
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1/2 bg-gradient-to-t from-blue-500 to-transparent origin-bottom" />
              </motion.div>

              {/* Central Pulse */}
              <motion.div 
                 animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
                 transition={{ duration: 1.5, repeat: Infinity }}
                 className="w-12 h-12 bg-blue-500/20 rounded-full"
              />
              <Zap size={24} className="text-blue-400 relative z-10 animate-pulse" />
            </div>
          )}

          {/* Info Grid */}
          <div className="w-full grid grid-cols-2 gap-4 text-left border-t border-b border-gray-800/60 py-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Alvo</span>
              <p className="text-sm font-mono text-white truncate">{job.target}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Perfil</span>
              <p className="text-sm font-semibold text-gray-200 uppercase">{job.type}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Tempo</span>
              <p className="text-sm font-mono text-white">{formatTime(elapsed)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Status</span>
              <p className={`text-sm font-bold ${isRunning ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-gray-400'}`}>
                {isQueued ? 'Em fila...' : isRunning ? 'Executando Nmap...' : job.status.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Results Summary (when completed) */}
          {isCompleted && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full bg-gray-950/50 border border-gray-800 rounded-2xl p-4 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resultado encontrado</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isHostUp ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-red-950/80 text-red-300 border-red-800'}`}>
                   {isHostUp ? '🟢 Host Online' : '🔴 Host não encontrado'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                 <div className="text-center">
                    <span className="text-xl font-bold text-emerald-400 font-mono">{openPortsCount}</span>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold">Portas Abertas</span>
                 </div>
                 <div className="text-center border-x border-gray-800/50">
                    <span className="text-xl font-bold text-blue-400 font-mono">{servicesCount}</span>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold">Serviços</span>
                 </div>
                 <div className="text-center">
                    <span className="text-xl font-bold text-purple-400 font-mono">{webServersCount}</span>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold">Servidores Web</span>
                 </div>
              </div>
            </motion.div>
          )}

          {/* Error Message (when failed) */}
          {isFailed && (
            <div className="w-full p-4 bg-red-950/20 border border-red-900/50 rounded-2xl">
               <p className="text-xs text-red-300 leading-relaxed font-semibold">
                 Não foi possível concluir a auditoria.
               </p>
            </div>
          )}

          {/* Actions */}
          <div className="w-full pt-2">
            {isRunning && (
              <button 
                onClick={onCancel}
                className="w-full bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/50 p-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
              >
                <StopCircle size={18} /> CANCELAR SCAN
              </button>
            )}
            
            {(isCompleted || isFailed || isCancelled) && (
              <button 
                onClick={onViewDetails}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-950/50 active:scale-95"
              >
                <Shield size={18} /> VER DIAGNÓSTICO
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Security Footer */}
      {(isRunning || isQueued) && (
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="flex items-center justify-center gap-2 text-gray-500"
        >
          <Shield size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Auditoria em conformidade Nmap</span>
        </motion.div>
      )}
    </div>
  );
}
