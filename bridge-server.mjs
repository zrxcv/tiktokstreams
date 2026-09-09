import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const TIKTOK_USERNAME = (process.env.TIKTOK_USERNAME || '').replace(/^@/, '').trim();

if (!TIKTOK_USERNAME) {
  console.error('Set TIKTOK_USERNAME first. Example: TIKTOK_USERNAME=myaccount npm start');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/events' });
const clients = new Set();

app.use(express.static(__dirname));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'stream.html')));

wss.on('connection', ws => {
  clients.add(ws);
  ws.send(JSON.stringify({ event: 'status', data: { connected: liveConnected, username: TIKTOK_USERNAME } }));
  ws.on('close', () => clients.delete(ws));
});

function broadcast(payload) {
  const text = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(text);
  }
}

let liveConnected = false;
let connection;

// Map real TikTok gifts to the three attacks already implemented in klawf.html.
// Names are checked case-insensitively. Unknown gifts are logged, but do not affect the game.
const GIFT_NAME_MAP = new Map([
  ['rose', 'rose'],
  ['роза', 'rose'],
  ['meteor shower', 'meteor'],
  ['meteor', 'meteor'],
  ['метеорный дождь', 'meteor'],
  ['метеор', 'meteor'],
  ['galaxy', 'galaxy'],
  ['галактика', 'galaxy']
]);

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getGiftInfo(data) {
  const details = data.giftDetails || data.gift?.details || {};
  const extended = data.extendedGiftInfo || {};
  const name = details.giftName || extended.name || data.giftName || data.gift?.name || '';
  const id = data.giftId ?? data.gift?.id ?? details.giftId ?? null;
  const diamonds = Number(
    details.diamondCount ?? details.diamond_count ?? extended.diamond_count ?? data.diamondCount ?? data.gift?.diamondCount ?? 0
  );
  return { name: String(name), id, diamonds };
}

function mapGift(data) {
  const info = getGiftInfo(data);
  const mapped = GIFT_NAME_MAP.get(normalize(info.name));
  return { ...info, type: mapped || null };
}

async function connect() {
  connection = new TikTokLiveConnection(TIKTOK_USERNAME, {
    enableExtendedGiftInfo: true,
    processInitialData: false
  });

  connection.on(WebcastEvent.CONNECTED, () => {
    liveConnected = true;
    console.log(`Connected to @${TIKTOK_USERNAME}`);
    broadcast({ event: 'status', data: { connected: true, username: TIKTOK_USERNAME } });
  });

  connection.on(WebcastEvent.DISCONNECTED, () => {
    liveConnected = false;
    console.log('TikTok disconnected');
    broadcast({ event: 'status', data: { connected: false, username: TIKTOK_USERNAME } });
  });

  connection.on(WebcastEvent.ERROR, err => {
    console.error('TikTok error:', err?.message || err);
    broadcast({ event: 'status', data: { connected: false, username: TIKTOK_USERNAME, error: String(err?.message || err) } });
  });

  connection.on(WebcastEvent.GIFT, data => {
    // Gift streaks emit intermediate events and a final repeatEnd event.
    // We process the final event for streak gifts to avoid double counting.
    const giftType = data.giftDetails?.giftType ?? data.giftType ?? data.gift?.giftType;
    const repeatEnd = data.repeatEnd === true;
    if (Number(giftType) === 1 && !repeatEnd) return;

    const info = mapGift(data);
    const user = data.user?.nickname || data.user?.uniqueId || data.user?.displayName || 'Зритель';
    const repeatCount = Math.max(1, Number(data.repeatCount || data.repeat_count || 1));

    console.log(`[GIFT] ${user}: ${info.name || 'unknown'} x${repeatCount} [${info.type || 'unmapped'}] id=${info.id}`);

    broadcast({
      event: 'gift',
      data: {
        type: info.type,
        giftName: info.name,
        giftId: info.id,
        diamonds: info.diamonds,
        repeatCount,
        user,
        mapped: Boolean(info.type)
      }
    });
  });

  try {
    await connection.connect();
  } catch (err) {
    liveConnected = false;
    console.error('Initial TikTok connection failed:', err?.message || err);
    broadcast({ event: 'status', data: { connected: false, username: TIKTOK_USERNAME, error: String(err?.message || err) } });
    setTimeout(connect, 5000);
  }
}

server.listen(PORT, () => {
  console.log(`RIFT stream controller: http://127.0.0.1:${PORT}`);
  console.log(`TikTok source: @${TIKTOK_USERNAME}`);
  connect();
});
