/**
 * Bull Board UI - Queue Monitoring Dashboard
 *
 * Accessible at: /admin/queues
 *
 * Shows all 5 queues:
 * - collected-articles
 * - relevant-articles
 * - unique-articles
 * - enriched-articles
 * - articles-with-visuals
 */

import { NextResponse } from "next/server";
import { getQueue, QUEUE_NAMES, getAllQueueStats } from "@/lib/queue-manager";

/**
 * GET /api/admin/queues
 * Returns Bull Board UI HTML
 */
export async function GET() {
  // Check if queues are available
  const stats = await getAllQueueStats();

  if (!stats || stats.length === 0) {
    return NextResponse.json(
      { error: "Queues not available (Redis not connected)" },
      { status: 503 },
    );
  }

  // Simple HTML UI for Bull Board
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Queue Monitor - Multi-Agent News Pipeline</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 2rem;
    }
    
    .header {
      margin-bottom: 2rem;
    }
    
    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(to right, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .subtitle {
      color: #94a3b8;
      font-size: 0.875rem;
    }
    
    .queues {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .queue-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 1.5rem;
      transition: all 0.2s;
    }
    
    .queue-card:hover {
      border-color: #3b82f6;
      transform: translateY(-2px);
    }
    
    .queue-name {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #3b82f6;
    }
    
    .queue-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    
    .stat {
      display: flex;
      flex-direction: column;
    }
    
    .stat-label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      margin-top: 0.25rem;
    }
    
    .stat-value.active { color: #10b981; }
    .stat-value.waiting { color: #f59e0b; }
    .stat-value.completed { color: #3b82f6; }
    .stat-value.failed { color: #ef4444; }
    
    .pipeline {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 2rem;
      margin-bottom: 2rem;
    }
    
    .pipeline-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    
    .pipeline-flow {
      display: flex;
      align-items: center;
      gap: 1rem;
      overflow-x: auto;
      padding: 1rem 0;
    }
    
    .pipeline-step {
      flex-shrink: 0;
      background: #334155;
      padding: 1rem 1.5rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
    }
    
    .pipeline-arrow {
      flex-shrink: 0;
      color: #64748b;
      font-size: 1.5rem;
    }
    
    .actions {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: #3b82f6;
      color: white;
    }
    
    .btn-primary:hover {
      background: #2563eb;
    }
    
    .btn-secondary {
      background: #334155;
      color: #e2e8f0;
    }
    
    .btn-secondary:hover {
      background: #475569;
    }
    
    .refresh-info {
      color: #94a3b8;
      font-size: 0.875rem;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 Multi-Agent News Pipeline</h1>
    <p class="subtitle">Real-time queue monitoring and management</p>
  </div>
  
  <div class="pipeline">
    <div class="pipeline-title">Pipeline Flow</div>
    <div class="pipeline-flow">
      <div class="pipeline-step">1. Content Collector</div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">2. Relevance Filter</div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">3. Duplicate Detector</div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">4. Content Enricher</div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">5. Visual Generator</div>
    </div>
  </div>
  
  <div class="actions">
    <button class="btn btn-primary" onclick="refreshStats()">🔄 Refresh Stats</button>
    <button class="btn btn-secondary" onclick="triggerCollection()">▶️ Trigger Collection</button>
  </div>
  
  <div class="queues" id="queues">
    <div class="queue-card">
      <div class="queue-name">Loading...</div>
      <div class="queue-stats">
        <div class="stat">
          <span class="stat-label">Status</span>
          <span class="stat-value">Fetching data...</span>
        </div>
      </div>
    </div>
  </div>
  
  <div class="refresh-info">
    Auto-refresh every 10 seconds
  </div>
  
  <script>
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/queues/stats');
        const data = await response.json();
        
        if (data.error) {
          document.getElementById('queues').innerHTML = \`
            <div class="queue-card">
              <div class="queue-name">Error</div>
              <div class="queue-stats">
                <div class="stat">
                  <span class="stat-label">Message</span>
                  <span class="stat-value failed">\${data.error}</span>
                </div>
              </div>
            </div>
          \`;
          return;
        }
        
        const queuesHtml = data.queues.map(queue => \`
          <div class="queue-card">
            <div class="queue-name">\${queue.queueName}</div>
            <div class="queue-stats">
              <div class="stat">
                <span class="stat-label">Active</span>
                <span class="stat-value active">\${queue.active}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Waiting</span>
                <span class="stat-value waiting">\${queue.waiting}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Completed</span>
                <span class="stat-value completed">\${queue.completed}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Failed</span>
                <span class="stat-value failed">\${queue.failed}</span>
              </div>
            </div>
          </div>
        \`).join('');
        
        document.getElementById('queues').innerHTML = queuesHtml;
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    }
    
    async function refreshStats() {
      await fetchStats();
    }
    
    async function triggerCollection() {
      try {
        const response = await fetch('/api/admin/queues/trigger', {
          method: 'POST'
        });
        const data = await response.json();
        alert(data.message || 'Collection triggered');
        await fetchStats();
      } catch (error) {
        alert('Failed to trigger collection: ' + error.message);
      }
    }
    
    // Initial load
    fetchStats();
    
    // Auto-refresh every 10 seconds
    setInterval(fetchStats, 10000);
  </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
