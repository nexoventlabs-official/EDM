import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDbs, closeDbs, isVoterDbOnline, isAppDbOnline } from './config/db.js';
import apiRoutes from './routes/index.js';
import { REPORTS_DIR } from './controllers/reportController.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json({ limit: '15mb' }));
app.use(morgan('dev'));

// Static HTML reports (Assembly_Reports / Booth_Reports). Booth reports load a
// relative lib/ (echarts) so they must be served as files, not inlined.
// Which assembly/booth a user may open is governed by /api/reports/documents.
app.use('/report-files', express.static(REPORTS_DIR));

app.get('/health', (req, res) =>
  res.json({ ok: true, voterDb: isVoterDbOnline(), appDb: isAppDbOnline() })
);

app.use('/api', apiRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDbs();
  const server = app.listen(PORT, () => console.log(`[edm] API listening on http://localhost:${PORT}`));
  const shutdown = async () => { await closeDbs(); server.close(() => process.exit(0)); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
