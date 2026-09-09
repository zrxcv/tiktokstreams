import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/events' });
const clients = new Set();

app.use(express.static(__dirname));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'stream.html')));

wss.on('connection', ws => {
  clients.add(ws);
  ws.send(JSON.stringify({ event: 'status', data: { connected: tiktokConnected } }));
  ws.on('close', () => clients.delete(ws));
});

function broadcast(payload) {
  const text = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(text);
  }
}

let tiktokConnected = false;
let tikfinitySocket = null;
let reconnectTimer = null;

const GIFT_NAME_MAP = new Map([
  ['rose', 'rose'], ['роза', 'rose'],
  ['meteor shower', 'meteor'], ['meteor', 'meteor'],
  ['метеорный дождь', 'meteor'], ['метеор', 'meteor'],
  ['galaxy', 'galaxy'], ['галактика', 'galaxy']
]);

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getGiftInfo(data) {
  const details = data.giftDetails || data.gift?.details || {};
  const extended = data.extendedGiftInfo || {};
  const name = details.giftName || extended.name || data.giftName || data.gift?.name || '';
  const id = data.giftId ?? data.gift?.id ?? details.giftId ?? null;
  const diamonds = Number(details.diamondCount ?? details.diamond_count ?? extended.diamond_count ?? data.diamondCount ?? data.gift?.diamondCount ?? 0);
  return { name: String(name), id, diamonds };
}

function mapGift(data) {
  const info = getGiftInfo(data);
  return { ...info, type: GIFT_NAME_MAP.get(normalize(info.name)) || null };
}

function handleGift(data) {
  const giftType = data.giftDetails?.giftType ?? data.giftType ?? data.gift?.giftType;
  const repeatEnd = data.repeatEnd === true;
  if (Number(giftType) === 1 && !repeatEnd) return;

  const info = mapGift(data);
  const user = data.user?.nickname || data.user?.uniqueId || data.user?.displayName || data.nickname || data.uniqueId || 'Зритель';
  const repeatCount = Math.max(1, Number(data.repeatCount || data.repeat_count || 1));

  console.log(`[GIFT] ${user}: ${info.name || 'unknown'} x${repeatCount} [${info.type || 'unmapped'}] id=${info.id}`);

  broadcast({ event: 'gift', data: {
    type: info.type,
    giftName: info.name,
    giftId: info.id,
    diamonds: info.diamonds,
    repeatCount,
    user,
    mapped: Boolean(info.type)
  }});
}

function connectTikFinity() {
  if (tikfinitySocket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(tikfinitySocket.readyState)) return;

  console.log('Connecting to TikFinity Event API at ws://127.0.0.1:21213/ ...');
  tikfinitySocket = new WebSocket('ws://127.0.0.1:21213/');

  tikfinitySocket.on('open', () => {
    tiktokConnected = true;
    console.log('Connected to TikFinity Event API.');
    broadcast({ event: 'status', data: { connected: true } });
  });

  tikfinitySocket.on('message', raw => {
    try {
      const message = JSON.parse(raw.toString());
      if (message.event === 'gift') handleGift(message.data || {});
    } catch (err) {
      console.error('Invalid TikFinity event:', err?.message || err);
    }
  });

  tikfinitySocket.on('close', () => {
    tiktokConnected = false;
    console.log('TikFinity Event API disconnected. Is TikFinity Desktop running and connected to your LIVE?');
    broadcast({ event: 'status', data: { connected: false } });
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectTikFinity, 3000);
  });

  tikfinitySocket.on('error', err => {
    console.error('TikFinity Event API:', err?.message || err);
  });
}

server.listen(PORT, () => {
  console.log(`RIFT stream controller: http://127.0.0.1:${PORT}`);
  console.log('TikTok event source: TikFinity Desktop Event API');
  console.log('Start TikFinity Desktop and connect it to your TikTok LIVE.');
  connectTikFinity();
});
