import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("mission_control.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    parent_id TEXT,
    status TEXT DEFAULT 'idle',
    capabilities TEXT,
    access_scope TEXT DEFAULT 'read-only',
    api_provider_id TEXT,
    instructions TEXT
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    agent_ids TEXT,
    schedule TEXT,
    last_run TEXT,
    status TEXT DEFAULT 'active',
    cost REAL DEFAULT 0,
    api_provider_id TEXT
  );

  CREATE TABLE IF NOT EXISTS api_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider_type TEXT NOT NULL,
    api_key TEXT NOT NULL,
    version TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS agent_activities (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    activity TEXT NOT NULL,
    status TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agent_work (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    folder_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS intel (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    category TEXT,
    agent_ids TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS boardroom_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS boardroom_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES boardroom_sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS boardroom_tasks (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES boardroom_sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    last_message TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS telemetry (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    model TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/agents", (req, res) => {
    const agents = db.prepare("SELECT * FROM agents").all();
    res.json(agents);
  });

  app.post("/api/agents", (req, res) => {
    try {
      const { id, name, role, parent_id, status, capabilities, access_scope, api_provider_id, instructions } = req.body;
      
      // Validation: Ensure required fields are present
      if (!id || !name || !role) {
        return res.status(400).json({ 
          error: "Missing required fields: id, name, and role are mandatory." 
        });
      }

      // Ensure capabilities is a string (JSON) for SQLite storage
      const capabilitiesStr = typeof capabilities === 'string' 
        ? capabilities 
        : JSON.stringify(capabilities || []);

      const stmt = db.prepare(`
        INSERT INTO agents (id, name, role, parent_id, status, capabilities, access_scope, api_provider_id, instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          role=excluded.role,
          parent_id=excluded.parent_id,
          status=excluded.status,
          capabilities=excluded.capabilities,
          access_scope=excluded.access_scope,
          api_provider_id=excluded.api_provider_id,
          instructions=COALESCE(excluded.instructions, agents.instructions)
      `);

      const result = stmt.run(id, name, role, parent_id, status || 'idle', capabilitiesStr, access_scope || 'read-only', api_provider_id, instructions);
      
      if (result.changes > 0) {
        console.log(`Agent ${id} persisted successfully.`);
        res.json({ success: true, message: "Agent persisted successfully." });
      } else {
        throw new Error("Database operation completed but no changes were made.");
      }
    } catch (error: any) {
      console.error("Database Error (Agent Insertion):", error);
      res.status(500).json({ 
        error: "Failed to persist agent to database.", 
        details: error.message 
      });
    }
  });

  app.delete("/api/agents/:id", (req, res) => {
    db.prepare("DELETE FROM agents WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/jobs", (req, res) => {
    const jobs = db.prepare("SELECT * FROM jobs").all();
    res.json(jobs);
  });

  app.post("/api/jobs", (req, res) => {
    try {
      const { id, name, agent_ids, schedule, last_run, status, cost, api_provider_id } = req.body;
      
      if (!id || !name) {
        return res.status(400).json({ error: "Missing required fields: id and name are mandatory." });
      }

      const agentIdsStr = typeof agent_ids === 'string' ? agent_ids : JSON.stringify(agent_ids || []);

      db.prepare(`
        INSERT INTO jobs (id, name, agent_ids, schedule, last_run, status, cost, api_provider_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          agent_ids=excluded.agent_ids,
          schedule=excluded.schedule,
          last_run=excluded.last_run,
          status=excluded.status,
          cost=excluded.cost,
          api_provider_id=excluded.api_provider_id
      `).run(id, name, agentIdsStr, schedule, last_run, status || 'active', cost || 0, api_provider_id);
      
      res.json({ success: true, message: "Job persisted successfully." });
    } catch (error: any) {
      console.error("Database Error (Job Insertion):", error);
      res.status(500).json({ error: "Failed to persist job.", details: error.message });
    }
  });

  app.delete("/api/jobs/:id", (req, res) => {
    db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/intel", (req, res) => {
    const intel = db.prepare("SELECT * FROM intel").all();
    res.json(intel);
  });

  app.post("/api/intel", (req, res) => {
    try {
      const { id, title, summary, category, agent_ids } = req.body;
      
      if (!id || !title) {
        return res.status(400).json({ error: "Missing required fields: id and title are mandatory." });
      }

      const agentIdsStr = typeof agent_ids === 'string' ? agent_ids : JSON.stringify(agent_ids || []);

      db.prepare(`
        INSERT INTO intel (id, title, summary, category, agent_ids)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title,
          summary=excluded.summary,
          category=excluded.category,
          agent_ids=excluded.agent_ids
      `).run(id, title, summary, category, agentIdsStr);
      
      res.json({ success: true, message: "Intel persisted successfully." });
    } catch (error: any) {
      console.error("Database Error (Intel Insertion):", error);
      res.status(500).json({ error: "Failed to persist intel.", details: error.message });
    }
  });

  app.get("/api/notes", (req, res) => {
    const notes = db.prepare("SELECT * FROM notes ORDER BY created_at DESC").all();
    res.json(notes);
  });

  app.post("/api/notes", (req, res) => {
    const { id, content } = req.body;
    db.prepare("INSERT INTO notes (id, content) VALUES (?, ?)").run(id, content);
    res.json({ success: true });
  });

  // Boardroom Routes
  app.get("/api/boardroom/sessions", (req, res) => {
    const sessions = db.prepare("SELECT * FROM boardroom_sessions ORDER BY created_at DESC").all();
    res.json(sessions);
  });

  app.post("/api/boardroom/sessions", (req, res) => {
    const { id, title, date, time } = req.body;
    db.prepare("INSERT INTO boardroom_sessions (id, title, date, time) VALUES (?, ?, ?, ?)").run(id, title, date, time);
    res.json({ success: true });
  });

  app.get("/api/boardroom/messages/:sessionId", (req, res) => {
    const messages = db.prepare("SELECT * FROM boardroom_messages WHERE session_id = ? ORDER BY timestamp ASC").all(req.params.sessionId);
    res.json(messages);
  });

  app.post("/api/boardroom/messages", (req, res) => {
    const { id, session_id, role, name, content } = req.body;
    db.prepare("INSERT INTO boardroom_messages (id, session_id, role, name, content) VALUES (?, ?, ?, ?, ?)").run(id, session_id, role, name, content);
    res.json({ success: true });
  });

  app.get("/api/boardroom/tasks", (req, res) => {
    const tasks = db.prepare("SELECT * FROM boardroom_tasks ORDER BY created_at DESC").all();
    res.json(tasks);
  });

  app.post("/api/boardroom/tasks", (req, res) => {
    const { id, session_id, text, completed } = req.body;
    db.prepare(`
      INSERT INTO boardroom_tasks (id, session_id, text, completed) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        completed=excluded.completed,
        text=excluded.text
    `).run(id, session_id, text, completed ? 1 : 0);
    res.json({ success: true });
  });

  app.delete("/api/boardroom/tasks/:id", (req, res) => {
    db.prepare("DELETE FROM boardroom_tasks WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Conversation Routes
  app.get("/api/conversations", (req, res) => {
    const conversations = db.prepare(`
      SELECT c.*, a.name as agent_name 
      FROM conversations c 
      JOIN agents a ON c.agent_id = a.id 
      ORDER BY updated_at DESC
    `).all();
    res.json(conversations);
  });

  app.post("/api/conversations", (req, res) => {
    const { id, agent_id, last_message } = req.body;
    db.prepare(`
      INSERT INTO conversations (id, agent_id, last_message, updated_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        last_message=excluded.last_message,
        updated_at=CURRENT_TIMESTAMP
    `).run(id, agent_id, last_message);
    res.json({ success: true });
  });

  app.get("/api/messages/:conversationId", (req, res) => {
    const messages = db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC").all(req.params.conversationId);
    res.json(messages);
  });

  app.post("/api/messages", (req, res) => {
    const { id, conversation_id, agent_id, role, content } = req.body;
    db.prepare("INSERT INTO messages (id, conversation_id, agent_id, role, content) VALUES (?, ?, ?, ?, ?)").run(id, conversation_id, agent_id, role, content);
    
    // Update last message in conversation
    db.prepare("UPDATE conversations SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(content, conversation_id);
    
    res.json({ success: true });
  });

  app.delete("/api/messages/:conversationId", (req, res) => {
    db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(req.params.conversationId);
    db.prepare("UPDATE conversations SET last_message = NULL WHERE id = ?").run(req.params.conversationId);
    res.json({ success: true });
  });

  app.delete("/api/conversations/:id", (req, res) => {
    db.prepare("DELETE FROM conversations WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/api-providers", (req, res) => {
    const providers = db.prepare("SELECT * FROM api_providers").all();
    res.json(providers);
  });

  app.get("/api/telemetry/summary", (req, res) => {
    const summary = db.prepare(`
      SELECT provider, SUM(cost) as total_cost 
      FROM telemetry 
      GROUP BY provider
    `).all();
    res.json(summary);
  });

  app.get("/api/telemetry/usage", (req, res) => {
    const usage = db.prepare(`
      SELECT date(timestamp) as date, SUM(cost) as total_cost 
      FROM telemetry 
      WHERE timestamp >= date('now', '-7 days')
      GROUP BY date(timestamp)
      ORDER BY date ASC
    `).all();
    res.json(usage);
  });

  app.post("/api/telemetry", (req, res) => {
    const { provider, model, tokens_used, cost } = req.body;
    const id = Date.now().toString() + Math.random().toString(36).substring(7);
    db.prepare("INSERT INTO telemetry (id, provider, model, tokens_used, cost) VALUES (?, ?, ?, ?, ?)")
      .run(id, provider, model, tokens_used, cost);
    res.json({ success: true });
  });

  app.post("/api/api-providers", (req, res) => {
    try {
      const { id, name, provider_type, api_key, version, is_active } = req.body;
      
      if (!id || !name || !provider_type || !api_key) {
        return res.status(400).json({ error: "Missing required fields: id, name, type, and key are mandatory." });
      }

      db.prepare(`
        INSERT INTO api_providers (id, name, provider_type, api_key, version, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          provider_type=excluded.provider_type,
          api_key=excluded.api_key,
          version=excluded.version,
          is_active=excluded.is_active
      `).run(id, name, provider_type, api_key, version, is_active ? 1 : 0);
      
      res.json({ success: true, message: "API Provider persisted successfully." });
    } catch (error: any) {
      console.error("Database Error (API Provider Insertion):", error);
      res.status(500).json({ error: "Failed to persist API provider.", details: error.message });
    }
  });

  app.delete("/api/api-providers/:id", (req, res) => {
    db.prepare("DELETE FROM api_providers WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Agent Activity Routes
  app.get("/api/activities", (req, res) => {
    const activities = db.prepare(`
      SELECT a.*, ag.name as agent_name 
      FROM agent_activities a 
      JOIN agents ag ON a.agent_id = ag.id 
      ORDER BY timestamp DESC LIMIT 50
    `).all();
    res.json(activities);
  });

  app.post("/api/activities", (req, res) => {
    const { id, agent_id, activity, status } = req.body;
    db.prepare("INSERT INTO agent_activities (id, agent_id, activity, status) VALUES (?, ?, ?, ?)")
      .run(id || Date.now().toString(), agent_id, activity, status);
    res.json({ success: true });
  });

  // Agent Work/Files Routes
  app.get("/api/work", (req, res) => {
    const work = db.prepare("SELECT * FROM agent_work ORDER BY created_at DESC").all();
    res.json(work);
  });

  app.post("/api/work", (req, res) => {
    const { id, agent_id, folder_path, file_name, content } = req.body;
    db.prepare("INSERT INTO agent_work (id, agent_id, folder_path, file_name, content) VALUES (?, ?, ?, ?, ?)")
      .run(id || Date.now().toString(), agent_id, folder_path, file_name, content);
    res.json({ success: true });
  });

  // EC2 Proxy Bridge
  app.post("/api/proxy/ec2", async (req, res) => {
    const { endpoint, method, data, ec2_ip, port } = req.body;
    if (!ec2_ip) return res.status(400).json({ error: "EC2 IP is required" });

    try {
      const targetUrl = `http://${ec2_ip}${port ? `:${port}` : ''}${endpoint}`;
      const response = await fetch(targetUrl, {
        method: method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined
      });
      
      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error("EC2 Proxy Error:", error);
      res.status(500).json({ error: "Failed to connect to EC2 instance", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
