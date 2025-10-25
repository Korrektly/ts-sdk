# Korrektly SDK

Official TypeScript/JavaScript SDK and tools for [Korrektly](https://korrektly.com) - ai powered search platform.

## Packages

This monorepo contains the following packages:

### [@korrektly/sdk](./packages/sdk)

Core TypeScript/JavaScript SDK for the Korrektly API.

**Features:**
- Hybrid, semantic, and full-text search
- Advanced filtering with boolean queries
- Autocomplete with prefix matching and trigram similarity
- Chunk management with rich metadata
- Full TypeScript support

**Installation:**
```bash
bun add @korrektly/sdk
# or npm install @korrektly/sdk
```

**Quick Start:**
```typescript
import { Korrektly } from '@korrektly/sdk';

const client = new Korrektly({
  apiToken: 'your-api-token',
});

const results = await client.search('dataset-id', {
  query: 'machine learning',
  limit: 10
});
```

[View full SDK documentation →](./packages/sdk)

### [@korrektly/vitepress](./packages/vitepress)

VitePress documentation adapter for automatically indexing your documentation and OpenAPI specifications.

**Features:**
- Automatic markdown/MDX indexing
- OpenAPI/Swagger spec integration
- Smart content chunking by headings
- Frontmatter support
- Batch uploads with retry logic
- CLI and programmatic usage

**Installation:**
```bash
bun add @korrektly/vitepress
# or npm install @korrektly/vitepress
```

**CLI Usage:**
```bash
export KORREKTLY_API_TOKEN="your-api-token"
export KORREKTLY_DATASET_ID="your-dataset-id"

korrektly-vitepress \
  --path ./docs \
  --root-url https://docs.example.com \
  --openapi-spec https://api.example.com/openapi.json
```

[View full VitePress adapter documentation →](./packages/vitepress)

## Development

This repository uses [Turborepo](https://turbo.build/repo) and [Bun](https://bun.sh) for development.

### Prerequisites

- [Bun](https://bun.sh) 1.3.1 or later
- Node.js 18 or later (for compatibility testing)

### Getting Started

**Install dependencies:**
```bash
bun install
```

**Build all packages:**
```bash
bun run build
```

**Run tests:**
```bash
bun test
```

**Lint and format:**
```bash
bun run check
```

### Working with Packages

**Build a specific package:**
```bash
turbo build --filter=@korrektly/sdk
```

**Run tests for a specific package:**
```bash
turbo test --filter=@korrektly/vitepress
```

**Develop with watch mode:**
```bash
turbo dev --filter=@korrektly/sdk
```

## Publishing

This repository uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

**Create a changeset:**
```bash
bun run changeset
```

**Publish packages:**
```bash
bun run publish-packages
```

## Repository Structure

```
korrektly-sdk/
├── packages/
│   ├── sdk/              # @korrektly/sdk - Core API client
│   └── vitepress/        # @korrektly/vitepress - VitePress adapter
├── .changeset/           # Changesets for version management
├── .github/              # GitHub Actions workflows
├── package.json          # Root package configuration
├── turbo.json           # Turborepo configuration
└── biome.json           # Biome linter/formatter config
```

## Scripts

- `bun run build` - Build all packages
- `bun run dev` - Run all packages in watch mode
- `bun run test` - Run tests for all packages
- `bun run check` - Lint and format all packages
- `bun run lint` - Lint all packages (no fixes)
- `bun run changeset` - Create a changeset for version management
- `bun run publish-packages` - Publish packages to npm

## License

MIT

## Links

- [Korrektly Platform](https://korrektly.com)
- [GitHub](https://github.com/korrektly/ts-sdk)