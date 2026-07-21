import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '../../common/errors/application-error.js';
import { createAuthenticate, requirePermission } from '../auth/auth-context.js';
import type { AuthRepository } from '../auth/auth-repository.js';
import type { TokenService } from '../auth/token-service.js';
import type { IntelligenceFilters, IntelligenceRepository } from './intelligence-repository.js';

interface Options { authRepository:AuthRepository;tokenService:TokenService;repository:IntelligenceRepository }
const filters=z.object({from:z.iso.date(),to:z.iso.date(),supplierId:z.uuid().optional(),categoryId:z.uuid().optional()}).refine(value=>value.from<=value.to,{message:'Initial date must not exceed final date',path:['to']});
function parse(value:unknown):IntelligenceFilters{const result=filters.safeParse(value);if(!result.success)throw new ApplicationError({code:'VALIDATION_ERROR',message:'Invalid request data',statusCode:400,details:result.error.issues});return result.data;}

export function intelligenceRoutes(app:FastifyInstance,options:Options):Promise<void>{
  const authenticate=createAuthenticate(options.authRepository,options.tokenService);
  const view=requirePermission('PAYABLE_TITLE_VIEW');
  app.get('/dashboard',{preHandler:[authenticate,view]},request=>options.repository.dashboard(parse(request.query)));
  app.get('/agenda',{preHandler:[authenticate,view]},request=>options.repository.agenda(parse(request.query)));
  return Promise.resolve();
}
