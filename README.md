# @soapjs/soap-contract-zod

One Zod schema for **request validation** and **OpenAPI** fragments — no duplicate JSON Schema definitions.

Depends only on **`@soapjs/soap`** (route `apiDoc` / `DecoratorRegistry`) and **`express`** (middleware shape). Does **not** require `@soapjs/soap-express` or `@soapjs/soap-openapi`.

## Install

```bash
npm install @soapjs/soap-contract-zod zod @soapjs/soap express
```

Use with `@soapjs/soap-express` controllers in your app if you like — that is an app choice, not a dependency of this package.

## Usage

```typescript
import { z } from 'zod';
import { Post, Controller } from '@soapjs/soap-express';
import { bodyContract } from '@soapjs/soap-contract-zod';

const CreateBody = z.object({ name: z.string(), universe: z.enum(['marvel', 'dc']) });

@Controller('/characters')
class CharactersController {
  @Post('/', bodyContract(CreateBody, { tags: ['characters'], summary: 'Create' }))
  async create() { /* ... */ }
}
```

`bodyContract()` sets `middlewares.pre` (Zod validation) and `apiDoc` (`ApiDocFragment` for `@soapjs/soap-openapi`).

## Peer dependencies

- `@soapjs/soap` >= 0.12.1
- `zod` >= 3.22
- `express` >= 4 (middleware only)
