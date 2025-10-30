/**
 * API Types for Korrektly
 * Generated TypeScript types for API endpoints: autocomplete, chunks, and search
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface KorrektlyConfig {
  apiToken: string;
  baseUrl?: string;
}

// ============================================================================
// AUTOCOMPLETE ENDPOINT
// ============================================================================

/**
 * Request body for POST /api/v1/datasets/{dataset}/autocomplete
 */
export interface AutocompleteRequest {
  /** Autocomplete query text (min: 2, max: 100) */
  query: string;

  /** Maximum suggestions to return (min: 1, max: 20, default: 10) */
  limit?: number;

  /** Use trigram similarity fallback when prefix matches are insufficient (default: true) */
  extend_results?: boolean;

  /** Return minimal response with id + content only (default: false) */
  content_only?: boolean;

  /** Minimum similarity score threshold (min: 0.0, max: 1.0, default: 0.0) */
  score_threshold?: number;

  /** Filtering options */
  filters?: {
    /** Filter by tags (AND logic, max 255 chars each) */
    tags?: string[];
  };
}

/**
 * Full autocomplete suggestion object
 */
export interface AutocompleteSuggestion {
  /** Chunk UUID */
  id: string;

  /** Content text */
  content: string;

  /** Similarity score (0.0 - 1.0) */
  similarity_score: number;

  /** Associated tags */
  tag_set: string[];
}

/**
 * Full response format for autocomplete endpoint
 */
export interface AutocompleteResponse {
  success: true;
  data: {
    /** Original query string */
    query: string;

    /** Total number of suggestions returned */
    total_suggestions: number;

    /** Array of suggestion objects */
    suggestions: AutocompleteSuggestion[];
  };
}

/**
 * Minimal response format when content_only=true
 */
export interface AutocompleteContentOnlyResponse {
  /** Array of content strings only */
  suggestions: string[];
}

/**
 * Union type for both autocomplete response formats
 */
export type AutocompleteResponseUnion =
  | AutocompleteResponse
  | AutocompleteContentOnlyResponse;

// ============================================================================
// CHUNKS ENDPOINT
// ============================================================================

/**
 * Single chunk data for creation
 */
export interface ChunkInput {
  /** HTML content of chunk (max: 65535 chars) */
  chunk_html: string;

  /** Custom identifier (max: 255 chars) */
  tracking_id?: string;

  /** Tags for categorization (max: 255 chars each) */
  tag_set?: string[];

  /** Key-value metadata pairs */
  metadata?: Record<string, string | number | boolean | string[]>;

  /** Chunk weight for ranking (min: 0, max: 2, default: 1.0) */
  weight?: number;

  /** Numeric value for range filtering */
  num_value?: number;

  /** Timestamp for recency bias (ISO 8601 format) */
  timestamp?: string;

  /** Source URL reference (max: 2048 chars) */
  source_url?: string;

  /** Group tracking IDs */
  group_tracking_ids?: string[];

  /** Array of image URLs (max: 2048 chars each) */
  image_urls?: string[];

  /** Content for semantic embedding (defaults to chunk_html) */
  semantic_content?: string;

  /** Content for full-text search (defaults to chunk_html) */
  fulltext_content?: string;

  /** Update existing chunk if tracking_id matches (default: false) */
  upsert_by_tracking_id?: boolean;

  /** Refresh updated_at timestamp when duplicate is found (default: false) */
  refresh_on_duplicate?: boolean;
}

/**
 * Request body for POST /api/v1/datasets/{dataset}/chunks
 * Supports both single chunk and batch creation
 */
export type ChunkRequest =
  | ChunkInput
  | {
      /** Array of chunks (max: 120) */
      chunks: ChunkInput[];

      /** Global upsert flag for all chunks (default: false) */
      upsert_by_tracking_id?: boolean;

      /** Global refresh_on_duplicate flag for all chunks (default: false) */
      refresh_on_duplicate?: boolean;
    };

/**
 * Created chunk object in response
 */
export interface ChunkOutput {
  /** Chunk UUID */
  id: string;

  /** Custom tracking ID */
  tracking_id: string | null;

  /** Plain text content */
  content: string;

  /** Weight for ranking */
  weight: number;

  /** Associated tags */
  tag_set: string[];

  /** Timestamp (ISO 8601 format) */
  timestamp: string | null;

  /** Group UUID */
  group_id: string | null;

  /** Creation timestamp (ISO 8601 format) */
  created_at: string;
}

/**
 * Response format for chunk creation endpoint
 */
export interface ChunkResponse {
  success: true;

  /** Success message */
  message: string;

  data: {
    /** Number of chunks created */
    chunks_created: number;

    /** Array of created chunk objects */
    chunks: ChunkOutput[];
  };
}

