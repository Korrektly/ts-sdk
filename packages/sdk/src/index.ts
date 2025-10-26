import type {
  AutocompleteRequest,
  AutocompleteResponseUnion,
  ChunkRequest,
  ChunkResponse,
  KorrektlyConfig,
  SearchRequest,
  SearchResponse,
} from "./types";

/**
 * Korrektly API Client
 *
 * A TypeScript client for interacting with the Korrektly API, providing
 * autocomplete, chunk management, and search functionality.
 *
 * @example
 * ```typescript
 * const client = new Korrektly({
 *   apiToken: 'your-api-token',
 *   baseUrl: 'https://korrektly.com' // optional, defaults to production
 * });
 *
 * // Search for chunks
 * const results = await client.search('dataset-id', {
 *   query: 'search term',
 *   limit: 10
 * });
 * ```
 */
export class Korrektly {
  private apiToken: string;
  private baseUrl: string;

  /**
   * Creates a new Korrektly API client instance
   *
   * @param config - Configuration object for the client
   * @param config.apiToken - Your Korrektly API token (required)
   * @param config.baseUrl - Base URL for the API (optional, defaults to 'https://korrektly.com')
   *
   * @example
   * ```typescript
   * // Production usage
   * const client = new Korrektly({
   *   apiToken: 'your-api-token'
   * });
   *
   * // Development usage with custom base URL
   * const devClient = new Korrektly({
   *   apiToken: 'your-api-token',
   *   baseUrl: 'http://localhost:8000'
   * });
   * ```
   */
  constructor(config: KorrektlyConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || "https://korrektly.com";
  }

