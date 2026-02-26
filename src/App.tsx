import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Handshake, 
  Calendar, 
  MessageSquare, 
  FileText, 
  BarChart3, 
  BookOpen, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Menu, 
  ChevronLeft, 
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  Folder,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Sun,
  Moon,
  Key,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { Page, Agent, Job, IntelItem, Note, APIProvider, AgentActivity, AgentWork, BoardroomSession, BoardroomMessage, BoardroomTask, Conversation, Message } from './types';
import { getMissionControlResponse, generateBoardroomSummary } from './services/geminiService';
import { jsPDF } from 'jspdf';

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  collapsed, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  collapsed: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
      active 
        ? 'bg-app-accent/20 text-app-accent border-r-2 border-app-accent' 
        : 'text-app-text/60 hover:bg-app-accent/10 hover:text-app-text'
    }`}
  >
    <Icon size={20} />
    {!collapsed && <span className="font-medium text-sm">{label}</span>}
  </button>
);

const Card = ({ children, title, subtitle, className = "", onClick }: { children: React.ReactNode, title?: string, subtitle?: string, className?: string, key?: any, onClick?: () => void }) => (
  <div onClick={onClick} className={`bg-app-card border border-app-border rounded-xl p-6 shadow-sm ${className}`}>
    {(title || subtitle) && (
      <div className="mb-4">
        {title && <h3 className="text-lg font-semibold text-app-text">{title}</h3>}
        {subtitle && <p className="text-sm text-app-text/50">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    online: 'bg-app-highlight/10 text-app-highlight border-app-highlight/20',
    busy: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    idle: 'bg-app-accent/10 text-app-accent border-app-accent/20',
    offline: 'bg-app-text/10 text-app-text/40 border-app-text/20',
    active: 'bg-app-highlight/10 text-app-highlight border-app-highlight/20',
    paused: 'bg-app-text/10 text-app-text/40 border-app-text/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[status] || colors.idle}`}>
      {status}
    </span>
  );
};

// --- Pages ---

