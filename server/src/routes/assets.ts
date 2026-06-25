import { Router } from 'express';
import axios from 'axios';

const router = Router();

const isAllowedImageHost = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'flagcdn.com' ||
    normalized.endsWith('.flagcdn.com') ||
    normalized === 'media.api-sports.io'
  );
};

router.get('/image', async (req, res) => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid image url' });
  }

  if (!['https:', 'http:'].includes(imageUrl.protocol) || !isAllowedImageHost(imageUrl.hostname)) {
    return res.status(400).json({ error: 'Image host is not allowed' });
  }

  try {
    const response = await axios.get(imageUrl.toString(), {
      responseType: 'stream',
      timeout: 12000,
      validateStatus: status => status >= 200 && status < 300
    });

    const contentType = String(response.headers['content-type'] || '');
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Url does not point to an image' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    response.data.pipe(res);
  } catch (error) {
    res.status(502).json({ error: 'Failed to load image' });
  }
});

export default router;
