import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const enabled=process.env.RUN_DATABASE_INTEGRATION==='true';
const suite=enabled?describe:describe.skip;
suite('PostgreSQL integration, transactions, concurrency and audit',()=>{
  let pool:Pool;
  beforeAll(()=>{pool=new Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,max:4,application_name:'fincontrol-phase-8-tests'});});
  afterAll(async()=>pool.end());

  it('connects to the real database without application objects in public',async()=>{
    const result=await pool.query(`SELECT current_database() database,(SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','v','m','S')) public_objects`);
    expect(result.rows[0]).toMatchObject({database:process.env.DB_NAME,public_objects:0});
  });
  it('rolls back data and audit together when a transaction fails',async()=>{
    const client=await pool.connect();const id=randomUUID();
    try{await client.query('BEGIN');await client.query(`INSERT INTO administracao.audit_events(domain_code,entity_name,entity_id,action_code,source_code) VALUES('DOM-002','PHASE8_TEST',$1,'ROLLBACK_TEST','TEST')`,[id]);await client.query('ROLLBACK');}finally{client.release();}
    const result=await pool.query(`SELECT 1 FROM administracao.audit_events WHERE entity_id=$1`,[id]);expect(result.rowCount).toBe(0);
  });
  it('enforces uniqueness under concurrent writes',async()=>{
    const name=`phase8-${randomUUID()}`;const insert=async():Promise<void>=>{await pool.query(`INSERT INTO financeiro.tags(name) VALUES($1) RETURNING id`,[name]);};
    const results=await Promise.allSettled([insert(),insert()]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);const rejected=results.find(r=>r.status==='rejected');expect((rejected as PromiseRejectedResult).reason).toMatchObject({code:'23505'});await pool.query(`DELETE FROM financeiro.tags WHERE name=$1`,[name]);
  });
  it('persists an immutable-style audit event for a committed operation',async()=>{
    const id=randomUUID();await pool.query(`INSERT INTO administracao.audit_events(domain_code,entity_name,entity_id,action_code,new_data,source_code) VALUES('DOM-002','PHASE8_TEST',$1,'COMMITTED_TEST',$2,'TEST')`,[id,JSON.stringify({verified:true})]);
    const result=await pool.query(`SELECT action_code,new_data FROM administracao.audit_events WHERE entity_id=$1`,[id]);expect(result.rows[0]).toMatchObject({action_code:'COMMITTED_TEST',new_data:{verified:true}});await pool.query(`DELETE FROM administracao.audit_events WHERE entity_id=$1`,[id]);
  });
});
