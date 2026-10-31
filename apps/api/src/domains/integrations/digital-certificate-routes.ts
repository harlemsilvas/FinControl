import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '../../common/errors/application-error.js';
import { createAuthenticate, requirePermission } from '../auth/auth-context.js';
import type { AuthRepository, AuthUser } from '../auth/auth-repository.js';
import type { TokenService } from '../auth/token-service.js';
import type { DigitalCertificateService } from './digital-certificate-service.js';

interface Options { authRepository:AuthRepository;tokenService:TokenService;service:DigitalCertificateService }
const idSchema=z.object({id:z.uuid()});
function user(request:{authUser?:AuthUser|null}):AuthUser{if(!request.authUser)throw new ApplicationError({code:'UNAUTHORIZED',message:'Authentication required',statusCode:401});return request.authUser;}

export function digitalCertificateRoutes(app:FastifyInstance,options:Options):Promise<void>{
  const auth=createAuthenticate(options.authRepository,options.tokenService);const manage=requirePermission('DIGITAL_CERTIFICATE_MANAGE');
  app.get('/digital-certificates',{preHandler:[auth,manage]},request=>options.service.list(user(request)));
  app.post('/digital-certificates',{preHandler:[auth,manage]},async(request,reply)=>{
    let companyId='';let displayName='';let password='';let fileName='';let mimeType='';let bytes:Buffer|null=null;
    for await(const part of request.parts()){
      if(part.type==='file'){fileName=part.filename;mimeType=part.mimetype;bytes=await part.toBuffer();continue;}
      const value=typeof part.value==='string'||typeof part.value==='number'?String(part.value):'';if(part.fieldname==='companyId')companyId=value;if(part.fieldname==='displayName')displayName=value;if(part.fieldname==='password')password=value;
    }
    const parsed=z.uuid().safeParse(companyId);if(!parsed.success||!bytes)throw new ApplicationError({code:'VALIDATION_ERROR',message:'Empresa e arquivo do certificado são obrigatórios.',statusCode:400});
    const result=await options.service.create({companyId:parsed.data,displayName,password,fileName,mimeType,bytes},user(request));
    return reply.status(201).send(result);
  });
  app.post('/digital-certificates/:id/validate',{preHandler:[auth,manage]},request=>{const parsed=idSchema.parse(request.params);return options.service.validate(parsed.id,user(request));});
  app.delete('/digital-certificates/:id',{preHandler:[auth,manage]},async(request,reply)=>{const parsed=idSchema.parse(request.params);await options.service.remove(parsed.id,user(request));return reply.status(204).send();});
  return Promise.resolve();
}
