import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Environment } from '../src/config/environment.js';
import type { Database } from '../src/infrastructure/database/database.js';
import { buildApp } from '../src/presentation/http/build-app.js';

const environment={NODE_ENV:'test',API_HOST:'127.0.0.1',API_PORT:3000,LOG_LEVEL:'silent',DB_HOST:'127.0.0.1',DB_PORT:5434,DB_NAME:'fincontrol',DB_USER:'fincontrol',DB_PASSWORD:'test',DB_POOL_MAX:10,DB_IDLE_TIMEOUT_MS:30000,DB_CONNECTION_TIMEOUT_MS:5000,AUTH_ACCESS_TOKEN_SECRET:'test-secret-that-is-at-least-32-characters-long',AUTH_ACCESS_TOKEN_TTL_SECONDS:900,AUTH_REFRESH_TOKEN_TTL_DAYS:30,AUTH_ISSUER:'fincontrol-api',AUTH_AUDIENCE:'fincontrol'} satisfies Environment;
const apps:ReturnType<typeof buildApp>[]=[];
afterEach(async()=>Promise.all(apps.splice(0).map(async app=>app.close())));
function app():ReturnType<typeof buildApp>{const database={query:vi.fn(),transaction:vi.fn(),checkHealth:vi.fn(),close:vi.fn()} as unknown as Database;const instance=buildApp({database,environment,logger:false});apps.push(instance);return instance;}

describe('HTTP contracts',()=>{
  it('rejects malformed login payloads with field details',async()=>{const response=await app().inject({method:'POST',url:'/auth/login',payload:{email:'invalid',password:'short'}});expect(response.statusCode).toBe(400);const body=response.json<{error:{code:string;details:unknown[]}}>();expect(body.error.code).toBe('VALIDATION_ERROR');expect(body.error.details.length).toBeGreaterThan(0);});
  it('protects master-data routes without a bearer token',async()=>{const response=await app().inject({method:'GET',url:'/api/v1/suppliers'});expect(response.statusCode).toBe(401);expect(response.json()).toMatchObject({error:{code:'UNAUTHORIZED'}});});
  it('protects financial routes without a bearer token',async()=>{const response=await app().inject({method:'POST',url:'/api/v1/payments',payload:{}});expect(response.statusCode).toBe(401);expect(response.json()).toMatchObject({error:{code:'UNAUTHORIZED'}});});
  it('maps PostgreSQL uniqueness violations to conflict responses',async()=>{const instance=app();instance.get('/test-conflict',()=>{throw Object.assign(new Error('duplicate'),{code:'23505',constraint:'uq_test'});});const response=await instance.inject({method:'GET',url:'/test-conflict'});expect(response.statusCode).toBe(409);expect(response.json()).toMatchObject({error:{code:'RESOURCE_CONFLICT',details:{constraint:'uq_test'}}});});
  it('maps invalid foreign keys to request errors',async()=>{const instance=app();instance.get('/test-reference',()=>{throw Object.assign(new Error('fk'),{code:'23503',constraint:'fk_test'});});const response=await instance.inject({method:'GET',url:'/test-reference'});expect(response.statusCode).toBe(400);expect(response.json()).toMatchObject({error:{code:'INVALID_REFERENCE'}});});
});
