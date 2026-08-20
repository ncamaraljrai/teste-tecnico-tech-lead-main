import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { calculateConversionRate } from '../src/conversion.js';

describe('calculateConversionRate', () => {
  it('calculates a percentage with two decimal places', () => {
    expect(calculateConversionRate(1, 3)).toBe(33.33);
  });

  it('returns zero when there are no sends', () => {
    expect(calculateConversionRate(0, 0)).toBe(0);
  });
});

describe('GET /api/conversion-evolution', () => {
  const query = async (filters) => [{ date: '2024-01-01', channel: filters.channel || 'email', total: 100, converted: 28, rate: 28 }];
  const app = createApp({ query, checkDatabase: async () => {} });

  it('returns the filtered evolution', async () => {
    const response = await request(app).get('/api/conversion-evolution?from=2024-01-01&to=2024-01-07&channel=email');
    expect(response.status).toBe(200);
    expect(response.body.data[0].rate).toBe(28);
    expect(response.body.filters.channel).toBe('email');
  });

  it('supports the versioned API contract', async () => {
    const response = await request(app).get('/api/v1/conversion-rate/timeseries?start_date=2024-01-01&end_date=2024-01-07&channels=email,whatsapp');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.filters.channels).toEqual(['email', 'whatsapp']);
    expect(response.body.data[0].conversion_rate).toBe(28);
    expect(response.body.meta.conversion_rate_unit).toBe('percentage');
  });

  it('rejects invalid date ranges', async () => {
    const response = await request(app).get('/api/conversion-evolution?from=2024-02-01&to=2024-01-01');
    expect(response.status).toBe(400);
  });

  it('rejects unsupported granularity', async () => {
    const response = await request(app).get('/api/conversion-evolution?granularity=hour');
    expect(response.status).toBe(400);
  });

  it('rejects unknown parameters', async () => {
    const response = await request(app).get('/api/v1/conversion-rate/timeseries?unexpected=true');
    expect(response.status).toBe(400);
  });
});

describe('service readiness', () => {
  it('returns ready when the database check succeeds', async () => {
    const app = createApp({ query: async () => [], checkDatabase: async () => {} });
    const response = await request(app).get('/ready');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
  });

  it('returns 503 when the database check fails', async () => {
    const app = createApp({ query: async () => [], checkDatabase: async () => { throw new Error('db offline'); } });
    const response = await request(app).get('/ready');
    expect(response.status).toBe(503);
  });
});