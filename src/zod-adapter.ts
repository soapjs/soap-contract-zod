export interface ValidatorError {
  field: string;
  message: string;
}

export interface ValidatorResult {
  valid: boolean;
  value?: unknown;
  errors?: ValidatorError[];
}

export type ValidatorFn = (data: unknown) => ValidatorResult | Promise<ValidatorResult>;

/** Wrap a Zod-like schema (`safeParse`) into a {@link ValidatorFn}. */
export function zodAdapter(schema: ZodSchemaLike): ValidatorFn {
  return (data: unknown): ValidatorResult => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const issues = result.error?.issues ?? result.error?.errors ?? [];
      return {
        valid: false,
        errors: issues.map((e) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
          message: e.message,
        })),
      };
    }
    return { valid: true, value: result.data };
  };
}

export interface ZodSchemaLike {
  toJSONSchema?(): Record<string, unknown>;
  safeParse(data: unknown): {
    success: boolean;
    data?: unknown;
    error?: {
      errors?: Array<{ path: PropertyKey[]; message: string }>;
      issues?: Array<{ path: PropertyKey[]; message: string }>;
    };
  };
}
