/**
 * Custom Next.js Server with Socket.io Integration
 * 
 * This server enables real-time bidirectional communication
 * for admin panel updates during agent execution.
 * 
 * Features:
 * - Custom HTTP server for Socket.io
 * - Next.js standalone mode compatible
 * - Admin room management
 * - Graceful shutdown handling
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Initialize Socket.io
  const io = new SocketIOServer(server, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXTAUTH_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Store io instance globally for access from API routes
  global.io = io;

  // Socket connection handling
  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join admin room
    socket.on('join-admin', () => {
      socket.join('admin');
      console.log(`[Socket.io] Client ${socket.id} joined admin room`);
      socket.emit('joined-admin', { success: true });
    });

    // Leave admin room
    socket.on('leave-admin', () => {
      socket.leave('admin');
      console.log(`[Socket.io] Client ${socket.id} left admin room`);
    });

    // Ping-pong for connection health check
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Client disconnected: ${socket.id} (${reason})`);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`[Socket.io] Socket error for ${socket.id}:`, error);
    });
  });

  // Listen
  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃           🚀 SERVER READY                         ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Next.js:      http://${hostname}:${port}              ┃
┃  Socket.io:    ws://${hostname}:${port}/api/socket     ┃
┃  Mode:         ${dev ? 'DEVELOPMENT' : 'PRODUCTION'}                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
    `);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    
    // Close Socket.io connections
    io.close(() => {
      console.log('[Socket.io] All connections closed');
    });

    // Close HTTP server
    server.close(() => {
      console.log('[HTTP] Server closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('[Shutdown] Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
});
