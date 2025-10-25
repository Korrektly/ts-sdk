# @korrektly/sdk

Official TypeScript/JavaScript SDK for the Korrektly API.

## Installation

```bash
bun install @korrektly/sdk
```

Or with npm/pnpm/yarn:
```bash
npm install @korrektly/sdk
pnpm install @korrektly/sdk
yarn add @korrektly/sdk
```

## Quick Start

```typescript
import { Korrektly } from '@korrektly/sdk';

const client = new Korrektly({
  apiToken: 'your-api-token',
});

// Search your dataset
const results = await client.search('dataset-id', {
  query: 'machine learning',
  limit: 10
});
```

## Features

### Search

Perform hybrid, semantic, or full-text search with advanced filtering capabilities.

**Supported search types:**
- **Hybrid** (default) - Combines semantic and full-text search
- **Semantic** - Dense embedding-based similarity search
- **Fulltext** - Traditional full-text search

**Example:**
```typescript
const results = await client.search('dataset-id', {
  query: 'natural language processing',
  search_type: 'semantic',
  limit: 20,
  filters: {
    tags: ['ai', 'nlp'],
    metadata: { category: 'tutorial' }
  }
});
```

**Advanced filtering with boolean queries:**
```typescript
const results = await client.search('dataset-id', {
  query: 'api documentation',
  filters: {
    must: [
      { tags: ['documentation'] }
    ],
    should: [
      { tags: ['api'] },
      { tags: ['rest'] }
    ],
    minimum_should_match: 1,
    must_not: [
      { tags: ['deprecated'] }
    ]
  }
});
```

**Range filters:**
```typescript
const results = await client.search('dataset-id', {
  query: 'recent updates',
  filters: {
    must: [
      {
        range: {
          timestamp: {
            gte: '2024-01-01T00:00:00Z'
          }
        }
      }
    ]
  }
});
```

### Autocomplete

Get prefix-based autocomplete suggestions with optional trigram similarity fallback.

**Features:**
- Prefix matching with configurable limits
- Trigram similarity fallback for better results
- Tag-based filtering
- Configurable similarity thresholds
- Content-only minimal response mode

**Example:**
```typescript
const suggestions = await client.autocomplete('dataset-id', {
  query: 'hel',
  limit: 5,
  extend_results: true,
  score_threshold: 0.5
});
```

**With filters:**
```typescript
const filtered = await client.autocomplete('dataset-id', {
  query: 'search',
  limit: 10,
  filters: {
    tags: ['documentation', 'api']
  }
});
```

**Minimal response (content only):**
```typescript
const minimal = await client.autocomplete('dataset-id', {
  query: 'test',
  content_only: true  // Returns array of strings only
});
```

### Chunk Management

Create and manage chunks with rich metadata and categorization.

**Single chunk creation:**
```typescript
const result = await client.createChunks('dataset-id', {
  chunk_html: '<p>Hello world</p>',
  tracking_id: 'doc-001',
  tag_set: ['documentation'],
  metadata: { version: '1.0', author: 'John' },
  weight: 1.2,
  timestamp: '2024-01-15T12:00:00Z'
});
```

**Batch operations (up to 120 chunks):**
```typescript
const batchResult = await client.createChunks('dataset-id', {
  chunks: [
    {
      chunk_html: '<p>First chunk</p>',
      tracking_id: 'chunk-001',
      tag_set: ['test']
    },
    {
      chunk_html: '<p>Second chunk</p>',
      tracking_id: 'chunk-002',
      weight: 1.5
    }
  ]
});
```

**Upsert by tracking ID:**
```typescript
const upserted = await client.createChunks('dataset-id', {
  chunk_html: '<p>Updated content</p>',
  tracking_id: 'doc-001',
  upsert_by_tracking_id: true  // Updates if exists
});
```

**Supported chunk properties:**
- `chunk_html` - HTML content (max 65,535 chars)
- `tracking_id` - Custom identifier (max 255 chars)
- `tag_set` - Tags for categorization
- `metadata` - Key-value pairs for custom data
- `weight` - Ranking weight (0-2, default 1.0)
- `num_value` - Numeric value for range filtering
- `timestamp` - ISO 8601 timestamp for recency bias
- `source_url` - Reference URL (max 2,048 chars)
- `group_tracking_ids` - Group associations
- `image_urls` - Associated images
- `semantic_content` - Content for semantic embedding
- `fulltext_content` - Content for full-text search

## API Reference

### Client Initialization

```typescript
new Korrektly(config: KorrektlyConfig)
```

**Config:**
- `apiToken` (required) - Your Korrektly API token
- `baseUrl` (optional) - API base URL (defaults to 'https://korrektly.com')

### Methods

#### `search(datasetId: string, request: SearchRequest): Promise<SearchResponse>`

Search chunks within a dataset with advanced filtering.

#### `autocomplete(datasetId: string, request: AutocompleteRequest): Promise<AutocompleteResponseUnion>`

Get autocomplete suggestions for a query.

#### `createChunks(datasetId: string, request: ChunkRequest): Promise<ChunkResponse>`

Create or upsert chunks (single or batch).

## Development

This SDK is built with [Bun](https://bun.com).

**Install dependencies:**
```bash
bun install
```

**Run tests:**
```bash
bun test
```

**Format code:**
```bash
bun run check
```

## TypeScript Support

The SDK is written in TypeScript and includes comprehensive type definitions for all API requests and responses.

## License

MIT
