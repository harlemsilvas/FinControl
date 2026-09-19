import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '../../common/errors/application-error.js';
import { createAuthenticate, requirePermission } from '../auth/auth-context.js';
import type { AuthRepository } from '../auth/auth-repository.js';
import type { TokenService } from '../auth/token-service.js';
import type { IntelligenceFilters, IntelligenceRepository, PayablesForecastFilters } from './intelligence-repository.js';

interface Options { authRepository:AuthRepository;tokenService:TokenService;repository:IntelligenceRepository }
const filters=z.object({from:z.iso.date(),to:z.iso.date(),supplierId:z.uuid().optional(),categoryId:z.uuid().optional(),companyId:z.uuid().optional()}).refine(value=>value.from<=value.to,{message:'Initial date must not exceed final date',path:['to']});
const payablesForecastFilters=z.object({
  from:z.iso.date(),
  to:z.iso.date(),
  companyId:z.uuid().optional(),
  supplierId:z.uuid().optional(),
  categoryId:z.uuid().optional(),
  status:z.enum(['ALL_PENDING','UPCOMING','OVERDUE']).default('ALL_PENDING'),
  search:z.string().trim().min(1).max(120).optional(),
  page:z.coerce.number().int().min(1).default(1),
  pageSize:z.coerce.number().int().min(1).max(100).default(20),
}).refine(value=>value.from<=value.to,{message:'Initial date must not exceed final date',path:['to']});
function parse(value:unknown):IntelligenceFilters{const result=filters.safeParse(value);if(!result.success)throw new ApplicationError({code:'VALIDATION_ERROR',message:'Invalid request data',statusCode:400,details:result.error.issues});return result.data;}
function parseForecast(value:unknown):PayablesForecastFilters{const result=payablesForecastFilters.safeParse(value);if(!result.success)throw new ApplicationError({code:'VALIDATION_ERROR',message:'Invalid request data',statusCode:400,details:result.error.issues});return result.data;}

export function intelligenceRoutes(app:FastifyInstance,options:Options):Promise<void>{
  const authenticate=createAuthenticate(options.authRepository,options.tokenService);
  const view=requirePermission('PAYABLE_TITLE_VIEW');
  app.get('/dashboard',{preHandler:[authenticate,view]},request=>options.repository.dashboard(parse(request.query)));
  app.get('/agenda',{preHandler:[authenticate,view]},request=>options.repository.agenda(parse(request.query)));
  app.get('/reports/payables-forecast',{preHandler:[authenticate,view]},request=>{
    const currentUser=request.authUser!;
    return options.repository.payablesForecast(parseForecast(request.query),{
      isMaster:currentUser.isMaster,
      companyIds:currentUser.companies.map(company=>company.id),
    });
  });
  return Promise.resolve();
}
