import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { OpenAPIV3 } from 'openapi-types';

const bearerSecurity: OpenAPIV3.SecurityRequirementObject[] = [{ bearerAuth: [] }];

export function registerOpenApi(app: FastifyInstance): void {
  const document: OpenAPIV3.Document = {
    openapi: '3.0.3',
    info: {
      title: 'FinControl API',
      version: '0.1.0',
      description: 'API do ERP Financeiro FinControl.',
    },
    servers: [
      { url: '/', description: 'Servidor atual' },
      { url: '/fincontrol', description: 'Publicacao em hrmmotos.com.br' },
    ],
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Cadastros' },
      { name: 'Financeiro' },
      { name: 'Inteligencia' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' },
            requestId: { type: 'string' },
            details: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'master@example.com' },
            password: { type: 'string', format: 'password', minLength: 8 },
          },
        },
        RefreshRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string', minLength: 32 } },
        },
        TokenResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            tokenType: { type: 'string', example: 'Bearer' },
            expiresIn: { type: 'integer', example: 900 },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            isMaster: { type: 'boolean' },
            roles: { type: 'array', items: { type: 'string' } },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
        ListResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { type: 'object', additionalProperties: true } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                total: { type: 'integer' },
              },
            },
          },
        },
        PayableTitleRequest: {
          type: 'object',
          required: [
            'supplierId',
            'categoryId',
            'documentTypeId',
            'documentNumber',
            'description',
            'issueDate',
            'originalAmount',
            'installments',
          ],
          properties: {
            supplierId: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
            documentTypeId: { type: 'string', format: 'uuid' },
            paymentTermId: { type: 'string', format: 'uuid', nullable: true },
            costCenterId: { type: 'string', format: 'uuid', nullable: true },
            documentNumber: { type: 'string', maxLength: 80 },
            documentSeries: { type: 'string', maxLength: 30, nullable: true },
            description: { type: 'string', maxLength: 255 },
            originCode: { type: 'string', enum: ['MANUAL', 'XML', 'INTEGRATION'], default: 'MANUAL' },
            issueDate: { type: 'string', format: 'date' },
            originalAmount: { type: 'number', minimum: 0.01 },
            discountAmount: { type: 'number', minimum: 0 },
            additionalAmount: { type: 'number', minimum: 0 },
            notes: { type: 'string', nullable: true },
            draft: { type: 'boolean' },
            duplicateConfirmed: { type: 'boolean' },
            installments: {
              type: 'array',
              minItems: 1,
              items: { $ref: '#/components/schemas/PayableInstallmentRequest' },
            },
          },
        },
        PayableInstallmentRequest: {
          type: 'object',
          required: ['installmentNumber', 'installmentCount', 'amount', 'dueDate', 'paymentMethodId'],
          properties: {
            installmentNumber: { type: 'integer', minimum: 1, example: 1 },
            installmentCount: { type: 'integer', minimum: 1, example: 1 },
            amount: { type: 'number', minimum: 0.01 },
            dueDate: { type: 'string', format: 'date' },
            paymentMethodId: { type: 'string', format: 'uuid' },
            notes: { type: 'string', nullable: true },
          },
        },
      },
    },
    paths: {
      '/health/live': {
        get: {
          tags: ['Health'],
          summary: 'Verifica se o processo da API esta vivo.',
          responses: { '200': { description: 'API viva' } },
        },
      },
      '/health/ready': {
        get: {
          tags: ['Health'],
          summary: 'Verifica se a API consegue acessar o PostgreSQL.',
          responses: { '200': { description: 'API pronta' }, '503': { description: 'Dependencia indisponivel' } },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Autentica usuario e retorna access token e refresh token.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
          },
          responses: {
            '200': { description: 'Login realizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } } },
            '401': { description: 'Credenciais invalidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Renova tokens usando um refresh token valido.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } } },
          },
          responses: { '200': { description: 'Tokens renovados' }, '401': { description: 'Refresh token invalido' } },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Revoga a sessao autenticada.',
          security: bearerSecurity,
          responses: { '204': { description: 'Sessao encerrada' }, '401': { description: 'Nao autenticado' } },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Retorna o usuario autenticado.',
          security: bearerSecurity,
          responses: { '200': { description: 'Usuario autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
        },
      },
      '/api/v1/suppliers': masterDataPath('Fornecedores'),
      '/api/v1/financial-categories': masterDataPath('Categorias financeiras'),
      '/api/v1/cost-centers': masterDataPath('Centros de custo'),
      '/api/v1/document-types': masterDataPath('Tipos de documento'),
      '/api/v1/payment-methods': masterDataPath('Formas de pagamento'),
      '/api/v1/payment-terms': masterDataPath('Condicoes de pagamento'),
      '/api/v1/banks': masterDataPath('Bancos'),
      '/api/v1/bank-accounts': masterDataPath('Contas bancarias'),
      '/api/v1/payables': {
        get: {
          tags: ['Financeiro'],
          summary: 'Lista titulos a pagar.',
          security: bearerSecurity,
          parameters: listParameters([{ name: 'status', in: 'query', schema: { type: 'string' } }]),
          responses: { '200': { description: 'Lista paginada' } },
        },
        post: {
          tags: ['Financeiro'],
          summary: 'Cria titulo a pagar com parcelas.',
          security: bearerSecurity,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PayableTitleRequest' } } },
          },
          responses: { '201': { description: 'Titulo criado' } },
        },
      },
      '/api/v1/payables/{id}': entityPath('Financeiro', 'Titulo a pagar'),
      '/api/v1/payables/{id}/cancel': actionPath('Financeiro', 'Cancela titulo a pagar', {
        reason: { type: 'string', minLength: 3, maxLength: 1000 },
      }),
      '/api/v1/payments': {
        post: {
          tags: ['Financeiro'],
          summary: 'Registra pagamento de parcela.',
          security: bearerSecurity,
          responses: { '201': { description: 'Pagamento criado' } },
        },
      },
      '/api/v1/payment-batches': {
        get: { tags: ['Financeiro'], summary: 'Lista lotes de pagamento.', security: bearerSecurity, responses: { '200': { description: 'Lotes' } } },
        post: { tags: ['Financeiro'], summary: 'Cria lote de pagamento.', security: bearerSecurity, responses: { '201': { description: 'Lote criado' } } },
      },
      '/api/v1/dashboard': intelligencePath('Dashboard financeiro'),
      '/api/v1/agenda': intelligencePath('Agenda financeira'),
    },
  };

  void app.register(swagger, {
    mode: 'static',
    specification: {
      document,
    },
  });

  void app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
    },
    staticCSP: true,
  });
}

