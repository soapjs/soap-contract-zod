/**
 * Minimal Zod → JSON Schema converter for OpenAPI request/response bodies.
 * Covers common shapes; extend switch cases or plug a full converter later.
 */
export function zodToJsonSchema(schema: any): Record<string, unknown> {
  if (!schema || typeof schema !== 'object' || !('_def' in schema)) {
    return { type: 'object' };
  }

  const def = schema._def;
  const typeName = def.typeName as string | undefined;

  switch (typeName) {
    case 'ZodString':
      return { type: 'string' };
    case 'ZodNumber':
      return { type: 'number' };
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodEnum':
      return { type: 'string', enum: def.values ?? [] };
    case 'ZodNativeEnum':
      return { type: 'string', enum: Object.values(def.values ?? {}) };
    case 'ZodArray':
      return {
        type: 'array',
        items: zodToJsonSchema(def.type),
      };
    case 'ZodOptional':
    case 'ZodDefault':
      return zodToJsonSchema(def.innerType ?? def.type);
    case 'ZodObject': {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape ?? {};
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const fieldSchema = value as any;
        properties[key] = zodToJsonSchema(fieldSchema);
        const innerType = fieldSchema?._def?.typeName;
        if (innerType !== 'ZodOptional' && innerType !== 'ZodDefault') {
          required.push(key);
        }
      }

      const out: Record<string, unknown> = { type: 'object', properties };
      if (required.length > 0) {
        out.required = required;
      }
      return out;
    }
    default:
      return { type: 'object' };
  }
}
