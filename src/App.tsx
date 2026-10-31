import { useState } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import Executions from './components/Executions';
import History from './components/History';
import Logs from './components/Logs';
import ScanDetails from './components/ScanDetails';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedJob, setSelectedJob] = useState(null);

  const handleSelectJob = (id: any) => {
    setSelectedJob(id);
    setActiveTab('details');
  };

  return (
    <div className="bg-gray-950 text-white min-h-screen pb-20">
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'scanner' && <Scanner setActiveTab={setActiveTab} />}
      {activeTab === 'executions' && <Executions />}
      {activeTab === 'history' && <History onSelect={handleSelectJob} />}
      {activeTab === 'logs' && <Logs />}
      {activeTab === 'details' && <ScanDetails id={selectedJob} />}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
