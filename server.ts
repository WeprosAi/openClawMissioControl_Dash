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
    api_provider_id TEXT
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
    const { id, name, role, parent_id, status, capabilities, access_scope, api_provider_id } = req.body;
    db.prepare(`
      INSERT INTO agents (id, name, role, parent_id, status, capabilities, access_scope, api_provider_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        role=excluded.role,
        parent_id=excluded.parent_id,
        status=excluded.status,
        capabilities=excluded.capabilities,
        access_scope=excluded.access_scope,
        api_provider_id=excluded.api_provider_id
    `).run(id, name, role, parent_id, status, capabilities, access_scope, api_provider_id);
    res.json({ success: true });
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
    const { id, name, agent_ids, schedule, last_run, status, cost, api_provider_id } = req.body;
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
    `).run(id, name, agent_ids, schedule, last_run, status, cost, api_provider_id);
    res.json({ success: true });
  });

  app.get("/api/intel", (req, res) => {
    const intel = db.prepare("SELECT * FROM intel").all();
    res.json(intel);
  });

  app.post("/api/intel", (req, res) => {
    const { id, title, summary, category, agent_ids } = req.body;
    db.prepare(`
      INSERT INTO intel (id, title, summary, category, agent_ids)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        summary=excluded.summary,
        category=excluded.category,
        agent_ids=excluded.agent_ids
    `).run(id, title, summary, category, agent_ids);
    res.json({ success: true });
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

  app.get("/api/api-providers", (req, res) => {
    const providers = db.prepare("SELECT * FROM api_providers").all();
    res.json(providers);
  });

  app.post("/api/api-providers", (req, res) => {
    const { id, name, provider_type, api_key, version, is_active } = req.body;
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
    res.json({ success: true });
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
