/**
 * LockIn — Neo4j AuraDB Graph Sync
 *
 * Builds a graph of user workspace entities in Neo4j when credentials are available.
 * Degrades gracefully (exits 0 with a message) when Neo4j credentials are absent.
 *
 * Nodes: User, Page, Task, Session, InterruptionReason, AIInsight, Tag
 * Edges:
 *   (User)-[:OWNS]->(Page|Task|Session|AIInsight)
 *   (User)-[:RAN]->(Session)
 *   (Session)-[:FOCUSED_ON]->(Page|Task)
 *   (Session)-[:INTERRUPTED_BY]->(InterruptionReason)
 *   (Task)-[:BELONGS_TO]->(Page)
 *   (AIInsight)-[:RELATED_TO]->(Session)
 *   (AIInsight)-[:RELATED_TO]->(Task)
 *   (Page)-[:TAGGED]->(Tag)
 *
 * Required env (when Neo4j enabled):
 *   NEO4J_URI         AuraDB HTTPS endpoint
 *   NEO4J_USERNAME    Database username
 *   NEO4J_PASSWORD    Database password
 *   SUPABASE_URL      Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service role key
 *   LOCKIN_GRAPH_USER_ID  User ID to sync
 */

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function log(level, message, data = {}) {
  process.stdout.write(JSON.stringify({ level, at: new Date().toISOString(), message, ...data }) + '\n');
}

function hasNeo4j() {
  return Boolean(NEO4J_URI && NEO4J_USERNAME && NEO4J_PASSWORD);
}

