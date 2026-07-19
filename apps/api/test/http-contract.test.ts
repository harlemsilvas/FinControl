import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Environment } from '../src/config/environment.js';
import type { Database } from '../src/infrastructure/database/database.js';
import { TokenService } from '../src/domains/auth/token-service.js';
import { buildApp } from '../src/presentation/http/build-app.js';

const environment={NODE_ENV:'test',API_HOST:'127.0.0.1',API_PORT:3000,LOG_LEVEL:'silent',DB_HOST:'127.0.0.1',DB_PORT:5434,DB_NAME:'fincontrol',DB_USER:'fincontrol',DB_PASSWORD:'test',DB_POOL_MAX:10,DB_IDLE_TIMEOUT_MS:30000,DB_CONNECTION_TIMEOUT_MS:5000,AUTH_ACCESS_TOKEN_SECRET:'test-secret-that-is-at-least-32-characters-long',AUTH_ACCESS_TOKEN_TTL_SECONDS:900,AUTH_REFRESH_TOKEN_TTL_DAYS:30,AUTH_ISSUER:'fincontrol-api',AUTH_AUDIENCE:'fincontrol'} satisfies Environment;
const apps:ReturnType<typeof buildApp>[]=[];
afterEach(async()=>Promise.all(apps.splice(0).map(async app=>app.close())));
function app():ReturnType<typeof buildApp>{const database={query:vi.fn(),transaction:vi.fn(),checkHealth:vi.fn(),close:vi.fn()} as unknown as Database;const instance=buildApp({database,environment,logger:false});apps.push(instance);return instance;}
const userId='11111111-1111-4111-8111-111111111111';
const sessionId='22222222-2222-4222-8222-222222222222';
function authenticatedApp():{instance:ReturnType<typeof buildApp>;token:string;query:ReturnType<typeof vi.fn>}{
  const token=new TokenService(environment).createAccessToken(userId,sessionId);
  const query=vi.fn((sql:string,values?:unknown[])=>{
    if(sql.includes('FROM administracao.auth_sessions'))return {rows:[{exists:1}],rowCount:1};
    if(sql.includes('FROM administracao.users'))return {rows:[{id:userId,full_name:'Operador Master',email:'master@example.com',password_hash:null,is_master:true,roles:['MASTER'],permissions:[]}],rowCount:1};
    if(sql.includes('count(*)::text'))return {rows:[{total:'0'}],rowCount:1};
    if(sql.includes('SELECT * FROM cadastros.financial_categories')){expect(values?.[0]).toBe(true);return {rows:[],rowCount:0};}
    return {rows:[],rowCount:0};
  });
  const database={query,transaction:vi.fn(),checkHealth:vi.fn(),close:vi.fn()} as unknown as Database;
  const instance=buildApp({database,environment,logger:false});apps.push(instance);return {instance,token,query};
}

describe('HTTP contracts',()=>{
  it('rejects malformed login payloads with field details',async()=>{const response=await app().inject({method:'POST',url:'/auth/login',payload:{email:'invalid',password:'short'}});expect(response.statusCode).toBe(400);const body=response.json<{error:{code:string;details:unknown[]}}>();expect(body.error.code).toBe('VALIDATION_ERROR');expect(body.error.details.length).toBeGreaterThan(0);});
  it('protects master-data routes without a bearer token',async()=>{const response=await app().inject({method:'GET',url:'/api/v1/suppliers'});expect(response.statusCode).toBe(401);expect(response.json()).toMatchObject({error:{code:'UNAUTHORIZED'}});});
  it('protects financial routes without a bearer token',async()=>{const response=await app().inject({method:'POST',url:'/api/v1/payments',payload:{}});expect(response.statusCode).toBe(401);expect(response.json()).toMatchObject({error:{code:'UNAUTHORIZED'}});});
  it('protects dashboard and agenda routes without a bearer token',async()=>{for(const path of ['dashboard','agenda']){const response=await app().inject({method:'GET',url:`/api/v1/${path}?from=2026-07-01&to=2026-07-31`});expect(response.statusCode).toBe(401);expect(response.json()).toMatchObject({error:{code:'UNAUTHORIZED'}});}});
  it('accepts active query filters used by frontend lookups',async()=>{const {instance,token}=authenticatedApp();for(const path of ['financial-categories','document-types']){const response=await instance.inject({method:'GET',url:`/api/v1/${path}?pageSize=100&active=true`,headers:{authorization:`Bearer ${token}`}});expect(response.statusCode).toBe(200);expect(response.json()).toMatchObject({data:[],page:1,pageSize:100,total:0});}});
  it('serves OpenAPI documentation',async()=>{const instance=app();const spec=await instance.inject({method:'GET',url:'/docs/json'});expect(spec.statusCode).toBe(200);expect(spec.json()).toMatchObject({openapi:'3.0.3',info:{title:'FinControl API'}});const docs=await instance.inject({method:'GET',url:'/docs'});expect(docs.statusCode).toBe(200);expect(docs.headers['content-type']).toContain('text/html');});
  it('maps PostgreSQL uniqueness violations to conflict responses',async()=>{const instance=app();instance.get('/test-conflict',function conflictRoute(){throw Object.assign(new Error('duplicate'),{code:'23505',constraint:'uq_test'});});const response=await instance.inject({method:'GET',url:'/test-conflict'});expect(response.statusCode).toBe(409);expect(response.json()).toMatchObject({error:{code:'RESOURCE_CONFLICT',details:{constraint:'uq_test'}}});});
  it('maps invalid foreign keys to request errors',async()=>{const instance=app();instance.get('/test-reference',function invalidReferenceRoute(){throw Object.assign(new Error('fk'),{code:'23503',constraint:'fk_test'});});const response=await instance.inject({method:'GET',url:'/test-reference'});expect(response.statusCode).toBe(400);expect(response.json()).toMatchObject({error:{code:'INVALID_REFERENCE'}});});
});