const APIManagementPage = ({ providers, onUpdate }: { providers: APIProvider[], onUpdate: () => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [newProvider, setNewProvider] = useState<Partial<APIProvider>>({
    name: '',
    provider_type: 'openai',
    api_key: '',
    version: '',
    is_active: true
  });

  const handleImport = () => {
    try {
      const data = JSON.parse(importJson);
      setNewProvider({
        name: data.providerName || '',
        provider_type: 'other',
        api_key: data.auth?.apiKeySecretRef || '',
        version: data.modelId || data.version || '',
        is_active: true
      });
      setImportJson('');
    } catch (e) {
      alert('Invalid JSON payload');
    }
  };

  const handleSave = async () => {
    if (!newProvider.name || !newProvider.api_key) return;
    
    await fetch('/api/api-providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newProvider, id: Date.now().toString() })
    });
    
    setIsAdding(false);
    setNewProvider({ name: '', provider_type: 'openai', api_key: '', version: '', is_active: true });
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/api-providers/${id}`, { method: 'DELETE' });
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-app-text">API Provider Management</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-lg hover:opacity-80 transition-opacity font-medium"
        >
          <Plus size={18} />
          Add Provider
        </button>
      </div>

      {isAdding && (
        <Card title="Add New API Provider" className="border-app-accent/30 bg-app-accent/5">
          <div className="mb-6 p-4 bg-app-bg/50 border border-app-border rounded-xl">
            <label className="text-xs text-app-text/60 block mb-2 font-bold uppercase tracking-wider">Quick Import (JSON Payload)</label>
            <div className="flex gap-2">
              <textarea 
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"providerName": "GPT-4o", ...}'
                className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-2 text-xs text-app-text outline-none focus:border-app-accent font-mono h-20"
              />
              <button 
                onClick={handleImport}
                className="px-4 bg-app-card border border-app-border text-app-text text-xs font-bold rounded-lg hover:bg-app-bg transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-app-text/60">Provider Name (e.g., GPT-4o)</label>
              <input 
                type="text" 
                value={newProvider.name}
                onChange={(e) => setNewProvider({...newProvider, name: e.target.value})}
                className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-sm text-app-text outline-none focus:border-app-accent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-app-text/60">Type</label>
              <select 
                value={newProvider.provider_type}
                onChange={(e) => setNewProvider({...newProvider, provider_type: e.target.value as any})}
                className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-sm text-app-text outline-none focus:border-app-accent"
              >
                <option value="openai">OpenAI</option>
                <option value="google">Google Gemini</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-app-text/60">API Key (Protected)</label>
              <input 
                type="password" 
                value={newProvider.api_key}
                onChange={(e) => setNewProvider({...newProvider, api_key: e.target.value})}
                className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-sm text-app-text outline-none focus:border-app-accent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-app-text/60">Version / Model ID</label>
              <input 
                type="text" 
                value={newProvider.version}
                onChange={(e) => setNewProvider({...newProvider, version: e.target.value})}
                className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-sm text-app-text outline-none focus:border-app-accent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-app-text/60 hover:text-app-text">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-app-accent text-white rounded-lg font-bold">Save Provider</button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map(provider => (
          <Card key={provider.id}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-app-bg flex items-center justify-center text-app-accent border border-app-border">
                  <Key size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-app-text">{provider.name}</h4>
                  <p className="text-[10px] text-app-text/40 uppercase font-bold tracking-wider">{provider.provider_type}</p>
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${provider.is_active ? 'bg-app-highlight' : 'bg-app-text/20'}`} />
            </div>
            <div className="space-y-2 mb-4">
              <p className="text-xs text-app-text/60">Version: <span className="text-app-text">{provider.version || 'Latest'}</span></p>
              <p className="text-xs text-app-text/60">Key: <span className="text-app-text font-mono">••••••••••••••••</span></p>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-app-border">
              <button onClick={() => handleDelete(provider.id)} className="p-2 text-red-500/50 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ActivityLog = ({ activities }: { activities: AgentActivity[] }) => (
  <Card title="Agent Activity Log" subtitle="Real-time system feed">
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
      {activities.length > 0 ? activities.map(activity => (
        <div key={activity.id} className="flex gap-3 pb-3 border-b border-app-border last:border-0">
          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
            activity.status === 'success' ? 'bg-emerald-500' : 
            activity.status === 'error' ? 'bg-red-500' : 'bg-app-accent'
          }`} />
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-app-text">{activity.agent_name}</p>
              <p className="text-[10px] text-app-text/30 font-mono">{new Date(activity.timestamp).toLocaleTimeString()}</p>
            </div>
            <p className="text-sm text-app-text/70 mt-1">{activity.activity}</p>
          </div>
        </div>
      )) : <p className="text-sm text-app-text/40 italic">No recent activity recorded.</p>}
    </div>
  </Card>
);

const WorkspacesPage = ({ agents, work }: { agents: Agent[], work: AgentWork[] }) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedSubfolder, setSelectedSubfolder] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<AgentWork | null>(null);

  const filteredWork = work.filter(w => {
    const matchesAgent = selectedAgent ? w.agent_id === selectedAgent : true;
    const matchesSubfolder = selectedSubfolder ? w.folder_path.includes(selectedSubfolder) : true;
    return matchesAgent && matchesSubfolder;
  });

  const handleDownload = async (file: AgentWork) => {
    if (file.file_name.toLowerCase().endsWith('.pdf')) {
      const doc = new jsPDF();
      const content = file.content || 'No content available.';
      
      // Basic PDF generation logic
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(content, 180);
      doc.text(splitText, 15, 20);
      doc.save(file.file_name);
    } else {
      const blob = new Blob([file.content || ''], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const subfolders = [
    { id: 'reports', name: 'Reports', icon: FileText },
    { id: 'drafts', name: 'Drafts', icon: FileText },
    { id: 'data', name: 'Raw Data', icon: FileText },
    { id: 'logs', name: 'Execution Logs', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-app-text">Agent Workspaces</h2>
        <div className="flex gap-2">
          <select 
            className="bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text outline-none focus:border-app-accent"
            onChange={(e) => {
              setSelectedAgent(e.target.value || null);
              setSelectedSubfolder(null);
            }}
          >
            <option value="">All Agents</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card title="Agent Folders">
            <div className="space-y-1">
              {agents.map(agent => (
                <div key={agent.id} className="space-y-1">
                  <button 
                    onClick={() => {
                      if (selectedAgent === agent.id) {
                        setSelectedAgent(null);
                      } else {
                        setSelectedAgent(agent.id);
                      }
                      setSelectedSubfolder(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      selectedAgent === agent.id && !selectedSubfolder ? 'bg-app-accent/20 text-app-accent' : 'hover:bg-app-bg text-app-text/60'
                    }`}
                  >
                    <Folder size={16} />
                    <span className="text-sm font-bold flex-1 text-left">{agent.name}</span>
                    {selectedAgent === agent.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  
                  {selectedAgent === agent.id && (
                    <div className="pl-6 space-y-1">
                      {subfolders.map(sub => (
                        <button 
                          key={sub.id}
                          onClick={() => setSelectedSubfolder(sub.id)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                            selectedSubfolder === sub.id ? 'bg-app-accent/10 text-app-accent' : 'hover:bg-app-bg text-app-text/40'
                          }`}
                        >
                          <sub.icon size={12} />
                          <span>{sub.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="md:col-span-3 space-y-4">
          <Card title={
            selectedAgent 
              ? `${agents.find(a => a.id === selectedAgent)?.name}${selectedSubfolder ? ` / ${selectedSubfolder}` : ''}` 
              : "All Recent Files"
          }>
            <div className="space-y-3">
              {filteredWork.length > 0 ? filteredWork.map(file => (
                <div key={file.id} className="p-4 bg-app-bg/30 border border-app-border rounded-xl flex items-center justify-between group hover:border-app-accent/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-app-card flex items-center justify-center text-app-text/40">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-app-text">{file.file_name}</p>
                      <p className="text-[10px] text-app-text/40">{file.folder_path} • {new Date(file.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setViewingFile(file)}
                      className="px-3 py-1.5 text-xs font-bold text-app-accent border border-app-accent/20 rounded-lg hover:bg-app-accent hover:text-white"
                    >
                      VIEW
                    </button>
                    <button 
                      onClick={() => handleDownload(file)}
                      className="px-3 py-1.5 text-xs font-bold text-app-text/40 border border-app-border rounded-lg hover:bg-app-bg"
                    >
                      DOWNLOAD
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-app-bg rounded-full flex items-center justify-center mx-auto mb-4 text-app-text/20">
                    <FileText size={32} />
                  </div>
                  <p className="text-app-text/40 text-sm">No files found in this workspace.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {viewingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingFile(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-app-card border border-app-border rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col relative z-10 shadow-2xl"
            >
              <div className="p-4 border-b border-app-border flex items-center justify-between bg-app-sidebar">
                <div className="flex items-center gap-3">
                  <FileText className="text-app-accent" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-app-text">{viewingFile.file_name}</h3>
                    <p className="text-[10px] text-app-text/40">{viewingFile.folder_path}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingFile(null)}
                  className="p-2 text-app-text/40 hover:text-app-text transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-app-bg">
                <pre className="text-xs text-app-text/80 font-mono whitespace-pre-wrap leading-relaxed">
                  {viewingFile.content || 'No content available.'}
                </pre>
              </div>
              <div className="p-4 border-t border-app-border bg-app-sidebar flex justify-end gap-3">
                <button 
                  onClick={() => handleDownload(viewingFile)}
                  className="px-4 py-2 bg-app-accent text-white text-xs font-bold rounded-lg hover:opacity-80 transition-opacity"
                >
                  Download File
                </button>
                <button 
                  onClick={() => setViewingFile(null)}
                  className="px-4 py-2 bg-app-bg border border-app-border text-app-text/60 text-xs font-bold rounded-lg hover:text-app-text transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Dashboard = ({ agents, jobs, onNavigate }: { agents: Agent[], jobs: Job[], onNavigate: (page: Page) => void }) => {
  const activeJobs = jobs.filter(j => j.status === 'active');

  const apiUsageData = [
    { time: '00:00', usage: 12 },
    { time: '04:00', usage: 8 },
    { time: '08:00', usage: 45 },
    { time: '12:00', usage: 82 },
    { time: '16:00', usage: 65 },
    { time: '20:00', usage: 30 },
    { time: '23:59', usage: 15 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Today's Automations" subtitle="Status of scheduled runs">
          <div className="space-y-3">
            {activeJobs.length > 0 ? activeJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-app-bg/30 rounded-lg border border-app-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-app-highlight animate-pulse" />
                  <span className="text-sm font-medium text-app-text">{job.name}</span>
                </div>
                <StatusBadge status="active" />
              </div>
            )) : <p className="text-app-text/50 text-sm italic">No active jobs running.</p>}
          </div>
        </Card>

        <Card title="Key Metrics" subtitle="Performance overview">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-app-bg/30 rounded-lg border border-app-border/50">
              <p className="text-xs text-app-text/50 uppercase font-bold tracking-wider mb-1">Success Rate</p>
              <p className="text-2xl font-mono text-app-highlight">98.2%</p>
            </div>
            <div className="p-4 bg-app-bg/30 rounded-lg border border-app-border/50">
              <p className="text-xs text-app-text/50 uppercase font-bold tracking-wider mb-1">Total Cost</p>
              <p className="text-2xl font-mono text-app-accent">$12.45</p>
            </div>
          </div>
        </Card>

        <Card title="Bottleneck Panel" subtitle="Where you are needed" className="border-amber-500/20 bg-amber-500/5">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-200">3 Drafts Pending</p>
                <p className="text-xs text-amber-500/70">Content Writer is waiting for approval on "Q1 Strategy".</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="API Usage Over Time" subtitle="Requests processed per hour">
            <div className="h-[240px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={apiUsageData}>
                  <defs>
                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#ffffff40', fontSize: 10 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#ffffff40', fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1b1e', border: '1px solid #ffffff10', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981', fontSize: '12px' }}
                    labelStyle={{ color: '#ffffff60', fontSize: '10px', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="usage" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorUsage)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title="Mission Control AI Suggestions">
            <div className="flex items-start gap-4 p-4 bg-app-accent/10 rounded-xl border border-app-accent/20">
              <Zap size={20} className="text-app-accent mt-1" />
              <div className="space-y-2">
                <p className="text-app-text leading-relaxed text-sm">
                  "Anwar, the **Research Specialist** has completed the competitor analysis for 'Project X'. 
                  I suggest running a **Boardroom meeting** with the **Content Writer** to turn these insights into a blog series."
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onNavigate('boardroom')}
                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-app-accent text-white rounded-lg hover:opacity-80 transition-opacity"
                  >
                    Start Boardroom
                  </button>
                  <button 
                    onClick={() => onNavigate('intel')}
                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-app-bg text-app-text/80 rounded-lg hover:opacity-80 transition-opacity border border-app-border"
                  >
                    View Intel
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Boardroom = ({ agents }: { agents: Agent[] }) => {
  const [sessions, setSessions] = useState<BoardroomSession[]>([]);
  const [currentSession, setCurrentSession] = useState<BoardroomSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [tasks, setTasks] = useState<BoardroomTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [boardMessages, setBoardMessages] = useState<BoardroomMessage[]>([]);
  const [boardInput, setBoardInput] = useState('');
  const [isBoardThinking, setIsBoardThinking] = useState(false);

  const [meetingForm, setMeetingForm] = useState({ title: '', date: '', time: '' });

  const fetchData = async () => {
    try {
      const sessionsRes = await fetch('/api/boardroom/sessions');
      const sessionsData = await sessionsRes.json();
      setSessions(sessionsData);

      let activeSession = sessionsData[0];
      if (sessionsData.length === 0) {
        // Create default session if none exists
        const defaultSession = {
          id: 'q1-growth',
          title: 'Q1 Growth Strategy',
          date: new Date().toISOString().split('T')[0],
          time: '10:00'
        };
        await fetch('/api/boardroom/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultSession)
        });
        activeSession = defaultSession;
        setSessions([defaultSession]);
      }
      
      if (!currentSession) {
        setCurrentSession(activeSession);
      }

      const tasksRes = await fetch('/api/boardroom/tasks');
      const tasksData = await tasksRes.json();
      setTasks(tasksData.map((t: any) => ({ ...t, completed: !!t.completed })));
    } catch (error) {
      console.error("Error fetching boardroom data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (currentSession) {
        const messagesRes = await fetch(`/api/boardroom/messages/${currentSession.id}`);
        const messagesData = await messagesRes.json();
        
        if (messagesData.length === 0 && currentSession.id === 'q1-growth') {
          // Add initial messages for default session
          const initialMessages = [
            { id: '1', session_id: 'q1-growth', role: 'agent', name: 'Tom', content: '"Team, we need to increase our activation rate by 15% this month. Researcher, what are the current bottlenecks?"' },
            { id: '2', session_id: 'q1-growth', role: 'agent', name: 'Researcher (Specialist)', content: '"Analysis shows that users drop off at the \'API Integration\' step. 40% of users don\'t complete the setup."' }
          ];
          for (const msg of initialMessages) {
            await fetch('/api/boardroom/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msg)
            });
          }
          setBoardMessages(initialMessages as any);
        } else {
          setBoardMessages(messagesData);
        }
      }
    };
    fetchMessages();
  }, [currentSession]);

  const handleScheduleMeeting = async () => {
    if (!meetingForm.title || !meetingForm.date) return;
    
    const newSession = {
      id: Date.now().toString(),
      title: meetingForm.title,
      date: meetingForm.date,
      time: meetingForm.time
    };

    await fetch('/api/boardroom/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession)
    });

    setIsScheduling(false);
    setMeetingForm({ title: '', date: '', time: '' });
    fetchData();
    setCurrentSession(newSession);
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    const transcript = boardMessages.map(m => `${m.name}: ${m.content}`).join('\n');
    const data = await generateBoardroomSummary(transcript);
    if (data) setSummaryData(data);
    setIsGenerating(false);
  };

  const handleSendToBoard = async () => {
    if (!boardInput.trim() || isBoardThinking || !currentSession) return;

    const userMsg = { 
      id: Date.now().toString(), 
      session_id: currentSession.id,
      role: 'user' as const, 
      name: 'Anwar', 
      content: boardInput 
    };
    
    await fetch('/api/boardroom/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userMsg)
    });

    setBoardMessages(prev => [...prev, userMsg]);
    setBoardInput('');
    setIsBoardThinking(true);

    try {
      const response = await getMissionControlResponse(boardInput, { boardMessages: boardMessages.slice(-5) });
      const agentMsg = { 
        id: (Date.now() + 1).toString(), 
        session_id: currentSession.id,
        role: 'agent' as const, 
        name: 'Tom', 
        content: response || "Understood." 
      };
      
      await fetch('/api/boardroom/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentMsg)
      });

      setBoardMessages(prev => [...prev, agentMsg]);
    } catch (error) {
      console.error("Board Chat Error:", error);
    } finally {
      setIsBoardThinking(false);
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updatedTask = { ...task, completed: !task.completed };
    
    await fetch('/api/boardroom/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTask)
    });
    
    setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
  };

  const addTask = async () => {
    if (!newTaskText.trim()) return;
    const newTask = { 
      id: Date.now().toString(), 
      session_id: currentSession?.id,
      text: newTaskText, 
      completed: false 
    };

    await fetch('/api/boardroom/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    });

    setTasks(prev => [newTask, ...prev]);
    setNewTaskText('');
  };

  const handleConvertTask = async (text: string) => {
    const newTask = { 
      id: Date.now().toString(), 
      session_id: currentSession?.id,
      text: text, 
      completed: false 
    };
    await fetch('/api/boardroom/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    });
    setTasks(prev => [newTask, ...prev]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-app-text">Boardroom</h2>
          {sessions.length > 0 && (
            <select 
              value={currentSession?.id || ''}
              onChange={(e) => {
                const session = sessions.find(s => s.id === e.target.value);
                if (session) setCurrentSession(session);
              }}
              className="bg-app-card border border-app-border rounded-lg px-3 py-1.5 text-sm text-app-text outline-none focus:border-app-accent"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleGenerateSummary}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-app-card border border-app-border text-app-text rounded-lg hover:bg-app-bg transition-colors font-medium disabled:opacity-50"
          >
            <Zap size={18} className={isGenerating ? "animate-pulse" : ""} />
            {isGenerating ? "Analyzing..." : "Generate AI Summary"}
          </button>
          <button 
            onClick={() => setIsScheduling(!isScheduling)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${isScheduling ? 'bg-app-bg border border-app-border text-app-text' : 'bg-app-accent text-white hover:opacity-80'}`}
          >
            {isScheduling ? <X size={18} /> : <Plus size={18} />}
            {isScheduling ? "Cancel" : "Schedule Meeting"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isScheduling && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card title="Schedule New Boardroom Session" className="border-app-accent/30 bg-app-accent/5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-app-text/60">Meeting Title</label>
                  <input 
                    type="text" 
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm({...meetingForm, title: e.target.value})}
                    placeholder="e.g. Q2 Strategy Review"
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-app-text/60">Date</label>
                  <input 
                    type="date" 
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({...meetingForm, date: e.target.value})}
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-app-text/60">Time</label>
                  <div className="flex gap-2">
                    <input 
                      type="time" 
                      value={meetingForm.time}
                      onChange={(e) => setMeetingForm({...meetingForm, time: e.target.value})}
                      className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none"
                    />
                    <button 
                      onClick={handleScheduleMeeting}
                      className="px-4 bg-app-accent text-white font-bold rounded-lg hover:opacity-80 transition-opacity"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title={`Active Session: ${currentSession?.title || 'Loading...'}`} subtitle="Main Agent + 2 Specialists">
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {boardMessages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${msg.role === 'user' ? 'bg-app-highlight text-white' : 'bg-app-accent text-white'}`}>
                    {msg.name[0]}
                  </div>
                  <div className={`p-3 rounded-lg rounded-tl-none border border-app-border/50 ${msg.role === 'user' ? 'bg-app-highlight/10' : 'bg-app-bg/50'}`}>
                    <p className={`text-xs font-bold mb-1 ${msg.role === 'user' ? 'text-app-highlight' : 'text-app-accent'}`}>{msg.name}</p>
                    <p className="text-sm text-app-text">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isBoardThinking && (
                <div className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-app-accent/20" />
                  <div className="h-12 w-48 bg-app-bg/50 rounded-lg" />
                </div>
              )}
            </div>
            <div className="mt-6 pt-6 border-t border-app-border">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendToBoard(); }}
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  value={boardInput}
                  onChange={(e) => setBoardInput(e.target.value)}
                  placeholder="Ask the board..." 
                  className="flex-1 bg-app-bg border border-app-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-app-accent transition-colors"
                  disabled={isBoardThinking}
                />
                <button 
                  type="submit"
                  disabled={isBoardThinking || !boardInput.trim()}
                  className="px-4 py-2 bg-app-accent text-white rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </Card>

          {summaryData && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card title="AI Meeting Summary" subtitle="Quantifiable metrics & Action items">
                <div className="space-y-6">
                  <p className="text-sm text-app-text/80 leading-relaxed italic border-l-2 border-app-accent pl-4">
                    {summaryData.summary}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {summaryData.metrics.map((m: any, idx: number) => (
                      <div key={idx} className="p-3 bg-app-bg/50 border border-app-border rounded-lg">
                        <p className="text-[10px] text-app-text/40 uppercase font-bold mb-1">{m.label}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-mono text-app-accent">{m.value}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            m.trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 
                            m.trend === 'down' ? 'bg-red-500/10 text-red-500' : 
                            'bg-zinc-500/10 text-zinc-500'
                          }`}>
                            {m.trend.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-app-text/40 uppercase tracking-widest">Action Items</h4>
                    {summaryData.actionItems.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-app-card border border-app-border rounded-lg group hover:border-app-accent/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            item.priority === 'high' ? 'bg-red-500' : 
                            item.priority === 'medium' ? 'bg-amber-500' : 
                            'bg-blue-500'
                          }`} />
                          <div>
                            <p className="text-sm text-app-text font-medium">{item.task}</p>
                            <p className="text-[10px] text-app-text/40">Assignee: {item.assignee}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleConvertTask(item.task)}
                          className="text-[10px] font-bold text-app-accent opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          CONVERT TO TASK
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Decisions & Tasks">
            <div className="space-y-3">
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => toggleTask(task.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    task.completed 
                      ? 'bg-app-highlight/5 border-app-highlight/20 opacity-60' 
                      : 'bg-app-bg/30 border-app-border/50 hover:border-app-accent/30'
                  }`}
                >
                  {task.completed ? (
                    <CheckCircle2 size={16} className="text-app-highlight" />
                  ) : (
                    <div className="w-4 h-4 rounded border border-app-text/20" />
                  )}
                  <span className={`text-sm ${task.completed ? 'text-app-text line-through' : 'text-app-text'}`}>
                    {task.text}
                  </span>
                </div>
              ))}
              
              <div className="pt-2">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                    placeholder="New task..."
                    className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-app-accent"
                  />
                  <button 
                    onClick={addTask}
                    className="p-1.5 bg-app-accent text-white rounded-lg hover:opacity-80"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Participants">
            <div className="space-y-3">
              {agents.map(a => (
                <div key={a.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${a.status === 'online' ? 'bg-app-highlight' : 'bg-app-text/20'}`} />
                    <span className="text-sm text-app-text">{a.name}</span>
                  </div>
                  <span className="text-[10px] text-app-text/50 uppercase font-bold">{a.role.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const JobsPage = ({ jobs, providers, onUpdate }: { jobs: Job[], providers: APIProvider[], onUpdate: () => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [newJob, setNewJob] = useState({ name: '', schedule: '', cost: '0.00' });

  const handleProviderChange = async (job: Job, providerId: string) => {
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...job, 
        api_provider_id: providerId,
        agent_ids: JSON.stringify(job.agent_ids) 
      })
    });
    onUpdate();
  };

  const handleToggleStatus = async (job: Job) => {
    const newStatus = job.status === 'active' ? 'paused' : 'active';
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...job, 
        status: newStatus,
        agent_ids: JSON.stringify(job.agent_ids) 
      })
    });
    onUpdate();
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    // Note: server.ts doesn't have a DELETE /api/jobs/:id route yet, 
    // but we can simulate it or add it. For now, let's assume it exists or we'll add it.
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    onUpdate();
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.name || !newJob.schedule) return;

    const jobData = {
      id: editingJob ? editingJob.id : `j${Date.now()}`,
      name: newJob.name,
      schedule: newJob.schedule,
      cost: parseFloat(newJob.cost),
      status: editingJob ? editingJob.status : 'active',
      agent_ids: editingJob ? JSON.stringify(editingJob.agent_ids) : '[]',
      last_run: editingJob ? editingJob.last_run : 'Never'
    };

    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData)
    });

    setNewJob({ name: '', schedule: '', cost: '0.00' });
    setIsAdding(false);
    setEditingJob(null);
    onUpdate();
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setNewJob({ 
      name: job.name, 
      schedule: job.schedule, 
      cost: job.cost.toString() 
    });
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-app-text">Jobs & Schedules</h2>
        <button 
          onClick={() => {
            if (isAdding) {
              setEditingJob(null);
              setNewJob({ name: '', schedule: '', cost: '0.00' });
            }
            setIsAdding(!isAdding);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${isAdding ? 'bg-app-bg border border-app-border text-app-text' : 'bg-app-accent text-white hover:opacity-80'}`}
        >
          {isAdding ? <X size={18} /> : <Plus size={18} />}
          {isAdding ? 'Cancel' : 'New Job'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card title={editingJob ? `Edit Job: ${editingJob.name}` : "Configure New Automation"} className="border-app-accent/30 bg-app-accent/5">
              <form onSubmit={handleAddJob} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-app-text/60 uppercase font-bold">Job Name</label>
                  <input 
                    type="text" 
                    value={newJob.name}
                    onChange={e => setNewJob({...newJob, name: e.target.value})}
                    placeholder="e.g. Daily Report"
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-app-text/60 uppercase font-bold">Cron Schedule</label>
                  <input 
                    type="text" 
                    value={newJob.schedule}
                    onChange={e => setNewJob({...newJob, schedule: e.target.value})}
                    placeholder="0 2 * * *"
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-app-text/60 uppercase font-bold">Estimated Cost ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newJob.cost}
                    onChange={e => setNewJob({...newJob, cost: e.target.value})}
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none"
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <button 
                    type="submit"
                    className="w-full py-2 bg-app-accent text-white font-bold rounded-lg hover:opacity-80 transition-opacity"
                  >
                    {editingJob ? 'Update Job' : 'Schedule Job'}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {jobs.map(job => (
          <Card key={job.id} className="hover:border-app-accent/30 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => handleToggleStatus(job)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${job.status === 'active' ? 'bg-app-highlight/10 text-app-highlight hover:bg-app-highlight/20' : 'bg-app-bg text-app-text/40 hover:bg-app-border/30'}`}
                >
                  <Calendar size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-app-text">{job.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-app-text/50 flex items-center gap-1">
                      <Clock size={12} /> {job.schedule}
                    </span>
                    <span className="text-xs text-app-text/50 flex items-center gap-1">
                      <BarChart3 size={12} /> ${job.cost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block mr-4">
                  <p className="text-[10px] text-app-text/40 uppercase font-bold tracking-wider mb-1">API Provider</p>
                  <select 
                    value={job.api_provider_id || ''}
                    onChange={(e) => handleProviderChange(job, e.target.value)}
                    className="bg-app-bg border border-app-border rounded px-2 py-1 text-[10px] text-app-text outline-none focus:border-app-accent"
                  >
                    <option value="">Default</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-app-text/50 uppercase font-bold tracking-wider">Last Run</p>
                  <p className="text-xs text-app-text/80">{job.last_run || 'Never'}</p>
                </div>
                <div onClick={() => handleToggleStatus(job)} className="cursor-pointer">
                  <StatusBadge status={job.status} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditJob(job)}
                    className="p-2 text-app-text/40 hover:text-app-text transition-colors"
                    title="Edit Job"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteJob(job.id)}
                    className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                    title="Delete Job"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ConversationsPage = ({ agents }: { agents: Agent[] }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      setConversations(data);
      
      if (data.length === 0 && agents.length > 0) {
        // Create initial conversations for agents if none exist
        const initialConvs = agents.slice(0, 3).map(agent => ({
          id: `conv_${agent.id}`,
          agent_id: agent.id,
          last_message: null
        }));
        
        for (const conv of initialConvs) {
          await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(conv)
          });
        }
        const updatedRes = await fetch('/api/conversations');
        const updatedData = await updatedRes.json();
        setConversations(updatedData);
        if (updatedData.length > 0) setActiveConversationId(updatedData[0].id);
      } else if (data.length > 0 && !activeConversationId) {
        setActiveConversationId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/messages/${convId}`);
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [agents]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId]);

  const filteredConversations = conversations.filter(c => 
    (c.agent_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.last_message || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending || !activeConversationId || !activeConversation) return;

    const userMessage = { 
      id: Date.now().toString(), 
      conversation_id: activeConversationId,
      agent_id: activeConversation.agent_id,
      role: 'user' as const, 
      content: inputValue 
    };
    
    setMessages(prev => [...prev, userMessage as any]);
    setInputValue('');
    setIsSending(true);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMessage)
      });

      const response = await getMissionControlResponse(inputValue, { messages: messages.slice(-5) });
      const assistantMessage = { 
        id: (Date.now() + 1).toString(), 
        conversation_id: activeConversationId,
        agent_id: activeConversation.agent_id,
        role: 'assistant' as const, 
        content: response || "I'm not sure how to respond to that." 
      };

      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assistantMessage)
      });

      setMessages(prev => [...prev, assistantMessage as any]);
      fetchConversations(); // Refresh last message in list
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleHandshake = async () => {
    if (!activeConversation || !activeConversationId || isSending) return;
    
    const handshakeMsg = "Re-sync. Confirm role, status, and readiness.";
    const userMsg = { 
      id: Date.now().toString(), 
      conversation_id: activeConversationId,
      agent_id: activeConversation.agent_id,
      role: 'user' as const, 
      content: handshakeMsg 
    };
    
    setMessages(prev => [...prev, userMsg as any]);
    setIsSending(true);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMsg)
      });

      const response = await getMissionControlResponse(handshakeMsg, { 
        messages: messages.slice(-5),
        system_instruction: "The user is re-syncing. Confirm your role, status, and readiness briefly."
      });
      
      const assistantMessage = { 
        id: (Date.now() + 1).toString(), 
        conversation_id: activeConversationId,
        agent_id: activeConversation.agent_id,
        role: 'assistant' as const, 
        content: response || "System re-synced. Ready for instructions." 
      };

      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assistantMessage)
      });

      setMessages(prev => [...prev, assistantMessage as any]);
      fetchConversations();
    } catch (error) {
      console.error("Handshake Error:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCalendar = async () => {
    if (!activeConversation) return;
    
    const jobName = `Follow-up: ${activeConversation.agent_name}`;
    const newJob = {
      id: `j${Date.now()}`,
      name: jobName,
      agent_ids: JSON.stringify([activeConversation.agent_id]),
      schedule: '0 9 * * *',
      status: 'active',
      cost: 0.05,
      last_run: 'Never'
    };

    try {
      await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob)
      });
      alert(`Scheduled follow-up task: ${jobName}`);
    } catch (error) {
      console.error("Scheduling Error:", error);
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeConversationId || !confirm('Delete this conversation permanently?')) return;
    await fetch(`/api/conversations/${activeConversationId}`, { method: 'DELETE' });
    setConversations(prev => prev.filter(c => c.id !== activeConversationId));
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleRefreshChat = async () => {
    if (activeConversationId) {
      await fetchMessages(activeConversationId);
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className="h-auto lg:h-[calc(100vh-12rem)] flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-80 bg-app-sidebar border border-app-border rounded-xl overflow-hidden flex flex-col h-[300px] lg:h-full shadow-sm">
        <div className="p-4 border-b border-app-border">
          <input 
            type="text" 
            placeholder="Search conversations..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-app-accent"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? filteredConversations.map(conv => (
            <button 
              key={conv.id} 
              onClick={() => setActiveConversationId(conv.id)}
              className={`w-full p-4 text-left border-b border-app-border/50 hover:bg-app-accent/5 transition-colors ${conv.id === activeConversationId ? 'bg-app-accent/10 border-l-2 border-l-app-accent' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-bold text-app-text">{conv.agent_name}</span>
                <span className="text-[10px] text-app-text/40">{new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs text-app-text/50 truncate">{conv.last_message || 'No messages yet'}</p>
            </button>
          )) : (
            <div className="p-8 text-center">
              <p className="text-xs text-app-text/40 italic">No conversations found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 bg-app-sidebar border border-app-border rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-app-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-app-accent flex items-center justify-center text-xs font-bold text-white">
              {activeConversation?.agent_name?.[0] || 'A'}
            </div>
            <div>
              <h4 className="text-sm font-bold text-app-text">{activeConversation?.agent_name || 'Select Agent'}</h4>
              <p className="text-[10px] text-app-highlight font-bold uppercase tracking-widest">Online</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleRefreshChat}
              className="p-2 text-app-text/40 hover:text-app-text hover:bg-app-bg rounded-lg transition-colors"
              title="Refresh Conversation"
            >
              <RefreshCw size={18} />
            </button>
            <button 
              onClick={handleDeleteConversation}
              className="p-2 text-app-text/40 hover:text-app-text hover:bg-app-bg rounded-lg transition-colors"
              title="Delete Conversation"
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={handleHandshake}
              className="p-2 text-app-text/40 hover:text-app-text hover:bg-app-bg rounded-lg transition-colors"
              title="Collaborate in Boardroom"
            >
              <Handshake size={18} />
            </button>
            <button 
              onClick={handleCalendar}
              className="p-2 text-app-text/40 hover:text-app-text hover:bg-app-bg rounded-lg transition-colors"
              title="Schedule Task"
            >
              <Calendar size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${msg.role === 'user' ? 'bg-app-highlight' : 'bg-app-accent'}`}>
                {msg.role === 'user' ? 'A' : (activeConversation?.agent_name?.[0] || 'J')}
              </div>
              <div className={`p-4 rounded-2xl border border-app-border max-w-lg ${msg.role === 'user' ? 'bg-app-highlight/10 rounded-tr-none' : 'bg-app-bg rounded-tl-none'}`}>
                <p className="text-sm text-app-text whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[10px] text-app-text/30 mt-2 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-app-accent flex-shrink-0 flex items-center justify-center text-xs font-bold text-white animate-pulse">
                {activeConversation?.agent_name?.[0] || 'J'}
              </div>
              <div className="bg-app-bg p-4 rounded-2xl rounded-tl-none border border-app-border">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-app-text/40 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-app-text/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-app-text/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 bg-app-bg/50 border-t border-app-border">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex gap-2"
          >
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..." 
              className="flex-1 bg-app-sidebar border border-app-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-app-accent"
              disabled={isSending || !activeConversationId}
            />
            <button 
              type="submit"
              disabled={isSending || !inputValue.trim() || !activeConversationId}
              className="px-4 py-2 bg-app-accent text-white rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const IntelPage = () => {
  const [intel, setIntel] = useState<IntelItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedIntel, setSelectedIntel] = useState<IntelItem | null>(null);
  const [loading, setLoading] = useState(true);

  const categories = ['Frameworks', 'Research', 'Campaigns', 'Onboarding'];

  useEffect(() => {
    fetchIntel();
  }, []);

  const fetchIntel = async () => {
    try {
      const res = await fetch('/api/intel');
      const data = await res.json();
      setIntel(data);
    } catch (error) {
      console.error("Error fetching intel:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIntel = activeCategory 
    ? intel.filter(item => item.category === activeCategory)
    : intel;

  const handleExportPDF = () => {
    if (!selectedIntel) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Title
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text(selectedIntel.title, margin, yPos);
    yPos += 15;

    // Category
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`CATEGORY: ${selectedIntel.category.toUpperCase()}`, margin, yPos);
    yPos += 10;

    // Divider
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Content Header
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text("Summary & Content:", margin, yPos);
    yPos += 10;

    // Content Body
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate-600
    const splitContent = doc.splitTextToSize(selectedIntel.summary, pageWidth - (margin * 2));
    doc.text(splitContent, margin, yPos);
    yPos += (splitContent.length * 5) + 20;

    // Metadata
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Created On: ${new Date(selectedIntel.created_at).toLocaleString()}`, margin, yPos);
    yPos += 7;

    let agentIds = [];
    try {
      agentIds = typeof selectedIntel.agent_ids === 'string' ? JSON.parse(selectedIntel.agent_ids) : selectedIntel.agent_ids;
    } catch (e) {}
    
    if (Array.isArray(agentIds) && agentIds.length > 0) {
      doc.text(`Source Agents: ${agentIds.map(id => `Agent ${id}`).join(', ')}`, margin, yPos);
    }

    // Save
    const fileName = selectedIntel.title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.pdf';
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-app-text">Intel & Docs</h2>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 border rounded-lg text-xs transition-colors ${!activeCategory ? 'bg-app-accent text-white border-app-accent' : 'bg-app-card border-app-border text-app-text/60 hover:text-app-text'}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 border rounded-lg text-xs transition-colors ${activeCategory === cat ? 'bg-app-accent text-white border-app-accent' : 'bg-app-card border-app-border text-app-text/60 hover:text-app-text'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-app-card border border-app-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntel.map(item => (
            <Card 
              key={item.id} 
              onClick={() => setSelectedIntel(item)}
              className="group cursor-pointer hover:border-app-accent/30 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-app-accent/10 rounded-lg text-app-accent">
                  <FileText size={20} />
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-app-bg text-app-text/50 rounded-full font-bold uppercase">{item.category}</span>
              </div>
              <h4 className="font-bold text-app-text mb-2 group-hover:text-app-accent transition-colors">{item.title}</h4>
              <p className="text-xs text-app-text/50 line-clamp-2 mb-4">{item.summary}</p>
              <div className="flex items-center justify-between pt-4 border-t border-app-border/50">
                <span className="text-[10px] text-app-text/40 font-mono">{new Date(item.created_at).toLocaleDateString()}</span>
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-app-accent border-2 border-app-sidebar flex items-center justify-center text-[8px] font-bold text-white">AI</div>
                </div>
              </div>
            </Card>
          ))}
          {filteredIntel.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <p className="text-app-text/40 italic">No documents found in this category.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedIntel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-app-sidebar border border-app-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-app-border flex justify-between items-center bg-app-card/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-app-accent/10 rounded-lg text-app-accent">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-app-text">{selectedIntel.title}</h3>
                    <span className="text-[10px] px-2 py-0.5 bg-app-bg text-app-text/50 rounded-full font-bold uppercase">{selectedIntel.category}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedIntel(null)}
                  className="p-2 hover:bg-app-bg rounded-lg text-app-text/40 hover:text-app-text transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 p-8 overflow-y-auto space-y-6">
                <div className="space-y-2">
                  <h5 className="text-[10px] text-app-text/40 font-bold uppercase tracking-widest">Summary & Content</h5>
                  <div className="text-sm text-app-text leading-relaxed whitespace-pre-wrap bg-app-bg/30 p-6 rounded-xl border border-app-border/50">
                    {selectedIntel.summary}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-app-border/30">
                  <div>
                    <h5 className="text-[10px] text-app-text/40 font-bold uppercase tracking-widest mb-2">Created On</h5>
                    <p className="text-xs text-app-text font-mono">{new Date(selectedIntel.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <h5 className="text-[10px] text-app-text/40 font-bold uppercase tracking-widest mb-2">Source Agents</h5>
                    <div className="flex gap-2">
                      {(() => {
                        try {
                          const ids = typeof selectedIntel.agent_ids === 'string' ? JSON.parse(selectedIntel.agent_ids) : selectedIntel.agent_ids;
                          return Array.isArray(ids) ? ids.map((id: string) => (
                            <span key={id} className="text-[10px] px-2 py-1 bg-app-accent/10 text-app-accent rounded border border-app-accent/20 font-bold">Agent {id}</span>
                          )) : null;
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-app-card/50 border-t border-app-border flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedIntel(null)}
                  className="px-4 py-2 text-sm font-bold text-app-text/60 hover:text-app-text transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-app-accent text-white text-sm font-bold rounded-lg hover:opacity-80 transition-opacity"
                >
                  Export PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TelemetryPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-app-text">Telemetry & Costs</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-3" title="Usage Over Time">
          <div className="h-64 flex items-end gap-2 px-2">
            {[40, 65, 30, 85, 45, 90, 55].map((h, i) => (
              <div key={i} className="flex-1 bg-app-accent/20 rounded-t-lg relative group">
                <div 
                  className="absolute bottom-0 w-full bg-app-accent rounded-t-lg transition-all duration-500 group-hover:bg-app-accent/80" 
                  style={{ height: `${h}%` }} 
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-app-card border border-app-border text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  ${(h/10).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 px-2 text-[10px] text-app-text/40 font-bold uppercase tracking-widest">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Spend by Provider">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-app-text/60">OpenAI</span>
                  <span className="text-app-text font-mono">$8.42</span>
                </div>
                <div className="h-1.5 bg-app-bg rounded-full overflow-hidden">
                  <div className="h-full bg-app-highlight w-[65%]" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-app-text/60">Anthropic</span>
                  <span className="text-app-text font-mono">$3.15</span>
                </div>
                <div className="h-1.5 bg-app-bg rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[25%]" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-app-text/60">Google</span>
                  <span className="text-app-text font-mono">$0.88</span>
                </div>
                <div className="h-1.5 bg-app-bg rounded-full overflow-hidden">
                  <div className="h-full bg-app-accent w-[10%]" />
                </div>
              </div>
            </div>
          </Card>
          <button className="w-full py-3 bg-app-card border border-app-border rounded-xl text-sm font-bold text-app-text/80 hover:bg-app-bg transition-colors">
            Manage API Keys
          </button>
        </div>
      </div>
    </div>
  );
};

const NotesPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-app-text">Notes & Journal</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-lg hover:opacity-80 transition-opacity font-medium">
          <Plus size={18} />
          New Entry
        </button>
      </div>

      <div className="space-y-4">
        {[
          { date: '2026-02-22 14:30', content: 'Connected OpenClaw to AWS EC2 successfully. Initialized Tom as Main Agent.', type: 'system' },
          { date: '2026-02-21 09:15', content: 'Researcher agent completed the competitive analysis. Drafted Q1 strategy.', type: 'user' },
          { date: '2026-02-20 23:00', content: 'Automated job "Daily Market Research" failed due to API timeout. Adjusted retry logic.', type: 'error' }
        ].map((note, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full mt-1.5 ${note.type === 'error' ? 'bg-red-500' : note.type === 'system' ? 'bg-app-accent' : 'bg-app-text/20'}`} />
              <div className="w-0.5 flex-1 bg-app-border my-1" />
            </div>
            <div className="flex-1 pb-6">
              <p className="text-[10px] font-mono text-app-text/40 mb-1">{note.date}</p>
              <div className="bg-app-card border border-app-border p-4 rounded-xl shadow-sm">
                <p className="text-sm text-app-text/80 leading-relaxed">{note.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const [ec2Ip, setEc2Ip] = useState('54.90.145.125');
  const [ec2Port, setEc2Port] = useState('3000');
  const [wsPort, setWsPort] = useState('18789');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleTestConnection = async () => {
    setTestStatus('testing');
    try {
      const res = await fetch('/api/proxy/ec2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          endpoint: '/health', 
          method: 'GET', 
          ec2_ip: ec2Ip,
          port: ec2Port
        })
      });
      if (res.ok) setTestStatus('success');
      else setTestStatus('error');
    } catch {
      setTestStatus('error');
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-2xl font-bold text-app-text">Settings</h2>
      
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-app-text/40 uppercase tracking-widest">OpenClaw Connection</h3>
        <Card className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-app-text/60">AWS EC2 IP Address</label>
              <input 
                type="text" 
                value={ec2Ip}
                onChange={(e) => setEc2Ip(e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-sm focus:border-app-accent outline-none text-app-text" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-app-text/60">API Port</label>
              <input 
                type="text" 
                value={ec2Port}
                onChange={(e) => setEc2Port(e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-sm focus:border-app-accent outline-none text-app-text" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-app-text/60">WebSocket Port</label>
              <input 
                type="text" 
                value={wsPort}
                onChange={(e) => setWsPort(e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-2 text-sm focus:border-app-accent outline-none text-app-text" 
              />
            </div>
          </div>
          
          <div className="p-3 bg-app-bg/30 border border-app-border rounded-lg grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-app-text/40 uppercase font-bold mb-1">Internal IP</p>
              <p className="text-xs font-mono text-app-text/80">172.31.15.47</p>
            </div>
            <div>
              <p className="text-[10px] text-app-text/40 uppercase font-bold mb-1">Instance ID</p>
              <p className="text-xs font-mono text-app-text/80">i-01e8b892977414a17</p>
            </div>
            <div>
              <p className="text-[10px] text-app-text/40 uppercase font-bold mb-1">Region</p>
              <p className="text-xs font-mono text-app-text/80">us-east-1</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="px-4 py-2 bg-app-accent text-white text-sm font-bold rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            {testStatus === 'success' && <span className="text-xs text-emerald-500 font-bold">✓ Connected to EC2</span>}
            {testStatus === 'error' && <span className="text-xs text-red-500 font-bold">✗ Connection Failed</span>}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-app-text/40 uppercase tracking-widest">Security</h3>
        <Card className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-app-text">Production Auth</h4>
            <p className="text-xs text-app-text/50">Enable Firebase Authentication for secure access.</p>
          </div>
          <div className="w-12 h-6 bg-app-bg border border-app-border rounded-full relative cursor-pointer">
            <div className="absolute left-1 top-1 w-4 h-4 bg-app-text/20 rounded-full" />
          </div>
        </Card>
      </section>
    </div>
  );
};

const HelpPage = () => {
  return (
    <div className="max-w-3xl space-y-8">
      <h2 className="text-2xl font-bold text-app-text">Help & Instructions</h2>
      
      <div className="space-y-6">
        <Card title="1. Getting Started">
          <p className="text-sm text-app-text/60 leading-relaxed">
            Welcome to OpenClaw Mission Control. This dashboard is your central hub for managing AI agents running on your AWS EC2 instance.
            Start by checking the <span className="text-app-accent font-bold">Agents</span> page to ensure your workforce is online.
          </p>
        </Card>

        <Card title="2. The Boardroom">
          <p className="text-sm text-app-text/60 leading-relaxed">
            The Boardroom is where multi-agent collaboration happens. Use it to solve complex problems that require different specialist perspectives.
            Insights from the Boardroom can be converted directly into <span className="text-app-accent font-bold">Jobs</span> or <span className="text-app-accent font-bold">Intel</span>.
          </p>
        </Card>

        <Card title="3. Connecting to OpenClaw">
          <div className="bg-app-bg p-4 rounded-lg border border-app-border space-y-3">
            <p className="text-xs text-app-text font-bold underline">Connection Steps:</p>
            <ol className="text-xs text-app-text/50 list-decimal list-inside space-y-2">
              <li>Navigate to the <span className="text-app-text/80">Settings</span> page.</li>
              <li>Enter your AWS EC2 Public IP address (<span className="text-app-accent">54.90.145.125</span>).</li>
              <li>Ensure the <span className="text-app-text/80">Custom TCP</span> rules in your Security Group (sgr-011d99ee22bdad062) have Port Ranges set to <span className="text-app-accent font-bold">3000</span> (API) and <span className="text-app-accent font-bold">18789</span> (WebSocket).</li>
              <li>In <span className="text-app-text/80">API Management</span>, use the "Quick Import" feature to paste your provider payload.</li>
              <li>Click "Test Connection" in Settings to verify the link.</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
};


const AgentsPage = ({ agents, providers, onUpdate }: { agents: Agent[], providers: APIProvider[], onUpdate: () => void }) => {
  const mainAgent = agents.find(a => !a.parent_id);
  const subAgents = agents.filter(a => a.parent_id);
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [newAgent, setNewAgent] = useState({ name: '', role: '', capabilities: '', access_scope: 'read-only', status: 'idle', instructions: '' });
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedAgents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleProviderChange = async (agent: Agent, providerId: string) => {
    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...agent, 
        api_provider_id: providerId,
        capabilities: JSON.stringify(agent.capabilities) 
      })
    });
    onUpdate();
  };

  const handleSync = async () => {
    setIsSyncing(true);
    // Simulate API call to EC2
    await new Promise(resolve => setTimeout(resolve, 1500));
    onUpdate();
    setIsSyncing(false);
    alert("Successfully synced agents from EC2 (54.90.145.125:3000)");
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgent.name || !newAgent.role) return;

    const agentData = {
      id: editingAgent ? editingAgent.id : Date.now().toString(),
      name: newAgent.name,
      role: newAgent.role,
      parent_id: editingAgent ? editingAgent.parent_id : (mainAgent?.id || '1'),
      status: newAgent.status,
      capabilities: JSON.stringify(newAgent.capabilities.split(',').map(s => s.trim())),
      access_scope: newAgent.access_scope,
      api_provider_id: editingAgent ? editingAgent.api_provider_id : null,
      instructions: newAgent.instructions
    };

    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData)
    });

    setNewAgent({ name: '', role: '', capabilities: '', access_scope: 'read-only', status: 'idle', instructions: '' });
    setIsAdding(false);
    setEditingAgent(null);
    onUpdate();
  };

  const handleResetStatus = async (agent: Agent) => {
    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...agent, 
        status: 'idle',
        capabilities: JSON.stringify(agent.capabilities) 
      })
    });
    onUpdate();
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to decommission this agent?')) return;
    await fetch(`/api/agents/${id}`, { method: 'DELETE' });
    onUpdate();
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setNewAgent({ 
      name: agent.name, 
      role: agent.role, 
      capabilities: agent.capabilities.join(', '), 
      access_scope: agent.access_scope,
      status: agent.status,
      instructions: agent.instructions || ''
    });
    setIsAdding(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-app-text">Agent Hierarchy</h2>
        <div className="flex gap-3">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-app-card border border-app-border text-app-text rounded-lg hover:bg-app-bg transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync EC2 Agents'}
          </button>
          <button 
            onClick={() => {
              if (isAdding) {
                setEditingAgent(null);
                setNewAgent({ name: '', role: '', capabilities: '', access_scope: 'read-only', status: 'idle', instructions: '' });
              }
              setIsAdding(!isAdding);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${isAdding ? 'bg-app-bg border border-app-border text-app-text' : 'bg-app-accent text-white hover:opacity-80'}`}
          >
            {isAdding ? <X size={18} /> : <Plus size={18} />}
            {isAdding ? 'Cancel' : 'Add Sub-Agent'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card title={editingAgent ? `Edit Agent: ${editingAgent.name}` : "Deploy New Sub-Agent"} className="border-app-accent/30 bg-app-accent/5">
              <form onSubmit={handleAddAgent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-app-text/60 uppercase font-bold">Agent Name</label>
                  <input 
                    type="text" 
                    value={newAgent.name}
                    onChange={e => setNewAgent({...newAgent, name: e.target.value})}
                    placeholder="e.g. Analyst"
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-app-text/60 uppercase font-bold">Role</label>
                  <input 
                    type="text" 
                    value={newAgent.role}
                    onChange={e => setNewAgent({...newAgent, role: e.target.value})}
                    placeholder="e.g. Data Processing"
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-app-text/60 uppercase font-bold">Capabilities (comma separated)</label>
                  <input 
                    type="text" 
                    value={newAgent.capabilities}
                    onChange={e => setNewAgent({...newAgent, capabilities: e.target.value})}
                    placeholder="search, analysis, writing"
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-app-text/60 uppercase font-bold">Initial Status</label>
                  <select 
                    value={newAgent.status}
                    onChange={e => setNewAgent({...newAgent, status: e.target.value})}
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none"
                  >
                    <option value="idle">Idle</option>
                    <option value="busy">Busy</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-app-text/60 uppercase font-bold">Access Scope</label>
                  <select 
                    value={newAgent.access_scope}
                    onChange={e => setNewAgent({...newAgent, access_scope: e.target.value as any})}
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none"
                  >
                    <option value="read-only">Read Only</option>
                    <option value="draft only">Draft Only</option>
                    <option value="can deploy with approval">Can Deploy with Approval</option>
                    <option value="full-access">Full Access</option>
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-4 space-y-1">
                  <label className="text-[10px] text-app-text/60 uppercase font-bold">Character Instructions / Personality</label>
                  <textarea 
                    value={newAgent.instructions}
                    onChange={e => setNewAgent({...newAgent, instructions: e.target.value})}
                    placeholder="e.g. You are a meticulous researcher who values precision over speed. Always double check sources."
                    rows={3}
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:border-app-accent outline-none resize-none"
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <button 
                    type="submit"
                    className="w-full py-2 bg-app-accent text-white font-bold rounded-lg hover:opacity-80 transition-opacity"
                  >
                    {editingAgent ? 'Update Agent' : 'Deploy Agent'}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {mainAgent && (
        <Card title="Main Agent (Coordinator)" className="border-app-accent/30 bg-app-accent/5">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-app-accent flex items-center justify-center text-white shadow-lg shadow-app-accent/20">
                  <Zap size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-app-accent glow-accent">{mainAgent.name}</h4>
                  <p className="text-sm text-app-text/60">{mainAgent.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-app-text/40 uppercase font-bold tracking-wider mb-1">Assigned API</p>
                  <select 
                    value={mainAgent.api_provider_id || ''}
                    onChange={(e) => handleProviderChange(mainAgent, e.target.value)}
                    className="bg-app-bg border border-app-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
                  >
                    <option value="">Default (System)</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.version})</option>
                    ))}
                  </select>
                </div>
                <div className="text-right">
                  <p className="text-xs text-app-text/40 uppercase font-bold tracking-wider mb-1">Status</p>
                  <StatusBadge status={mainAgent.status} />
                </div>
                <div className="flex gap-2 ml-4">
                  <button 
                    onClick={() => handleEditAgent(mainAgent)}
                    className="p-2 text-app-text/40 hover:text-app-text transition-colors"
                    title="Edit Main Agent"
                  >
                    <Settings size={20} />
                  </button>
                  <button 
                    onClick={() => toggleExpand(mainAgent.id)}
                    className="p-2 text-app-text/40 hover:text-app-text transition-colors"
                  >
                    {expandedAgents[mainAgent.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedAgents[mainAgent.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pt-4 border-t border-app-border/50"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[10px] text-app-text/40 uppercase font-bold tracking-widest">Capabilities</p>
                        <div className="flex flex-wrap gap-2">
                          {mainAgent.capabilities.map(cap => (
                            <span key={cap} className="text-[10px] px-2 py-0.5 bg-app-bg text-app-text/60 rounded-md border border-app-border">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] text-app-text/40 uppercase font-bold tracking-widest">Security Scope</p>
                        <p className="text-xs text-app-text/60 italic">{mainAgent.access_scope}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-app-text/40 uppercase font-bold tracking-widest">Character Instructions</p>
                      <div className="p-3 bg-app-bg/50 rounded-lg border border-app-border/50">
                        <p className="text-xs text-app-text/70 leading-relaxed whitespace-pre-wrap">
                          {mainAgent.instructions || "No personality instructions defined for this coordinator."}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subAgents.map(agent => (
          <Card key={agent.id}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-app-bg flex items-center justify-center text-app-text/40 border border-app-border">
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-app-text">{agent.name}</h4>
                  <p className="text-xs text-app-text/50">{agent.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={agent.status} />
                <button 
                  onClick={() => toggleExpand(agent.id)}
                  className="p-1.5 text-app-text/40 hover:text-app-text transition-colors"
                >
                  {expandedAgents[agent.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {expandedAgents[agent.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 mb-6 pt-2 border-t border-app-border/50">
                    <div className="space-y-1">
                      <p className="text-[10px] text-app-text/40 uppercase font-bold tracking-widest">Capabilities</p>
                      <div className="flex flex-wrap gap-2">
                        {agent.capabilities.map(cap => (
                          <span key={cap} className="text-[10px] px-2 py-0.5 bg-app-bg text-app-text/60 rounded-md border border-app-border">
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-app-text/40 uppercase font-bold tracking-widest">Character Instructions</p>
                      <p className="text-[11px] text-app-text/70 leading-relaxed whitespace-pre-wrap p-2 bg-app-bg/30 rounded border border-app-border/30">
                        {agent.instructions || "No specific instructions defined."}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-app-text/50 italic">Scope: {agent.access_scope}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-app-text/40 font-bold uppercase">API:</span>
                        <select 
                          value={agent.api_provider_id || ''}
                          onChange={(e) => handleProviderChange(agent, e.target.value)}
                          className="bg-app-bg border border-app-border rounded px-2 py-1 text-[10px] text-app-text outline-none focus:border-app-accent"
                        >
                          <option value="">Default</option>
                          {providers.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.version})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-4 border-t border-app-border flex justify-between items-center">
              <span className="text-[10px] text-app-text/40 font-bold uppercase tracking-wider">Reports To</span>
              <span className="text-xs font-bold text-app-accent">Tom</span>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-app-border">
              {agent.status !== 'idle' && (
                <button 
                  onClick={() => handleResetStatus(agent)}
                  className="p-2 text-emerald-500/50 hover:text-emerald-500 transition-colors"
                  title="Reset to Idle"
                >
                  <RefreshCw size={16} />
                </button>
              )}
              <button 
                onClick={() => handleEditAgent(agent)}
                className="p-2 text-app-text/40 hover:text-app-text transition-colors"
                title="Edit Agent"
              >
                <Settings size={16} />
              </button>
              <button 
                onClick={() => handleDeleteAgent(agent.id)}
                className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                title="Decommission Agent"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [providers, setProviders] = useState<APIProvider[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [work, setWork] = useState<AgentWork[]>([]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }

    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarHidden(true);
        setSidebarCollapsed(false);
      } else {
        setSidebarHidden(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      const [agentsRes, jobsRes, providersRes, activitiesRes, workRes, intelRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/jobs'),
        fetch('/api/api-providers'),
        fetch('/api/activities'),
        fetch('/api/work'),
        fetch('/api/intel')
      ]);
      const agentsData = await agentsRes.json();
      const jobsData = await jobsRes.json();
      const providersData = await providersRes.json();
      const activitiesData = await activitiesRes.json();
      const workData = await workRes.json();
      const intelData = await intelRes.json();
      
      // Parse capabilities if they come as string from SQLite
      const parsedAgents = agentsData.map((a: any) => ({
        ...a,
        capabilities: typeof a.capabilities === 'string' ? JSON.parse(a.capabilities) : a.capabilities
      }));

      setAgents(parsedAgents);
      setJobs(jobsData);
      setProviders(providersData);
      setActivities(activitiesData);
      setWork(workData);

      // Seed initial data if empty
      if (parsedAgents.length === 0) {
        const initialAgents: Agent[] = [
          { id: '1', name: 'Tom', role: 'Main Coordinator', status: 'online', capabilities: ['all'], access_scope: 'can deploy with approval' },
          { id: '2', name: 'elan', role: 'Specialist Agent', parent_id: '1', status: 'online', capabilities: ['web-search', 'automation'], access_scope: 'read-only' },
          { id: '3', name: 'Researcher', role: 'Research Specialist', parent_id: '1', status: 'idle', capabilities: ['web-search', 'data-analysis'], access_scope: 'read-only' },
          { id: '4', name: 'Scribe', role: 'Content Writer', parent_id: '1', status: 'busy', capabilities: ['writing', 'editing'], access_scope: 'draft only' }
        ];
        for (const agent of initialAgents) {
          await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...agent, capabilities: JSON.stringify(agent.capabilities) })
          });
        }
        setAgents(initialAgents);
      }

      if (jobsData.length === 0) {
        const initialJobs: Job[] = [
          { id: 'j1', name: 'Daily Market Research', agent_ids: ['2'], schedule: '0 2 * * *', status: 'active', cost: 0.45 },
          { id: 'j2', name: 'Weekly Newsletter Draft', agent_ids: ['3'], schedule: '0 4 * * 1', status: 'paused', cost: 1.20 }
        ];
        for (const job of initialJobs) {
          await fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...job, agent_ids: JSON.stringify(job.agent_ids) })
          });
        }
        setJobs(initialJobs);
      }

      if (activitiesData.length === 0) {
        const initialActivities = [
          { agent_id: '1', activity: 'Tom initialized system bridge to AWS EC2.', status: 'success' },
          { agent_id: '2', activity: 'Researcher started scanning market trends for Project X.', status: 'info' },
          { agent_id: '3', activity: 'Scribe drafted the weekly summary report.', status: 'success' }
        ];
        for (const act of initialActivities) {
          await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(act)
          });
        }
        fetchData(); // Refresh to get timestamps
      }

      if (workData.length === 0) {
        const initialWork = [
          { agent_id: '2', folder_path: '/work/elan/reports', file_name: 'market_scan_report.pdf', content: 'MARKET SCAN REPORT\n\nAgent: elan\nStatus: Complete\n\nFindings:\n- Competitor A has increased pricing by 15%\n- New market entry detected in SE Asia\n- Automation trends favor low-code solutions.' },
          { agent_id: '3', folder_path: '/work/researcher/reports', file_name: 'competitor_analysis_q1.pdf', content: 'COMPETITOR ANALYSIS Q1\n\nDetailed breakdown of top 5 competitors...' },
          { agent_id: '4', folder_path: '/work/scribe/drafts', file_name: 'newsletter_v1.md', content: '# Weekly Newsletter\n\nWelcome to the latest update...' }
        ];
        for (const w of initialWork) {
          await fetch('/api/work', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(w)
          });
        }
        fetchData();
      }

      if (intelData.length === 0) {
        const initialIntel: IntelItem[] = [
          { 
            id: 'i1', 
            title: 'Competitor Analysis Q1', 
            summary: 'Detailed breakdown of top 5 competitors in the automation space, focusing on pricing and feature sets. Competitor A has increased pricing by 15%. New market entry detected in SE Asia.', 
            category: 'Research', 
            agent_ids: ['3'],
            created_at: new Date().toISOString()
          },
          { 
            id: 'i2', 
            title: 'Agent Onboarding Framework', 
            summary: 'Standardized protocol for initializing new sub-agents with specific personality traits and access scopes.', 
            category: 'Frameworks', 
            agent_ids: ['1'],
            created_at: new Date().toISOString()
          },
          { 
            id: 'i3', 
            title: 'Q2 Marketing Campaign Draft', 
            summary: 'Initial concepts for the "Automation First" campaign targeting mid-sized enterprise clients.', 
            category: 'Campaigns', 
            agent_ids: ['4'],
            created_at: new Date().toISOString()
          }
        ];
        for (const item of initialIntel) {
          await fetch('/api/intel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleLogin = () => {
    if (password === '122122') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid password. Access denied.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen bg-app-bg flex items-center justify-center p-4 ${isDarkMode ? 'dark' : ''}`}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-app-card border border-app-border rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="absolute top-4 right-4 p-2 text-app-text/60 hover:text-app-text hover:bg-app-bg rounded-lg transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-app-accent rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-app-accent/20">
              <Zap size={32} />
            </div>
            <h1 className="text-2xl font-bold text-app-text mb-2">OpenClaw Mission Control</h1>
            <p className="text-app-text/50 text-sm">Welcome back, Anwar. System is ready.</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-app-text/60 uppercase font-bold tracking-wider">Admin Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••"
                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-app-text focus:border-app-accent outline-none transition-colors"
              />
            </div>
            
            {loginError && (
              <p className="text-xs text-red-500 font-medium">{loginError}</p>
            )}

            <button 
              onClick={handleLogin}
              className="w-full py-4 bg-app-accent hover:opacity-90 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-app-accent/20"
            >
              Admin Login
            </button>

            <button 
              onClick={() => setIsLoggedIn(true)}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20 text-sm"
            >
              Admin Pass
            </button>
          </div>
          
          <p className="mt-6 text-center text-xs text-app-text/40">
            Secure connection established to AWS EC2
          </p>
        </motion.div>
      </div>
    );
  }

  const mainAgent = agents.find(a => !a.parent_id);

  return (
    <div className={`min-h-screen bg-app-bg text-app-text flex overflow-hidden relative ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar Backdrop */}
      <AnimatePresence>
        {!sidebarHidden && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarHidden(true)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {!sidebarHidden && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0, width: sidebarCollapsed ? 64 : 260 }}
            exit={{ x: -280 }}
            className="bg-app-sidebar border-r border-app-border flex flex-col z-50 fixed lg:relative h-full"
          >
            <div className="p-4 border-b border-app-border flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-app-bg rounded-full flex items-center justify-center text-xl border border-app-border">
                  👨‍💻
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-app-highlight border-2 border-app-sidebar rounded-full" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <p className="text-sm font-bold text-app-text">Admin: Anwar</p>
                  <p className="text-[10px] text-app-text/50 uppercase tracking-widest font-bold">System Root</p>
                </div>
              )}
            </div>

            {mainAgent && !sidebarCollapsed && (
              <div className="p-4 mx-4 my-4 bg-app-accent/5 border border-app-accent/20 rounded-xl">
                <p className="text-[10px] text-app-accent uppercase font-bold tracking-widest mb-1">Main Agent</p>
                <p className="text-sm font-bold text-app-accent glow-accent">{mainAgent.name}</p>
              </div>
            )}

            <nav className="flex-1 py-4 overflow-y-auto">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentPage === 'dashboard'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('dashboard')} />
              <SidebarItem icon={Users} label="Agents" active={currentPage === 'agents'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('agents')} />
              <SidebarItem icon={FileText} label="Workspaces" active={currentPage === 'workspaces'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('workspaces')} />
              <SidebarItem icon={Key} label="API Management" active={currentPage === 'api-management'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('api-management')} />
              <SidebarItem icon={Handshake} label="Boardroom" active={currentPage === 'boardroom'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('boardroom')} />
              <SidebarItem icon={Calendar} label="Jobs & Schedules" active={currentPage === 'jobs'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('jobs')} />
              <SidebarItem icon={MessageSquare} label="Conversations" active={currentPage === 'conversations'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('conversations')} />
              <SidebarItem icon={FileText} label="Intel & Docs" active={currentPage === 'intel'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('intel')} />
              <SidebarItem icon={BarChart3} label="Telemetry & Costs" active={currentPage === 'telemetry'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('telemetry')} />
              <SidebarItem icon={BookOpen} label="Notes & Journal" active={currentPage === 'notes'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('notes')} />
              <div className="my-4 border-t border-zinc-900" />
              <SidebarItem icon={Settings} label="Settings" active={currentPage === 'settings'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('settings')} />
              <SidebarItem icon={HelpCircle} label="Help & Instructions" active={currentPage === 'help'} collapsed={sidebarCollapsed} onClick={() => setCurrentPage('help')} />
            </nav>

            <div className="p-4 border-t border-app-border">
              <SidebarItem icon={LogOut} label="Logout" active={false} collapsed={sidebarCollapsed} onClick={() => setIsLoggedIn(false)} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-app-sidebar border-b border-app-border flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarHidden(!sidebarHidden)}
              className="p-2 text-app-text/60 hover:text-app-text hover:bg-app-bg rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-app-text/50">
              <button onClick={() => setCurrentPage('dashboard')} className="hover:text-app-text transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-medium capitalize">{currentPage.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-app-text/60 hover:text-app-text hover:bg-app-bg rounded-lg transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-app-bg border border-app-border rounded-lg">
              <div className="w-2 h-2 rounded-full bg-app-highlight" />
              <span className="text-xs font-mono text-app-text/60">EC2: 54.90.145.125:3000</span>
            </div>
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className="p-2 text-app-text/50 hover:text-app-text transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-7xl mx-auto w-full">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {currentPage === 'dashboard' && (
              <div className="space-y-6">
                <Dashboard agents={agents} jobs={jobs} onNavigate={setCurrentPage} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ActivityLog activities={activities} />
                  <Card title="System Health" subtitle="AWS EC2 Monitoring">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-app-bg/30 border border-app-border rounded-lg">
                        <span className="text-sm text-app-text/60">EC2 Status</span>
                        <span className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          RUNNING
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-app-bg/30 border border-app-border rounded-lg">
                        <span className="text-sm text-app-text/60">CPU Usage</span>
                        <span className="text-xs font-mono text-app-text">12%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-app-bg/30 border border-app-border rounded-lg">
                        <span className="text-sm text-app-text/60">Memory</span>
                        <span className="text-xs font-mono text-app-text">2.4GB / 8GB</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
            {currentPage === 'agents' && <AgentsPage agents={agents} providers={providers} onUpdate={fetchData} />}
            {currentPage === 'api-management' && <APIManagementPage providers={providers} onUpdate={fetchData} />}
            {currentPage === 'boardroom' && <Boardroom agents={agents} />}
            {currentPage === 'jobs' && <JobsPage jobs={jobs} providers={providers} onUpdate={fetchData} />}
            {currentPage === 'conversations' && <ConversationsPage agents={agents} />}
            {currentPage === 'intel' && <IntelPage />}
            {currentPage === 'telemetry' && <TelemetryPage />}
            {currentPage === 'workspaces' && <WorkspacesPage agents={agents} work={work} />}
            {currentPage === 'notes' && <NotesPage />}
            {currentPage === 'settings' && <SettingsPage />}
            {currentPage === 'help' && <HelpPage />}
          </motion.div>
        </div>
      </main>

      <style>{`
        .glow-accent {
          text-shadow: 0 0 10px var(--accent);
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--accent);
        }
      `}</style>
    </div>
  );
}