  /**
   * Internal method to make authenticated API requests
   *
   * @template T - The expected response type
   * @param endpoint - API endpoint path
   * @param method - HTTP method (default: 'POST')
   * @param body - Request body to be JSON stringified
   * @returns Promise resolving to the response data
   * @throws {Error} When the API request fails
   * @private
   */
  private async request<T>(
    endpoint: string,
    method: string = "POST",
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      // Try to get error details from response body
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          errorMessage += `\nError details: ${JSON.stringify(errorData)}`;
        } else {
          const errorText = await response.text();
          errorMessage += `\nResponse body: ${errorText.substring(0, 500)}`;
        }
      } catch {
        // If we can't parse the error response, continue with basic error
      }
      throw new Error(errorMessage);
    }

    // Validate response is JSON before parsing
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const responseText = await response.text();
      throw new Error(
        `Expected JSON response but got ${contentType}.\nResponse body: ${responseText.substring(0, 500)}`,
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get autocomplete suggestions for a query
   *
   * Provides prefix-based autocomplete suggestions with optional trigram similarity
   * fallback. Supports filtering by tags and configurable result limits.
   *
   * @param datasetId - UUID of the dataset to search
   * @param request - Autocomplete request configuration
   * @param request.query - Query text (min: 2, max: 100 chars)
   * @param request.limit - Maximum suggestions (min: 1, max: 20, default: 10)
   * @param request.extend_results - Use trigram similarity fallback (default: true)
   * @param request.content_only - Return minimal response (default: false)
   * @param request.score_threshold - Minimum similarity score (0.0-1.0, default: 0.0)
   * @param request.filters - Optional filtering by tags
   * @returns Promise resolving to autocomplete suggestions
   *
   * @example
   * ```typescript
   * // Basic autocomplete
   * const suggestions = await client.autocomplete('dataset-id', {
   *   query: 'hel',
   *   limit: 5
   * });
   *
   * // Autocomplete with filters
   * const filtered = await client.autocomplete('dataset-id', {
   *   query: 'search',
   *   limit: 10,
   *   filters: {
   *     tags: ['documentation', 'api']
   *   }
   * });
   *
   * // Content-only response (minimal)
   * const minimal = await client.autocomplete('dataset-id', {
   *   query: 'test',
   *   content_only: true
   * });
   * ```
   */
  async autocomplete(
    datasetId: string,
    request: AutocompleteRequest,
  ): Promise<AutocompleteResponseUnion> {
    return this.request<AutocompleteResponseUnion>(
      `/api/v1/datasets/${datasetId}/autocomplete`,
      "POST",
      request,
    );
  }

  /**
   * Create or upsert chunks in a dataset
   *
   * Supports both single chunk creation and batch operations (up to 120 chunks).
   * Chunks can be upserted by tracking_id to update existing entries.
   *
   * @param datasetId - UUID of the dataset
   * @param request - Chunk creation request (single chunk or batch)
   * @returns Promise resolving to created chunk information
   *
   * @example
   * ```typescript
   * // Create a single chunk
   * const result = await client.createChunks('dataset-id', {
   *   chunk_html: '<p>Hello world</p>',
   *   tracking_id: 'doc-001',
   *   tag_set: ['documentation'],
   *   metadata: { version: '1.0' }
   * });
   *
   * // Batch create chunks
   * const batchResult = await client.createChunks('dataset-id', {
   *   chunks: [
   *     {
   *       chunk_html: '<p>First chunk</p>',
   *       tracking_id: 'chunk-001',
   *       tag_set: ['test']
   *     },
   *     {
   *       chunk_html: '<p>Second chunk</p>',
   *       tracking_id: 'chunk-002',
   *       weight: 1.5
   *     }
   *   ]
   * });
   *
   * // Upsert by tracking_id
   * const upserted = await client.createChunks('dataset-id', {
   *   chunk_html: '<p>Updated content</p>',
   *   tracking_id: 'doc-001',
   *   upsert_by_tracking_id: true
   * });
   * ```
   */
  async createChunks(
    datasetId: string,
    request: ChunkRequest,
  ): Promise<ChunkResponse> {
    return this.request<ChunkResponse>(
      `/api/v1/datasets/${datasetId}/chunks`,
      "POST",
      request,
    );
  }

  /**
   * Search chunks within a dataset
   *
   * Performs hybrid, semantic, or full-text search with support for advanced
   * filtering, including boolean queries, range filters, and metadata matching.
   *
   * @param datasetId - UUID of the dataset to search
   * @param request - Search request configuration
   * @param request.query - Search query text (min: 1, max: 500 chars)
   * @param request.limit - Maximum results (min: 1, max: 100, default: 10)
   * @param request.search_type - Search type: 'hybrid', 'semantic', or 'fulltext' (default: 'hybrid')
   * @param request.track_query - Track query for analytics (default: true)
   * @param request.filters - Advanced filtering options
   * @returns Promise resolving to search results with scores and metadata
   *
   * @example
   * ```typescript
   * // Basic search
   * const results = await client.search('dataset-id', {
   *   query: 'machine learning',
   *   limit: 10
   * });
   *
   * // Semantic search with filters
   * const semanticResults = await client.search('dataset-id', {
   *   query: 'natural language processing',
   *   search_type: 'semantic',
   *   limit: 20,
   *   filters: {
   *     tags: ['ai', 'nlp']
   *   }
   * });
   *
   * // Advanced boolean query with ranges
   * const advancedResults = await client.search('dataset-id', {
   *   query: 'api documentation',
   *   filters: {
   *     must: [
   *       { tags: ['documentation'] }
   *     ],
   *     should: [
   *       { tags: ['api'] },
   *       { tags: ['rest'] }
   *     ],
   *     minimum_should_match: 1,
   *     must_not: [
   *       { tags: ['deprecated'] }
   *     ]
   *   }
   * });
   * ```
   */
  async search(
    datasetId: string,
    request: SearchRequest,
  ): Promise<SearchResponse> {
    return this.request<SearchResponse>(
      `/api/v1/datasets/${datasetId}/search`,
      "POST",
      request,
    );
  }
}

export default Korrektly;
export * from "./types.js";