async function supabase(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Supabase ${path} failed: ${response.status}`);
  return response.json();
}

async function cypher(statement, parameters = {}) {
  const endpoint = `${NEO4J_URI.replace(/\/$/, '')}/db/neo4j/tx/commit`;
  const token = Buffer.from(`${NEO4J_USERNAME}:${NEO4J_PASSWORD}`).toString('base64');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ statements: [{ statement, parameters }] }),
  });
  const data = await response.json();
  if (!response.ok || data.errors?.length) throw new Error(JSON.stringify(data.errors ?? data));
  return data;
}

async function runMany(statements) {
  // Batch multiple statements in a single transaction
  const endpoint = `${NEO4J_URI.replace(/\/$/, '')}/db/neo4j/tx/commit`;
  const token = Buffer.from(`${NEO4J_USERNAME}:${NEO4J_PASSWORD}`).toString('base64');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ statements }),
  });
  const data = await response.json();
  if (!response.ok || data.errors?.length) throw new Error(JSON.stringify(data.errors ?? data));
  return data;
}

async function main() {
  if (!hasNeo4j()) {
    log('info', 'Neo4j credentials absent — graph sync skipped. Set NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD to enable.');
    return;
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Supabase service credentials are required.');
  const userId = process.env.LOCKIN_GRAPH_USER_ID;
  if (!userId) throw new Error('LOCKIN_GRAPH_USER_ID is required.');

  log('info', 'Graph sync started', { userId });

  const [tasks, pages, sessions, interruptions, insights, tags] = await Promise.all([
    supabase(`tasks?user_id=eq.${userId}&select=id,title,priority,done,page_id`),
    supabase(`pages?user_id=eq.${userId}&select=id,title,tag_id`),
    supabase(`focus_sessions?user_id=eq.${userId}&select=id,target_type,target_page_id,target_task_id,target_title,completed,interrupted,duration_minutes,started_at`),
    supabase(`interruptions?user_id=eq.${userId}&select=id,session_id,reason`),
    supabase(`ai_insights?user_id=eq.${userId}&select=id,kind,title,related_session_id,related_task_id`).catch(() => []),
    supabase(`tags?user_id=eq.${userId}&select=id,name`).catch(() => []),
  ]);

  log('info', 'Data fetched', { tasks: tasks.length, pages: pages.length, sessions: sessions.length, interruptions: interruptions.length, insights: insights.length });

  // Ensure user node
  await cypher('MERGE (u:User {id: $userId}) SET u.updatedAt = $now', { userId, now: new Date().toISOString() });

  // Tags
  for (const tag of tags) {
    await cypher('MERGE (t:Tag {id: $id}) SET t.name=$name', tag);
  }

  // Pages (batch)
  for (const page of pages) {
    const stmts = [
      { statement: 'MATCH (u:User {id:$userId}) MERGE (p:Page {id:$id}) SET p.title=$title MERGE (u)-[:OWNS]->(p)', parameters: { userId, ...page } },
    ];
    if (page.tag_id) {
      stmts.push({ statement: 'MATCH (p:Page {id:$pageId}), (t:Tag {id:$tagId}) MERGE (p)-[:TAGGED]->(t)', parameters: { pageId: page.id, tagId: page.tag_id } });
    }
    await runMany(stmts);
  }

  // Tasks
  for (const task of tasks) {
    const stmts = [
      { statement: 'MATCH (u:User {id:$userId}) MERGE (t:Task {id:$id}) SET t.title=$title, t.priority=$priority, t.done=$done MERGE (u)-[:OWNS]->(t)', parameters: { userId, ...task } },
    ];
    if (task.page_id) {
      stmts.push({ statement: 'MATCH (t:Task {id:$taskId}), (p:Page {id:$pageId}) MERGE (t)-[:BELONGS_TO]->(p)', parameters: { taskId: task.id, pageId: task.page_id } });
    }
    await runMany(stmts);
  }

  // Sessions
  for (const session of sessions) {
    const stmts = [
      { statement: 'MATCH (u:User {id:$userId}) MERGE (s:Session {id:$id}) SET s.completed=$completed, s.interrupted=$interrupted, s.durationMinutes=$duration_minutes, s.startedAt=$started_at MERGE (u)-[:RAN]->(s)', parameters: { userId, ...session } },
    ];
    if (session.target_task_id) {
      stmts.push({ statement: 'MATCH (s:Session {id:$sessionId}), (t:Task {id:$taskId}) MERGE (s)-[:FOCUSED_ON]->(t)', parameters: { sessionId: session.id, taskId: session.target_task_id } });
    }
    if (session.target_page_id) {
      stmts.push({ statement: 'MATCH (s:Session {id:$sessionId}), (p:Page {id:$pageId}) MERGE (s)-[:FOCUSED_ON]->(p)', parameters: { sessionId: session.id, pageId: session.target_page_id } });
    }
    await runMany(stmts);
  }

  // Interruptions
  for (const interruption of interruptions) {
    const reason = interruption.reason || 'Unspecified';
    await cypher(
      'MATCH (s:Session {id:$sessionId}) MERGE (r:InterruptionReason {name: $reason}) MERGE (s)-[:INTERRUPTED_BY]->(r)',
      { sessionId: interruption.session_id, reason },
    );
  }

  // AI Insights
  for (const insight of insights) {
    const stmts = [
      { statement: 'MATCH (u:User {id:$userId}) MERGE (i:AIInsight {id:$id}) SET i.kind=$kind, i.title=$title MERGE (u)-[:HAS_INSIGHT]->(i)', parameters: { userId, ...insight } },
    ];
    if (insight.related_session_id) {
      stmts.push({ statement: 'MATCH (i:AIInsight {id:$insightId}), (s:Session {id:$sessionId}) MERGE (i)-[:RELATED_TO]->(s)', parameters: { insightId: insight.id, sessionId: insight.related_session_id } });
    }
    if (insight.related_task_id) {
      stmts.push({ statement: 'MATCH (i:AIInsight {id:$insightId}), (t:Task {id:$taskId}) MERGE (i)-[:RELATED_TO]->(t)', parameters: { insightId: insight.id, taskId: insight.related_task_id } });
    }
    await runMany(stmts);
  }

  const summary = { nodes: { users: 1, pages: pages.length, tasks: tasks.length, sessions: sessions.length, insights: insights.length, tags: tags.length }, edges: { interruptions: interruptions.length } };
  log('info', 'Neo4j graph sync complete', summary);
  process.stdout.write(JSON.stringify({ summary }) + '\n');
}

main().catch(error => {
  process.stderr.write(JSON.stringify({ level: 'fatal', at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error) }) + '\n');
  process.exit(1);
});