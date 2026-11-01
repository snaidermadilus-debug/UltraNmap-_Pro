import { useState } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import NetworkDiscovery from './components/NetworkDiscovery';
import Executions from './components/Executions';
import History from './components/History';
import Logs from './components/Logs';
import ScanDetails from './components/ScanDetails';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [prefilledTarget, setPrefilledTarget] = useState<string>('192.168.1.8');

  const handleSelectJob = (id: string) => {
    setSelectedJob(id);
    setActiveTab('details');
  };

  const handleSelectTargetFromNetwork = (target: string) => {
    setPrefilledTarget(target);
    setActiveTab('scanner');
  };

  return (
    <div className="bg-gray-950 text-white min-h-screen">
      <main>
        {activeTab === 'dashboard' && (
          <Dashboard setActiveTab={setActiveTab} onSelectJob={handleSelectJob} />
        )}

        {activeTab === 'scanner' && (
          <Scanner
            setActiveTab={setActiveTab}
            onSelectJob={handleSelectJob}
            initialTarget={prefilledTarget}
          />
        )}

        {activeTab === 'network' && (
          <NetworkDiscovery onSelectTarget={handleSelectTargetFromNetwork} />
        )}

        {activeTab === 'executions' && (
          <Executions onSelect={handleSelectJob} />
        )}

        {activeTab === 'history' && (
          <History onSelect={handleSelectJob} />
        )}

        {activeTab === 'logs' && <Logs />}

        {activeTab === 'details' && selectedJob && (
          <ScanDetails id={selectedJob} onBack={() => setActiveTab('history')} />
        )}
      </main>

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
