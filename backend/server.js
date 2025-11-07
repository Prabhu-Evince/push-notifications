const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const db = require('./knex'); // ✅ Using knex now

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Store online users: userId -> ws connection
const onlineUsers = new Map();

// ✅ WebSocket
wss.on('connection', (ws) => {
  let userId = null;

  ws.send(JSON.stringify({
    type: 'connection',
    message: '✅ WebSocket Connected Successfully!'
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'auth') {
        userId = data.userId;
        onlineUsers.set(userId, ws);

        await db('users')
          .insert({ user_id: userId, is_online: 1, last_seen: db.raw('NOW()') })
          .onConflict('user_id')
          .merge({ is_online: 1, last_seen: db.raw('NOW()') });

        ws.send(JSON.stringify({ type: 'auth_success', userId }));
        sendUnreadNotifications(userId, ws);
      }
    } catch (err) {
      console.log("WebSocket error:", err);
    }
  });

  ws.on('close', async () => {
    if (userId) {
      onlineUsers.delete(userId);
      await db('users').where({ user_id: userId }).update({ is_online: 0, last_seen: db.raw('NOW()') });
    }
  });
});

// ✅ Send unread notifications
async function sendUnreadNotifications(userId, ws) {
  const rows = await db('notifications')
    .where({ user_id: userId, is_read: 0 })
    .orderBy('created_at', 'desc');

  if (rows.length > 0) {
    ws.send(JSON.stringify({ type: 'unread_notifications', count: rows.length, notifications: rows }));
  }
}

// ✅ Try realtime push
function sendNotificationToUser(userId, notification) {
  const ws = onlineUsers.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'notification', data: notification }));
    return true;
  }
  return false;
}

// ✅ Send Notification to a single User
app.post('/api/notifications/send', async (req, res) => {
  const { email, title, message, type = 'info' } = req.body;

  if (!email || !title || !message) return res.status(400).json({ error: "Missing fields" });

  const user = await db('users').where({ email }).first();
  if (!user) return res.status(404).json({ error: "User not found" });

  const [id] = await db('notifications').insert({ user_id: user.user_id, title, message, type });

  const notification = { id, userId: user.user_id, title, message, type, created_at: new Date() };
  const sent = sendNotificationToUser(user.user_id, notification);

  res.json({ success: true, notification, delivery: sent ? "realtime" : "saved_for_later" });
});

// ✅ Fetch notifications
app.get('/api/notifications/:userId', async (req, res) => {
  const rows = await db('notifications')
    .where({ user_id: req.params.userId })
    .orderBy('created_at', 'desc');

  res.json({ success: true, notifications: rows });
});

// ✅ Mark read
app.put('/api/notifications/:id/read', async (req, res) => {
  await db('notifications').where({ id: req.params.id }).update({ is_read: 1 });
  res.json({ success: true });
});

// ✅ User Exists
app.post('/api/user/exists', async (req, res) => {
  const { email } = req.body;
  const user = await db('users').where({ email }).first();
  if (!user) return res.json({ exists: false });
  res.json({ exists: true, user });
});

// ✅ Register User (Custom user_id = count+1)
app.post('/api/user/register', async (req, res) => {
  const { email, role = 'user' } = req.body;
  const count = await db('users').count('* as total').first();
  const userId = count.total + 1;

  await db('users')
    .insert({ user_id: userId, email, role, is_online: 0, last_seen: db.raw('NOW()') })
    .onConflict('email')
    .ignore();

  res.json({ success: true, userId });
});

// ✅ Get all users
app.get('/api/users', async (req, res) => {
  const users = await db('users').orderBy('email');
  res.json({ success: true, users });
});

// ✅ Send notification to all in role
app.post('/api/notifications/send-role', async (req, res) => {
  const { role, title, message, type = 'info' } = req.body;
  const users = await db('users').where({ role });

  for (let u of users) {
    const [id] = await db('notifications').insert({ user_id: u.user_id, title, message, type });
    sendNotificationToUser(u.user_id, { id, userId: u.user_id, title, message, type, created_at: new Date() });
  }

  res.json({ success: true });
});

// ✅ Start server
server.listen(3001, () => console.log("🚀 Server running on 3001"));
