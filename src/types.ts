export type Page = 
  | 'dashboard' 
  | 'agents' 
  | 'boardroom' 
  | 'jobs' 
  | 'conversations' 
  | 'intel' 
  | 'telemetry' 
  | 'notes' 
  | 'settings' 
  | 'help'
  | 'api-management';

export interface APIProvider {
  id: string;
  name: string;
  provider_type: 'openai' | 'google' | 'anthropic' | 'other';
  api_key: string;
  version: string;
  is_active: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  parent_id?: string;
  status: 'online' | 'busy' | 'idle' | 'offline';
  capabilities: string[];
  access_scope: 'read-only' | 'draft only' | 'can deploy with approval';
  api_provider_id?: string;
}

export interface Job {
  id: string;
  name: string;
  agent_ids: string[];
  schedule: string;
  last_run?: string;
  status: 'active' | 'paused' | 'failed';
  cost: number;
  api_provider_id?: string;
}

export interface IntelItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  agent_ids: string[];
  created_at: string;
}

export interface Note {
  id: string;
  content: string;
  created_at: string;
}

export interface AgentActivity {
  id: string;
  agent_id: string;
  agent_name?: string;
  activity: string;
  status: string;
  timestamp: string;
}

export interface AgentWork {
  id: string;
  agent_id: string;
  folder_path: string;
  file_name: string;
  content: string;
  created_at: string;
}
