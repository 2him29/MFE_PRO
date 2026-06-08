import { Router, Request, Response } from 'express';
import https from 'https';

const router = Router();

const ORS_KEY =
  process.env.ORS_API_KEY ||
  'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImI2YWU0NzY5ZmY2YjRiNmI5ZjcxN2FiYjM1ZjBlMDcyIiwiaCI6Im11cm11cjY0In0=';
const ORS_BASE = 'https://api.openrouteservice.org/v2/directions/driving-car';

// GET /api/app/route?startLng=&startLat=&endLng=&endLat=
// Public endpoint — proxies ORS so the phone does not need direct internet access.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { startLng, startLat, endLng, endLat } = req.query;
  if (!startLng || !startLat || !endLng || !endLat) {
    res.status(400).json({ error: 'startLng, startLat, endLng, endLat are required' });
    return;
  }

  const url = `${ORS_BASE}?api_key=${ORS_KEY}&start=${startLng},${startLat}&end=${endLng},${endLat}`;

  const orsReq = https.get(url, { headers: { Accept: 'application/geo+json' } }, (orsRes) => {
    let data = '';
    orsRes.on('data', (chunk: string) => { data += chunk; });
    orsRes.on('end', () => {
      if (orsRes.statusCode !== 200) {
        res.status(502).json({ error: `ORS error ${orsRes.statusCode}: ${data.slice(0, 200)}` });
        return;
      }
      res.setHeader('Content-Type', 'application/geo+json');
      res.send(data);
    });
  });

  orsReq.setTimeout(15_000, () => {
    orsReq.destroy();
    if (!res.headersSent) res.status(504).json({ error: 'ORS request timed out' });
  });

  orsReq.on('error', (err: Error) => {
    if (!res.headersSent) res.status(502).json({ error: err.message });
  });
});

export default router;
