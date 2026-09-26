import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const AUTH_SECRET = process.env.AUTH_SECRET || 'development-only-change-this-secret';
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const googleClient = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${APP_URL}/api/auth/google/callback`)
  : null;

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]', 'utf8');

const readUsers = () => JSON.parse(fs.readFileSync(usersFile, 'utf8'));
const writeUsers = (users) => fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
const getToken = (req) => req.headers.cookie?.match(/(?:^|;\s*)auth_token=([^;]+)/)?.[1];
const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name });
const setSession = (res, user) => {
  const token = jwt.sign({ sub: user.id }, AUTH_SECRET, { expiresIn: '7d' });
  res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
};
const currentUser = (req) => {
  try {
    const payload = jwt.verify(getToken(req), AUTH_SECRET);
    return readUsers().find((user) => user.id === payload.sub) || null;
  } catch {
    return null;
  }
};
const parseBody = (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; if (raw.length > 100000) reject(new Error('payload-too-large')); });
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('invalid-json')); } });
  req.on('error', reject);
});

app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.startsWith('/api/')) {
    parseBody(req).then((body) => { req.body = body; next(); }).catch(() => res.status(400).json({ error: 'JSON inválido.' }));
    return;
  }
  next();
});

app.post('/api/auth/signup', async (req, res) => {
  const { name = '', email = '', password = '' } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail || String(password).length < 8) return res.status(400).json({ error: 'Informe um e-mail e uma senha com pelo menos 8 caracteres.' });
  const users = readUsers();
  if (users.some((user) => user.email === normalizedEmail)) return res.status(409).json({ error: 'Este e-mail já possui uma conta.' });
  const user = { id: crypto.randomUUID(), email: normalizedEmail, name: String(name).trim() || normalizedEmail.split('@')[0], passwordHash: await bcrypt.hash(String(password), 12), provider: 'password', createdAt: new Date().toISOString() };
  users.push(user);
  writeUsers(users);
  setSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email = '', password = '' } = req.body;
  const user = readUsers().find((item) => item.email === String(email).trim().toLowerCase());
  if (!user || !user.passwordHash || !(await bcrypt.compare(String(password), user.passwordHash))) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  setSession(res, user);
  res.json({ user: publicUser(user) });
});

app.get('/api/auth/me', (req, res) => {
  const user = currentUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

app.post('/api/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ ok: true });
});

app.get('/api/auth/google', (req, res) => {
  if (!googleClient) return res.status(503).send('Google OAuth não configurado.');
  res.redirect(googleClient.generateAuthUrl({ access_type: 'offline', scope: ['openid', 'email', 'profile'], prompt: 'select_account' }));
});

app.get('/api/auth/google/callback', async (req, res) => {
  if (!googleClient || !req.query.code) return res.redirect('/?auth=error');
  try {
    const { tokens } = await googleClient.getToken(String(req.query.code));
    const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    const users = readUsers();
    let user = users.find((item) => item.googleId === profile.sub || item.email === profile.email);
    if (!user) {
      user = { id: crypto.randomUUID(), email: profile.email, name: profile.name || profile.email.split('@')[0], googleId: profile.sub, provider: 'google', createdAt: new Date().toISOString() };
      users.push(user);
    } else if (!user.googleId) {
      user.googleId = profile.sub;
    }
    writeUsers(users);
    setSession(res, user);
    res.redirect('/?auth=success');
  } catch (error) {
    console.error('Google OAuth error:', error.message);
    res.redirect('/?auth=error');
  }
});

// Determine directory to serve: dist/ if built, otherwise root
const staticDir = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
  ? path.join(__dirname, 'dist')
  : __dirname;

app.use(express.static(staticDir));

// Fallback for uppercase /BOLSONARO.png to bolsonaro.png
app.get('/BOLSONARO.png', (req, res) => {
  const filePath = path.join(staticDir, 'bolsonaro.png');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.status(404).end();
});

// Single page / static fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
