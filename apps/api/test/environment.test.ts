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
      AUTH_ACCESS_TOKEN_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    });

    expect(environment).toMatchObject({
      API_HOST: '127.0.0.1',
      API_PORT: 3000,
      DB_PORT: 5434,
      NODE_ENV: 'development',
      SMTP_ENABLED: false,
    });
  });

  it('requires SMTP connection settings only when SMTP is enabled', () => {
    expect(() => loadEnvironment({
      DB_HOST: '127.0.0.1',
      DB_PORT: '5434',
      DB_NAME: 'fincontrol',
      DB_USER: 'fincontrol',
      DB_PASSWORD: 'test-password',
      AUTH_ACCESS_TOKEN_SECRET: 'test-secret-that-is-at-least-32-characters-long',
      SMTP_ENABLED: 'true',
    })).toThrow('SMTP_HOST');

    expect(loadEnvironment({
      DB_HOST: '127.0.0.1',
      DB_PORT: '5434',
      DB_NAME: 'fincontrol',
      DB_USER: 'fincontrol',
      DB_PASSWORD: 'test-password',
      AUTH_ACCESS_TOKEN_SECRET: 'test-secret-that-is-at-least-32-characters-long',
      SMTP_ENABLED: 'true',
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM_EMAIL: 'fincontrol@example.com',
    })).toMatchObject({ SMTP_ENABLED: true, SMTP_HOST: 'smtp.example.com' });
  });

  it('rejects an incomplete configuration', () => {
    expect(() => loadEnvironment({})).toThrow('Invalid environment configuration');
  });
});