function listParameters(extra: OpenAPIV3.ParameterObject[] = []): OpenAPIV3.ParameterObject[] {
  return [
    { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
    { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
    { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 } },
    ...extra,
  ];
}

function masterDataPath(label: string): OpenAPIV3.PathItemObject {
  return {
    get: {
      tags: ['Cadastros'],
      summary: `Lista ${label}.`,
      security: bearerSecurity,
      parameters: listParameters([{ name: 'active', in: 'query', schema: { type: 'boolean' } }]),
      responses: { '200': { description: 'Lista paginada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ListResponse' } } } } },
    },
    post: {
      tags: ['Cadastros'],
      summary: `Cria registro em ${label}.`,
      security: bearerSecurity,
      responses: { '201': { description: 'Registro criado' }, '400': { description: 'Dados invalidos' } },
    },
  };
}

function entityPath(tag: string, label: string): OpenAPIV3.PathItemObject {
  return {
    get: {
      tags: [tag],
      summary: `Consulta ${label}.`,
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Registro encontrado' }, '404': { description: 'Registro nao encontrado' } },
    },
    patch: {
      tags: [tag],
      summary: `Atualiza ${label}.`,
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Registro atualizado' }, '404': { description: 'Registro nao encontrado' } },
    },
  };
}

function actionPath(tag: string, summary: string, properties: Record<string, OpenAPIV3.SchemaObject>): OpenAPIV3.PathItemObject {
  return {
    post: {
      tags: [tag],
      summary,
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: Object.keys(properties),
              properties,
            },
          },
        },
      },
      responses: { '204': { description: 'Operacao concluida' } },
    },
  };
}

function intelligencePath(summary: string): OpenAPIV3.PathItemObject {
  return {
    get: {
      tags: ['Inteligencia'],
      summary,
      security: bearerSecurity,
      parameters: [
        { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        { name: 'supplierId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
      ],
      responses: { '200': { description: 'Resultado consultado' } },
    },
  };
}
