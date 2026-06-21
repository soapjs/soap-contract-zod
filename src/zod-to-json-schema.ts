/**
 * Minimal Zod → JSON Schema converter for OpenAPI request/response bodies.
 * Covers common shapes; extend switch cases or plug a full converter later.
 */
export function zodToJsonSchema(schema: any): Record<string, unknown> {
  if (schema && typeof schema.toJSONSchema === 'function') {
    const { $schema, ...jsonSchema } = schema.toJSONSchema();
    void $schema;
    return jsonSchema;
  }

  if (!schema || typeof schema !== 'object' || !('_def' in schema)) {
    return { type: 'object' };
  }

  const def = schema._def;
  const typeName = def.typeName ?? def.type;

  switch (typeName) {
    case 'ZodString':
    case 'string':
      return { type: 'string' };
    case 'ZodNumber':
    case 'number':
      return { type: 'number' };
    case 'ZodBoolean':
    case 'boolean':
      return { type: 'boolean' };
    case 'ZodEnum':
    case 'enum':
      return { type: 'string', enum: def.values ?? [] };
    case 'ZodNativeEnum':
      return { type: 'string', enum: Object.values(def.values ?? {}) };
    case 'ZodArray':
    case 'array':
      return {
        type: 'array',
        items: zodToJsonSchema(def.type ?? def.element),
      };
    case 'ZodOptional':
    case 'ZodDefault':
    case 'optional':
    case 'default':
      return zodToJsonSchema(def.innerType ?? def.type);
    case 'ZodObject': {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape ?? {};
      return zodObjectToJsonSchema(shape);
    }
    case 'object': {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape ?? {};
      return zodObjectToJsonSchema(shape);
    }
    default:
      return { type: 'object' };
  }
}

function zodObjectToJsonSchema(shape: Record<string, unknown>): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const fieldSchema = value as any;
    properties[key] = zodToJsonSchema(fieldSchema);
    if (!isOptionalOrDefault(fieldSchema)) {
      required.push(key);
    }
  }

  const out: Record<string, unknown> = { type: 'object', properties };
  if (required.length > 0) {
    out.required = required;
  }
  return out;
}

function isOptionalOrDefault(schema: any): boolean {
  const typeName = schema?._def?.typeName ?? schema?._def?.type;
  return typeName === 'ZodOptional'
    || typeName === 'ZodDefault'
    || typeName === 'optional'
    || typeName === 'default';
}
