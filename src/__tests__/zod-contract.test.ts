import { z } from 'zod';
import { bodyContract, contractToApiDoc, zodContract, zodAdapter } from '../zod-contract';
import { zodToJsonSchema } from '../zod-to-json-schema';

describe('bodyContract', () => {
  const schema = z.object({
    name: z.string().min(1),
    universe: z.enum(['marvel', 'dc']),
  });

  it('builds OpenAPI requestBody from the same Zod schema', () => {
    const opts = bodyContract(schema, { tags: ['characters'], summary: 'Create' });
    const apiDoc = opts.apiDoc as { requestBody?: { content?: Record<string, { schema?: unknown }> }; tags?: string[] };
    expect(apiDoc?.requestBody?.content?.['application/json']?.schema).toEqual(
      zodToJsonSchema(schema),
    );
    expect(apiDoc?.tags).toEqual(['characters']);
  });

  it('validates via zodAdapter with the same schema', () => {
    const validator = zodAdapter(schema);
    const bad = validator({ name: '' }) as { valid: boolean; errors?: Array<{ field: string; message: string }> };
    expect(bad.valid).toBe(false);
    expect(bad.errors?.[0]?.field).toBe('name');
    const good = validator({ name: 'Iron Man', universe: 'marvel' }) as { valid: boolean; value: unknown };
    expect(good.valid).toBe(true);
    expect(good.value).toEqual({ name: 'Iron Man', universe: 'marvel' });
  });

  it('converts Zod 4 schemas to OpenAPI-compatible JSON Schema', () => {
    expect(zodToJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        universe: { type: 'string', enum: ['marvel', 'dc'] },
      },
      required: ['name', 'universe'],
      additionalProperties: false,
    });
  });

  it('contractToApiDoc includes default 400 response', () => {
    const doc = contractToApiDoc(zodContract(schema, 'body'), { summary: 'x' });
    expect(doc.responses?.['400']).toBeDefined();
  });
});
