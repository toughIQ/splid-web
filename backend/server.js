import express from 'express';
import { SplidClient } from 'splid-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const ENABLE_WRITES = process.env.ENABLE_WRITES === 'true';

app.use(express.json());
app.use(express.static(join(__dirname, '..', 'frontend')));

const clientCache = new Map();

async function getOrCreateClient(code) {
  const normalized = code.replace(/\s/g, '').toUpperCase();
  const cached = clientCache.get(normalized);
  if (cached && Date.now() - cached.createdAt < 30 * 60 * 1000) {
    return cached;
  }

  const client = new SplidClient();
  const groupRes = await client.group.getByInviteCode(code);
  const groupId = groupRes.result.objectId;

  const entry = { client, groupId, createdAt: Date.now() };
  clientCache.set(normalized, entry);
  return entry;
}

setInterval(() => {
  for (const [key, entry] of clientCache) {
    if (Date.now() - entry.createdAt > 30 * 60 * 1000) clientCache.delete(key);
  }
}, 5 * 60 * 1000);

function extractCode(req) {
  return req.body?.code || req.query?.code || null;
}

app.get('/api/data', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 'code parameter required' });

  try {
    const { client, groupId } = await getOrCreateClient(code);

    const [groupInfo, members, entries] = await Promise.all([
      client.groupInfo.getOneByGroup(groupId),
      client.person.getAllByGroup(groupId),
      client.entry.getAllByGroup(groupId),
    ]);

    const activeMembers = members.filter(m => !m.isDeleted);
    const activeEntries = entries.filter(e => !e.isDeleted);
    const balance = SplidClient.getBalance(activeMembers, activeEntries, groupInfo);
    const suggestedPayments = SplidClient.getSuggestedPayments(balance);

    res.json({
      readOnly: !ENABLE_WRITES,
      group: {
        objectId: groupId,
        name: groupInfo.name,
        defaultCurrencyCode: groupInfo.defaultCurrencyCode,
        customCategories: groupInfo.customCategories,
      },
      members: activeMembers.map(m => ({
        GlobalId: m.GlobalId,
        objectId: m.objectId,
        name: m.name,
        initials: m.initials,
      })),
      entries: activeEntries
        .sort((a, b) => {
          const da = a.date?.iso || a.createdGlobally?.iso || '';
          const db = b.date?.iso || b.createdGlobally?.iso || '';
          return db.localeCompare(da);
        })
        .map(e => formatEntry(e)),
      balance,
      suggestedPayments,
    });
  } catch (err) {
    console.error('Data error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to load group' });
  }
});

app.post('/api/entry/create', async (req, res) => {
  if (!ENABLE_WRITES) return res.status(403).json({ error: 'Read-only mode. Set ENABLE_WRITES=true to allow changes.' });

  const { code, title, amount, currencyCode, primaryPayer, profiteers, category } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  if (!title || !amount || !primaryPayer || !profiteers || !Array.isArray(profiteers) || profiteers.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { client, groupId } = await getOrCreateClient(code);

    await client.entry.expense.create({
      groupId,
      title,
      currencyCode: currencyCode || 'EUR',
      category: category || undefined,
      payers: [primaryPayer],
      date: new Date(),
    }, {
      amount: parseFloat(amount),
      profiteers,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Create entry error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/entry/delete', async (req, res) => {
  if (!ENABLE_WRITES) return res.status(403).json({ error: 'Read-only mode. Set ENABLE_WRITES=true to allow changes.' });

  const { code, entryObjectId } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  try {
    const { client, groupId } = await getOrCreateClient(code);

    const entries = await client.entry.getAllByGroup(groupId);
    const entry = entries.find(e => e.objectId === entryObjectId);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    entry.isDeleted = true;
    await client.entry.set(entry);

    res.json({ ok: true });
  } catch (err) {
    console.error('Delete entry error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function formatEntry(e) {
  const totalAmount = (e.items || []).reduce((sum, item) => sum + (item.AM || 0), 0);
  return {
    objectId: e.objectId,
    GlobalId: e.GlobalId,
    title: e.title || (e.items?.[0]?.T) || '',
    currencyCode: e.currencyCode || 'EUR',
    isPayment: e.isPayment || false,
    primaryPayer: e.primaryPayer,
    secondaryPayers: e.secondaryPayers || {},
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    items: (e.items || []).map(item => ({
      title: item.T || '',
      amount: item.AM || 0,
      profiteers: item.P?.P || {},
    })),
    category: e.category || null,
    date: e.date?.iso || e.createdGlobally?.iso || null,
  };
}

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Splid Web running on port ${PORT} (${ENABLE_WRITES ? 'read-write' : 'read-only'})`);
});