// ============================================================================
// SEARCH ENDPOINT
// ============================================================================

/**
 * Search type options
 */
export type SearchType = "hybrid" | "semantic" | "fulltext";

/**
 * Range filter for numeric or timestamp values
 */
export interface RangeFilter {
  /** Greater than or equal */
  gte?: number | string;

  /** Less than or equal */
  lte?: number | string;

  /** Greater than */
  gt?: number | string;

  /** Less than */
  lt?: number | string;
}

/**
 * Filter condition for boolean queries
 */
export interface FilterCondition {
  /** Filter by tags (AND logic within condition) */
  tags?: string[];

  /** Filter by group UUIDs */
  group_ids?: string[];

  /** Range filters */
  range?: {
    /** Numeric value range */
    num_value?: RangeFilter;

    /** Timestamp range (ISO 8601 format) */
    timestamp?: RangeFilter;
  };
}

/**
 * Legacy format filters (backward compatible)
 */
export interface LegacyFilters {
  /** Filter by tags (AND logic) */
  tags?: string[];

  /** Filter by group UUIDs */
  group_ids?: string[];

  /** Filter by metadata key-value pairs */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Advanced boolean query filters
 */
export interface AdvancedFilters {
  /** All conditions must match (AND logic) */
  must?: FilterCondition[];

  /** None must match (NOT logic) */
  must_not?: Omit<FilterCondition, "range">[];

  /** At least minimum_should_match must match (OR logic) */
  should?: FilterCondition[];

  /** Minimum "should" conditions to match (default: 1) */
  minimum_should_match?: number;
}

/**
 * Request body for POST /api/v1/datasets/{dataset}/search
 */
export interface SearchRequest {
  /** Search query text (min: 1, max: 500) */
  query: string;

  /** Maximum results (min: 1, max: 100, default: 10) */
  limit?: number;

  /** Search type (default: "hybrid") */
  search_type?: SearchType;

  /** Track query for analytics (default: true) */
  track_query?: boolean;

  /** Filtering options (supports legacy or advanced format) */
  filters?: LegacyFilters | AdvancedFilters;
}

/**
 * Group information in search result
 */
export interface SearchResultGroup {
  /** Group UUID */
  id: string;

  /** Group tracking ID */
  tracking_id: string | null;

  /** Group name */
  name: string | null;
}

/**
 * Metadata entry in search result
 */
export interface SearchResultMetadata {
  /** Metadata key */
  key: string;

  /** Metadata value */
  value: string | number | boolean;

  /** Value type */
  value_type: "string" | "number" | "boolean";
}

/**
 * Score breakdown for search result
 */
export interface SearchResultScores {
  /** Final hybrid score (0.0 - 1.0) */
  hybrid: number;

  /** Dense embedding score (0.0 - 1.0) */
  dense: number;

  /** Sparse embedding score (0.0 - 1.0) */
  sparse: number;

  /** Full-text search score (0.0 - 1.0) */
  fulltext: number;
}

/**
 * Rank breakdown for search result
 */
export interface SearchResultRanks {
  /** Dense retrieval rank */
  dense: number;

  /** Sparse retrieval rank */
  sparse: number;

  /** Full-text search rank */
  fulltext: number;
}

/**
 * Single search result
 */
export interface SearchResult {
  /** Chunk UUID */
  id: string;

  /** Plain text content */
  content: string;

  /** HTML content */
  content_html: string | null;

  /** Source type (e.g., "api", "scraper") */
  source_type: string;

  /** Source URL reference */
  source_url: string | null;

  /** Weight for ranking */
  weight: number;

  /** Associated tags */
  tag_set: string[];

  /** Timestamp (ISO 8601 format) */
  timestamp: string | null;

  /** Numeric value */
  num_value: number | null;

  /** Group information */
  group: SearchResultGroup | null;

  /** Score breakdown */
  scores: SearchResultScores;

  /** Rank breakdown */
  ranks: SearchResultRanks;

  /** Metadata entries */
  metadata: SearchResultMetadata[];
}

/**
 * Response format for search endpoint
 */
export interface SearchResponse {
  success: true;
  data: {
    /** Original query string */
    query: string;

    /** Total number of results returned */
    total_results: number;

    /** Array of search results */
    results: SearchResult[];
  };
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

/**
 * Validation error details
 */
export interface ValidationError {
  /** Field name */
  field: string;

  /** Error messages for this field */
  messages: string[];
}

/**
 * Generic API error response
 */
export interface ApiErrorResponse {
  success: false;

  /** Error message */
  message: string;

  /** Validation errors (422 responses) */
  errors?: Record<string, string[]>;
}
