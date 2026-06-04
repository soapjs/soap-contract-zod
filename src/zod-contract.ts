import type { RouteAdditionalOptions, ApiDocFragment } from '@soapjs/soap/http';
import type { HttpContract, RouteContractMeta } from './types';
import { zodToJsonSchema } from './zod-to-json-schema';
import { zodAdapter, type ZodSchemaLike } from './zod-adapter';
import {
  createBodyValidationMiddleware,
  createQueryValidationMiddleware,
  createParamsValidationMiddleware,
} from './validation-middleware';

export type { ZodSchemaLike } from './zod-adapter';
export { zodAdapter } from './zod-adapter';

function contractToApiDoc(
  contract: HttpContract<ZodSchemaLike>,
  meta: RouteContractMeta = {},
): ApiDocFragment {
  const jsonSchema = zodToJsonSchema(contract.schema);

  const apiDoc: ApiDocFragment = {
    tags: meta.tags,
    summary: meta.summary,
    description: meta.description,
    operationId: meta.operationId,
    deprecated: meta.deprecated,
    security: meta.security,
    responses: {
      '400': {
        description: 'Request validation failed',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      ...meta.responses,
    },
  };

  if (contract.target === 'body') {
    apiDoc.requestBody = {
      required: true,
      content: {
        'application/json': { schema: jsonSchema },
      },
    };
  } else if (contract.target === 'query' || contract.target === 'params') {
    const parameters = Object.entries(
      (jsonSchema.properties as Record<string, unknown>) ?? {},
    ).map(([name, propSchema]) => ({
      name,
      in: contract.target === 'query' ? ('query' as const) : ('path' as const),
      required: Array.isArray(jsonSchema.required)
        ? (jsonSchema.required as string[]).includes(name)
        : contract.target === 'params',
      schema: propSchema,
    }));
    apiDoc.parameters = [...(apiDoc.parameters ?? []), ...parameters];
  }

  return apiDoc;
}

function zodContract(schema: ZodSchemaLike, target: HttpContract['target']): HttpContract<ZodSchemaLike> {
  return { kind: 'zod', schema, target };
}

export function contractMiddleware(contract: HttpContract<ZodSchemaLike>) {
  const validator = zodAdapter(contract.schema);
  switch (contract.target) {
    case 'query':
      return createQueryValidationMiddleware(validator);
    case 'params':
      return createParamsValidationMiddleware(validator);
    default:
      return createBodyValidationMiddleware(validator);
  }
}

function contractRouteOptions(
  contract: HttpContract<ZodSchemaLike>,
  meta: RouteContractMeta,
): RouteAdditionalOptions {
  return {
    apiDoc: contractToApiDoc(contract, meta),
    middlewares: { pre: [contractMiddleware(contract)] },
  };
}

export function bodyContract(
  schema: ZodSchemaLike,
  meta: RouteContractMeta = {},
): RouteAdditionalOptions {
  return contractRouteOptions(zodContract(schema, 'body'), meta);
}

export function queryContract(
  schema: ZodSchemaLike,
  meta: RouteContractMeta = {},
): RouteAdditionalOptions {
  return contractRouteOptions(zodContract(schema, 'query'), meta);
}

export function paramsContract(
  schema: ZodSchemaLike,
  meta: RouteContractMeta = {},
): RouteAdditionalOptions {
  return contractRouteOptions(zodContract(schema, 'params'), meta);
}

export function mergeContracts(...slices: RouteAdditionalOptions[]): RouteAdditionalOptions {
  const apiDocs = slices.map((s) => s.apiDoc).filter(Boolean) as ApiDocFragment[];
  const mergedApiDoc = apiDocs.reduce<ApiDocFragment>(
    (acc, doc) => ({
      ...acc,
      ...doc,
      tags: doc.tags ?? acc.tags,
      parameters: [...(acc.parameters ?? []), ...(doc.parameters ?? [])],
      responses: { ...acc.responses, ...doc.responses },
      security: doc.security ?? acc.security,
    }),
    {},
  );

  const pre = slices.flatMap(
    (s) => (s.middlewares as { pre?: unknown[] } | undefined)?.pre ?? [],
  );

  return {
    apiDoc: Object.keys(mergedApiDoc).length > 0 ? mergedApiDoc : undefined,
    middlewares: pre.length > 0 ? { pre: pre as NonNullable<RouteAdditionalOptions['middlewares']>['pre'] } : undefined,
  };
}

export { contractToApiDoc, zodContract };
