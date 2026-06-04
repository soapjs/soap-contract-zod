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
    const bad = validator({ name: '' }) as { valid: boolean };
    expect(bad.valid).toBe(false);
    const good = validator({ name: 'Iron Man', universe: 'marvel' }) as { valid: boolean; value: unknown };
    expect(good.valid).toBe(true);
    expect(good.value).toEqual({ name: 'Iron Man', universe: 'marvel' });
  });

  it('contractToApiDoc includes default 400 response', () => {
    const doc = contractToApiDoc(zodContract(schema, 'body'), { summary: 'x' });
    expect(doc.responses?.['400']).toBeDefined();
  });
});
