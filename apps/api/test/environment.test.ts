import { describe, expect, it } from 'vitest';
import { loadEnvironment } from '../src/config/environment.js';

describe('loadEnvironment', () => {
  it('parses required database settings and defaults', () => {
    const environment = loadEnvironment({
      DB_HOST: '127.0.0.1',
      DB_PORT: '5434',
      DB_NAME: 'fincontrol',
      DB_USER: 'fincontrol',
      DB_PASSWORD: 'test-password',
    });

    expect(environment).toMatchObject({
      API_HOST: '127.0.0.1',
      API_PORT: 3000,
      DB_PORT: 5434,
      NODE_ENV: 'development',
    });
  });

  it('rejects an incomplete configuration', () => {
    expect(() => loadEnvironment({})).toThrow('Invalid environment configuration');
  });
});

