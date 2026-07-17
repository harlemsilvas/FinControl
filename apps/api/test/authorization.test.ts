import { describe, expect, it, vi } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { createAuthenticate, requirePermission } from '../src/domains/auth/auth-context.js';
import type { AuthRepository, AuthUser } from '../src/domains/auth/auth-repository.js';
import type { TokenService } from '../src/domains/auth/token-service.js';

const baseUser: AuthUser = { id:'user-id',fullName:'User',email:'user@example.com',passwordHash:null,isMaster:false,roles:[],permissions:[] };
function request(user:AuthUser|null):FastifyRequest{return {authUser:user,authSessionId:null,headers:{}} as FastifyRequest;}

describe('authorization guards',()=>{
  it('allows a user with the required action permission',()=>{
    expect(()=>requirePermission('PAYMENT_CREATE')(request({...baseUser,permissions:['PAYMENT_CREATE']}))).not.toThrow();
  });
  it('allows the Master Operator independently of role mappings',()=>{
    expect(()=>requirePermission('ANY_PERMISSION')(request({...baseUser,isMaster:true}))).not.toThrow();
  });
  it('rejects missing permissions with a standardized forbidden error',()=>{
    expect(()=>requirePermission('PAYMENT_REVERSE')(request(baseUser))).toThrow('Insufficient permission');
  });
  it('rejects revoked sessions before loading the user',async()=>{
    const findActiveUserById=vi.fn();
    const repository={isSessionActive:vi.fn().mockResolvedValue(false),findActiveUserById} as unknown as AuthRepository;
    const tokens={verifyAccessToken:vi.fn().mockReturnValue({sub:'user-id',sid:'session-id'})} as unknown as TokenService;
    const req={headers:{authorization:'Bearer token'},authUser:null,authSessionId:null} as FastifyRequest;
    await expect(createAuthenticate(repository,tokens)(req)).rejects.toMatchObject({code:'UNAUTHORIZED',statusCode:401});
    expect(findActiveUserById).not.toHaveBeenCalled();
  });
});
