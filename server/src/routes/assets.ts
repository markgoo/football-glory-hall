import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const imageCacheDir = path.resolve(process.cwd(), 'data', 'image-cache');
const imageCacheMaxAgeSeconds = 60 * 60 * 24 * 30;

const isAllowedImageHost = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'flagcdn.com' ||
    normalized.endsWith('.flagcdn.com') ||
    normalized === 'media.api-sports.io'
  );
};

const getCachePaths = (url: string) => {
  const key = crypto.createHash('sha256').update(url).digest('hex');
  return {
    imagePath: path.join(imageCacheDir, `${key}.img`),
    metaPath: path.join(imageCacheDir, `${key}.json`)
  };
};

const readCachedImage = async (url: string) => {
  const paths = getCachePaths(url);
  const [buffer, metaRaw] = await Promise.all([
    fs.readFile(paths.imagePath),
    fs.readFile(paths.metaPath, 'utf8')
  ]);
  const meta = JSON.parse(metaRaw) as { contentType?: string };
  return { buffer, contentType: meta.contentType || 'application/octet-stream' };
};

const writeCachedImage = async (url: string, buffer: Buffer, contentType: string) => {
  await fs.mkdir(imageCacheDir, { recursive: true });
  const paths = getCachePaths(url);
  await Promise.all([
    fs.writeFile(paths.imagePath, buffer),
    fs.writeFile(paths.metaPath, JSON.stringify({ url, contentType, cachedAt: new Date().toISOString() }))
  ]);
};

const sendImage = (res: any, buffer: Buffer, contentType: string) => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', `public, max-age=${imageCacheMaxAgeSeconds}, immutable`);
  res.setHeader('X-Image-Cache', 'HIT');
  res.send(buffer);
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

  const normalizedUrl = imageUrl.toString();

  try {
    const cached = await readCachedImage(normalizedUrl);
    return sendImage(res, cached.buffer, cached.contentType);
  } catch {
    // Cache miss, fetch below.
  }

  try {
    const response = await axios.get(normalizedUrl, {
      responseType: 'arraybuffer',
      timeout: 12000,
      validateStatus: status => status >= 200 && status < 300
    });

    const contentType = String(response.headers['content-type'] || '');
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Url does not point to an image' });
    }

    const buffer = Buffer.from(response.data);
    await writeCachedImage(normalizedUrl, buffer, contentType);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', `public, max-age=${imageCacheMaxAgeSeconds}, immutable`);
    res.setHeader('X-Image-Cache', 'MISS');
    res.send(buffer);
  } catch (error) {
    res.status(502).json({ error: 'Failed to load image' });
  }
});

export default router;
