const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const recordsPath = path.join(__dirname, 'records.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function readRecords() {
  if (!fs.existsSync(recordsPath)) {
    fs.writeFileSync(recordsPath, '[]\n', 'utf8');
  }

  const raw = fs.readFileSync(recordsPath, 'utf8');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

function writeRecords(records) {
  fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2) + '\n', 'utf8');
}

app.get('/api/records', (req, res) => {
  try {
    const records = readRecords()
      .sort((a, b) => Number(a.timeSeconds || 0) - Number(b.timeSeconds || 0))
      .slice(0, 100);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Unable to read records' });
  }
});

app.post('/api/records', (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || 'Player').trim().slice(0, 30) || 'Player';
    const timeSeconds = Math.max(0, Number(body.timeSeconds || 0));
    const mode = String(body.mode || '-').trim().slice(0, 20) || '-';
    const date = String(body.date || new Date().toISOString());

    const record = { name, timeSeconds, mode, date };
    const records = readRecords();
    records.push(record);

    const sorted = records
      .sort((a, b) => Number(a.timeSeconds || 0) - Number(b.timeSeconds || 0))
      .slice(0, 100);

    writeRecords(sorted);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: 'Unable to save record' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Pixel Puzzle server running at http://localhost:${port}`);
});
