// ─────────────────────────────────────────────
//  LocationCall  —  server.js
//  Runs on YOUR server (Node.js)
//  Serves operator.html and site.html
//  Acts as PeerJS signaling server
//  Sites announce themselves via Socket.io
//  Operator sees live sites, clicks Call
// ─────────────────────────────────────────────
//  Install:  npm install express peerjs socket.io
//  Run:      node server.js
//  Open:     http://YOUR-IP:3000/operator
//            http://YOUR-IP:3000/site
// ─────────────────────────────────────────────

const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const { PeerServer } = require('peer');
const path      = require('path');

const PORT = 3000;

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

// ── Serve HTML files ──
app.get('/operator', (req, res) => res.sendFile(path.join(__dirname, 'operator.html')));
app.get('/site',     (req, res) => res.sendFile(path.join(__dirname, 'site.html')));

// ── Attach PeerJS to same HTTP server on path /peerjs ──
const peerServer = PeerServer({ port: 3000, path: '/peerjs', server });
peerServer.on('connection',    c => console.log('Peer connected:',    c.id));
peerServer.on('disconnect',    c => console.log('Peer disconnected:', c.id));

// ── Socket.io — site registry ──
const liveSites = {};   // { siteId: { name, peerId, socketId, icon, zone } }

io.on('connection', socket => {

  // Site registers
  socket.on('site:register', data => {
    liveSites[data.siteId] = { ...data, socketId: socket.id };
    console.log(`Site registered: ${data.name} (${data.peerId})`);
    io.emit('registry:update', liveSites);   // broadcast to all operators
  });

  // Operator asks for current list
  socket.on('registry:get', () => {
    socket.emit('registry:update', liveSites);
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    const entry = Object.values(liveSites).find(s => s.socketId === socket.id);
    if (entry) {
      console.log(`Site offline: ${entry.name}`);
      delete liveSites[entry.siteId];
      io.emit('registry:update', liveSites);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n✅  LocationCall server running`);
  console.log(`   Operator : http://localhost:${PORT}/operator`);
  console.log(`   Site     : http://localhost:${PORT}/site`);
  console.log(`   PeerJS   : ws://localhost:${PORT}/peerjs\n`);
});
