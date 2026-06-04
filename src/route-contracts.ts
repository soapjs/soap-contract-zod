import type { RouteAdditionalOptions, ApiDocFragment } from '@soapjs/soap/http';
import { contractMiddleware } from './zod-contract';
import { normalizeContracts } from './types';
import type { HttpContract } from './types';

type OptionsWithContract = RouteAdditionalOptions & {
  contract?: HttpContract | HttpContract[];
  apiDoc?: ApiDocFragment;
};

/**
 * Express middlewares for every {@link HttpContract} on a route, plus legacy
 * `validation.request` when no Zod contract is present.
 */
export function buildContractMiddlewares(options?: RouteAdditionalOptions): any[] {
  if (!options) return [];

  const opts = options as OptionsWithContract;
  const middlewares: any[] = [];

  for (const contract of normalizeContracts(opts.contract)) {
    if (contract.kind === 'zod') {
      middlewares.push(contractMiddleware(contract as Parameters<typeof contractMiddleware>[0]));
    }
  }

  if (middlewares.length > 0) {
    return middlewares;
  }

  const validation = opts.validation;
  if (validation?.request?.schema && typeof validation.request.schema.validate === 'function') {
    return [(req: any, res: any, next: any) => {
      const { error } = validation.request!.schema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.details?.map((d: any) => d.message) ?? [error.message],
        });
      }
      next();
    }];
  }

  if (validation?.request?.validator === 'zod' && validation.request.schema) {
    middlewares.push(contractMiddleware({
      kind: 'zod',
      schema: validation.request.schema,
      target: 'body',
    }));
  }

  return middlewares;
}

/** Ensure `options.apiDoc` exists when a contract supplied doc metadata. */
export function mergeRouteApiDoc(options?: RouteAdditionalOptions): RouteAdditionalOptions | undefined {
  if (!options) return options;
  const opts = options as OptionsWithContract;
  if (opts.apiDoc) return opts;
  return opts;
}
