import express from 'express';
import multer from 'multer';
import CloneDetector from './CloneDetector.js';
import CloneStorage from './CloneStorage.js';
import FileStorage from './FileStorage.js';
import Timer from './Timer.js';

const PORT = process.env.PORT ?? 3000;
const upload = multer();
const detector = new CloneDetector();

const history = [];
let lastFileResult = null;

const app = express();
app.set('json spaces', 2);

app.get('/', (req, res) => {
  if (!lastFileResult) {
    res.send(`<!doctype html>
<html>
  <head>
    <title>Code Stream Consumer</title>
    <style>
      body { font-family: sans-serif; margin: 2rem; }
      a { color: #0366d6; }
    </style>
  </head>
  <body>
    <h1>Code Stream Consumer</h1>
    <p>No files have been processed yet.</p>
    <p><a href="/stats">View timing statistics</a></p>
  </body>
</html>`);
    return;
  }

  const clones = CloneStorage.all();
  const cloneItems = clones
    .map(
      (clone) => `
        <li>
          <strong>${clone.file}:${clone.startLine}-${clone.endLine}</strong>
          duplicates <strong>${clone.otherFile}:${clone.otherStart}-${clone.otherEnd}</strong>
        </li>`
    )
    .join('\n');

  res.send(`<!doctype html>
<html>
  <head>
    <title>Code Stream Consumer</title>
    <style>
      body { font-family: sans-serif; margin: 2rem; }
      table { border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 0.5rem; }
      ul { list-style: none; padding: 0; }
      li { margin-bottom: 0.25rem; }
      a { color: #0366d6; }
    </style>
  </head>
  <body>
    <h1>Last processed file</h1>
    <dl>
      <dt>Name</dt>
      <dd>${lastFileResult.name}</dd>
      <dt>Processed At</dt>
      <dd>${lastFileResult.processedAt.toISOString()}</dd>
      <dt>Duration</dt>
      <dd>${lastFileResult.durationMs.toFixed(2)} ms</dd>
      <dt>Lines</dt>
      <dd>${lastFileResult.totalLines}</dd>
    </dl>

    <h2>Detected Clones (${clones.length})</h2>
    <ul>${cloneItems}</ul>

    <p><a href="/stats">View timing statistics</a></p>
  </body>
</html>`);
});

app.get('/stats', (req, res) => {
  const rows = history
    .map(
      (entry) => `
        <tr>
          <td>${entry.index}</td>
          <td>${entry.name}</td>
          <td>${entry.durationMs.toFixed(2)}</td>
          <td>${entry.totalLines}</td>
          <td>${entry.perLineMs.toFixed(4)}</td>
          <td>${entry.processedAt.toISOString()}</td>
        </tr>`
    )
    .join('\n');

  res.send(`<!doctype html>
<html>
  <head>
    <title>Processing statistics</title>
    <style>
      body { font-family: sans-serif; margin: 2rem; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
      thead { background: #f5f5f5; }
      a { color: #0366d6; }
    </style>
  </head>
  <body>
    <h1>Processing statistics</h1>
    <p><a href="/">Back to overview</a></p>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>File</th>
          <th>Duration (ms)</th>
          <th>Lines</th>
          <th>ms / line</th>
          <th>Processed at</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </body>
</html>`);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', processedFiles: history.length });
});

app.get('/clones', (req, res) => {
  res.json(CloneStorage.all());
});

app.get('/files', (req, res) => {
  res.json(FileStorage.getAllFiles().map((file) => ({
    name: file.name,
    chunks: file.chunks.length,
    lines: file.lines.length
  })));
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const file = {
    name: req.file.originalname,
    contents: req.file.buffer.toString('utf-8')
  };

  const timer = new Timer(`process:${file.name}`);
  timer.start();
  detector.process(file);
  timer.stop();

  file.totalLines = file.contents.split(/\r?\n/).length;
  file.durationMs = timer.durationInMs();
  file.perLineMs = file.totalLines > 0 ? file.durationMs / file.totalLines : 0;
  file.processedAt = new Date();

  history.push({
    index: history.length + 1,
    name: file.name,
    durationMs: file.durationMs,
    totalLines: file.totalLines,
    perLineMs: file.perLineMs,
    processedAt: file.processedAt
  });

  lastFileResult = file;

  res.json({
    name: file.name,
    durationMs: file.durationMs,
    lines: file.totalLines,
    clones: file.instances
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`CodeStreamConsumer listening on port ${PORT}`);
});
