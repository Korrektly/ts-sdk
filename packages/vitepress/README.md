# @korrektly/vitepress

VitePress documentation adapter for Korrektly - automatically index your VitePress documentation and OpenAPI specifications into Korrektly's platform.

## Features

- **Markdown/MDX Support**: Automatically extracts and indexes all `.md` and `.mdx` files from your VitePress docs
- **OpenAPI Integration**: Parse and index OpenAPI/Swagger specifications
- **Smart Chunking**: Intelligently splits content by headings for optimal search results
- **Frontmatter Support**: Extracts title, subtitle, slug, and custom metadata
- **Batch Upload**: Efficiently uploads chunks in batches with automatic retry logic
- **Incremental Updates**: Uses upsert strategy to update existing chunks
- **Portable**: Works with Node.js, Bun, and Deno

## Installation

```bash
# Using bun
bun add @korrektly/vitepress

# Using npm
npm install @korrektly/vitepress

# Using pnpm
pnpm add @korrektly/vitepress
```

## Quick Start

### CLI Usage

```bash
# Set required environment variables
export KORREKTLY_API_TOKEN="your-api-token"
export KORREKTLY_DATASET_ID="your-dataset-id"

# Index your VitePress docs
korrektly-vitepress \
  --path ./docs \
  --root-url https://docs.example.com

# Include OpenAPI spec
korrektly-vitepress \
  --path ./docs \
  --root-url https://docs.example.com \
  --openapi-spec https://api.example.com/openapi.json \
  --api-ref-path api-reference
```

### Programmatic Usage

```typescript
import { Korrektly } from '@korrektly/sdk';
import {
  extractMarkdownPaths,
  extractChunksFromMarkdown,
  extractChunksFromOpenAPI,
} from '@korrektly/vitepress';

// Initialize Korrektly client
const client = new Korrektly({
  apiToken: 'your-api-token',
});

// Extract markdown chunks
const markdownPaths = await extractMarkdownPaths('./docs');
const chunks = [];

for (const path of markdownPaths) {
  const fileChunks = await extractChunksFromMarkdown(
    path,
    'https://docs.example.com'
  );
  chunks.push(...fileChunks);
}

// Extract OpenAPI chunks
const apiChunks = await extractChunksFromOpenAPI(
  'https://api.example.com/openapi.json',
  'https://docs.example.com',
  'api-reference'
);
chunks.push(...apiChunks);

// Upload to Korrektly
await client.createChunks('your-dataset-id', { chunks });
```

## Configuration

### Environment Variables

| Variable               | Required | Description                                |
| ---------------------- | -------- | ------------------------------------------ |
| `KORREKTLY_API_TOKEN`  | Yes      | Your Korrektly API token                   |
| `KORREKTLY_DATASET_ID` | No*      | Dataset ID (can also use `--dataset` flag) |
| `KORREKTLY_BASE_URL`   | No       | API base URL (defaults to production)      |

*Required unless provided via `--dataset` CLI flag

### CLI Options

| Option                      | Description                                 |
| --------------------------- | ------------------------------------------- |
| `-p, --path <path>`         | Path to VitePress docs directory (required) |
| `-d, --dataset <id>`        | Dataset ID (overrides env var)              |
| `-r, --root-url <url>`      | Root URL for source URLs                    |
| `-s, --openapi-spec <url>`  | URL of OpenAPI specification file           |
| `-a, --api-ref-path <path>` | API reference path prefix (default: "api")  |

## Frontmatter Support

The adapter recognizes the following frontmatter fields:

```yaml
---
title: Page Title
subtitle: Page Subtitle
description: Page description
slug: custom-slug
weight: 1.5  # Boost important pages (default: 1.0)
---
```

- **title**: Main page title (used in semantic content)
- **subtitle**: Subtitle/description (used in semantic content)
- **slug**: Custom URL slug (defaults to file path)
- **weight**: Search ranking weight (1.0 = normal, >1.0 = boosted)
- **description**: Page description (added to metadata)

## How It Works

### Markdown Processing

1. **File Discovery**: Recursively scans directory for `.md` and `.mdx` files
2. **Frontmatter Parsing**: Extracts YAML frontmatter from files
3. **Markdown to HTML**: Converts markdown to HTML using `marked`
4. **Section Splitting**: Splits content by headings (h1-h6)
5. **Chunk Creation**: Creates searchable chunks with:
   - `chunk_html`: HTML content for display
   - `semantic_content`: Optimized text for embedding/search
   - `source_url`: Link back to documentation
   - `tag_set`: File path hierarchy for filtering
   - `metadata`: Searchable key-value pairs
   - `weight`: Ranking boost for important content

### OpenAPI Processing

1. **Spec Fetching**: Downloads OpenAPI spec (JSON or YAML)
2. **Dereferencing**: Resolves all `$ref` pointers
3. **Endpoint Extraction**: Extracts all API routes and methods
4. **Chunk Creation**: Creates chunks for each endpoint with:
   - Method, path, and summary
   - Operation ID for tracking
   - Tags for categorization
   - Description for context

## Chunk Structure

Each chunk includes:

```typescript
{
  chunk_html: string;           // HTML content
  tracking_id: string;          // Unique identifier
  source_url: string;           // Link to source
  tag_set: string[];            // Tags for filtering
  metadata: Record<...>;        // Searchable metadata
  semantic_content: string;     // Text for embeddings
  fulltext_content: string;     // Text for full-text search
  weight: number;               // Ranking boost (default: 1.0)
  upsert_by_tracking_id: true;  // Update if exists
  group_tracking_ids: string[]; // Group association
}
```

## Examples

### Index Documentation Only

```bash
korrektly-vitepress \
  --path ./docs \
  --root-url https://docs.myapp.com \
  --dataset my-dataset-id
```

### Index Documentation + OpenAPI

```bash
korrektly-vitepress \
  --path ./docs \
  --root-url https://docs.myapp.com \
  --openapi-spec https://api.myapp.com/openapi.yaml \
  --api-ref-path reference/api \
  --dataset my-dataset-id
```

### Use in CI/CD

```yaml
# .github/workflows/index-docs.yml
name: Index Documentation

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'

jobs:
  index:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Index documentation
        env:
          KORREKTLY_API_TOKEN: ${{ secrets.KORREKTLY_API_TOKEN }}
          KORREKTLY_DATASET_ID: ${{ secrets.KORREKTLY_DATASET_ID }}
        run: |
          bunx korrektly-vitepress \
            --path ./docs \
            --root-url https://docs.myapp.com \
            --openapi-spec https://api.myapp.com/openapi.json
```

## Dependencies

- `@korrektly/sdk` - Korrektly API client
- `commander` - CLI framework
- `yaml` - YAML parsing
- `marked` - Markdown to HTML conversion
- `linkedom` - Fast DOM parsing
- `json-schema-ref-parser` - OpenAPI $ref resolution
- `pluralize` - Endpoint naming

## License

MIT

## Links

- [Korrektly](https://korrektly.com)
- [GitHub](https://github.com/korrektly/korrektly-sdk)

## Credits
This package is based on Trieve's VitePress adapter.