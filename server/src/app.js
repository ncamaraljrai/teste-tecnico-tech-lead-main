import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { checkDatabase as defaultCheckDatabase, getConversionEvolution } from './db.js';

const VALID_GRANULARITIES = new Set(['day', 'week', 'month']);
const MAX_RANGE_DAYS = 366;

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function parseChannels(value) {
  if (!value) return null;
  const channels = (Array.isArray(value) ? value : String(value).split(',')).map((channel) => channel.trim()).filter(Boolean);
  return channels.length && channels.every((channel) => /^[a-z0-9_-]{1,32}$/i.test(channel)) ? [...new Set(channels)] : undefined;
}

function daysBetween(start, end) {
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
}

export function createApp({ query = getConversionEvolution, checkDatabase = defaultCheckDatabase } = {}) {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json());

  app.get('/health', (_request, response) => response.json({ status: 'ok' }));

  app.get('/ready', async (_request, response) => {
    try {
      await checkDatabase();
      return response.json({ status: 'ready' });
    } catch {
      return response.status(503).json({ status: 'not_ready' });
    }
  });

  const conversionEvolution = async (request, response) => {
    const isVersioned = request.path.startsWith('/api/v1/');
    const allowedParams = isVersioned ? new Set(['start_date', 'end_date', 'channels', 'granularity']) : new Set(['from', 'to', 'channel', 'granularity']);
    const unknownParam = Object.keys(request.query).find((key) => !allowedParams.has(key));
    if (unknownParam) return response.status(400).json({ error: `Parâmetro desconhecido: ${unknownParam}.` });
    const { granularity = 'day' } = request.query;
    const startInput = isVersioned ? request.query.start_date : request.query.from;
    const endInput = isVersioned ? request.query.end_date : request.query.to;
    const channelInput = isVersioned ? request.query.channels : request.query.channel;
    const today = new Date().toISOString().slice(0, 10);
    const start = startInput || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const end = endInput || today;
    const channels = parseChannels(channelInput);

    if (!isIsoDate(start) || !isIsoDate(end) || start > end) {
      return response.status(400).json({ error: 'As datas devem estar no formato YYYY-MM-DD, com início menor ou igual ao fim.' });
    }
    if (channels === undefined) {
      return response.status(400).json({ error: 'channels/channel contém um canal inválido.' });
    }
    if (!VALID_GRANULARITIES.has(granularity)) {
      return response.status(400).json({ error: 'granularity deve ser day, week ou month.' });
    }
    if (daysBetween(start, end) > MAX_RANGE_DAYS) {
      return response.status(400).json({ error: `O intervalo máximo permitido é de ${MAX_RANGE_DAYS} dias.` });
    }

    try {
      const data = await query({ from: start, to: end, channel: channels, granularity });
      if (isVersioned) {
        return response.json({
          filters: { start_date: start, end_date: end, channels: channels || [], granularity },
          data: data.map((item) => ({ period: item.date, channel: item.channel, eligible_count: item.total, conversion_count: item.converted, conversion_rate: item.rate })),
          meta: { timezone: 'UTC', conversion_rate_unit: 'percentage' }
        });
      }
      return response.json({ filters: { from: start, to: end, channel: channels?.[0] || null, granularity }, data });
    } catch (error) {
      console.error(JSON.stringify({ event: 'conversion_query_failed', message: error.message }));
      return response.status(500).json({ error: 'Não foi possível consultar a evolução de conversão.' });
    }
  };

  app.get('/api/v1/conversion-rate/timeseries', conversionEvolution);
  app.get('/api/conversion-evolution', conversionEvolution);

  return app;
}