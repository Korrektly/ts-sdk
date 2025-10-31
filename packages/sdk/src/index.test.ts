import { beforeEach, describe, expect, mock, test } from "bun:test";
import Korrektly from "./index";
import type {
  AutocompleteContentOnlyResponse,
  AutocompleteResponse,
  ChunkResponse,
  ClickTrackingResponse,
  SearchResponse,
} from "./types";

// Mock fetch globally
const mockFetch = mock(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({}),
  }),
);

globalThis.fetch = mockFetch as unknown as typeof fetch;

describe("Korrektly", () => {
  let client: Korrektly;
  const mockApiToken = "test-api-token";
  const mockDatasetId = "019a1847-5ee3-734e-a004-ca6f21ca5082";

  beforeEach(() => {
    client = new Korrektly({
      apiToken: mockApiToken,
    });
    mockFetch.mockClear();
  });

  describe("constructor", () => {
    test("should initialize with default base URL", () => {
      const instance = new Korrektly({ apiToken: "token" });
      expect(instance).toBeInstanceOf(Korrektly);
    });

    test("should initialize with custom base URL", () => {
      const customUrl = "http://localhost:8000";
      const instance = new Korrektly({
        apiToken: "token",
        baseUrl: customUrl,
      });
      expect(instance).toBeInstanceOf(Korrektly);
    });
  });

  describe("autocomplete", () => {
    test("should make autocomplete request with correct parameters", async () => {
      const mockResponse: AutocompleteResponse = {
        success: true,
        data: {
          query: "test",
          total_suggestions: 2,
          suggestions: [
            {
              id: "1",
              content: "test content 1",
              similarity_score: 0.95,
              tag_set: ["tag1"],
            },
            {
              id: "2",
              content: "test content 2",
              similarity_score: 0.85,
              tag_set: ["tag2"],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await client.autocomplete(mockDatasetId, {
        query: "test",
        limit: 5,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://korrektly.com/api/v1/datasets/${mockDatasetId}/autocomplete`,
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: "test", limit: 5 }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    test("should handle content_only response format", async () => {
      const mockResponse: AutocompleteContentOnlyResponse = {
        suggestions: ["content 1", "content 2", "content 3"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await client.autocomplete(mockDatasetId, {
        query: "test",
        content_only: true,
      });

      expect(result).toEqual(mockResponse);
    });

    test("should handle autocomplete with filters", async () => {
      const mockResponse: AutocompleteResponse = {
        success: true,
        data: {
          query: "test",
          total_suggestions: 1,
          suggestions: [
            {
              id: "1",
              content: "filtered content",
              similarity_score: 0.9,
              tag_set: ["important"],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await client.autocomplete(mockDatasetId, {
        query: "test",
        filters: {
          tags: ["important"],
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            query: "test",
            filters: { tags: ["important"] },
          }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createChunks", () => {
    test("should create a single chunk", async () => {
      const mockResponse: ChunkResponse = {
        success: true,
        message: "Chunk created successfully",
        data: {
          chunks_created: 1,
          chunks: [
            {
              id: "chunk-id-1",
              tracking_id: "track-001",
              content: "Test content",
              weight: 1.0,
              tag_set: ["test"],
              timestamp: null,
              group_id: null,
              created_at: "2025-01-01T00:00:00Z",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await client.createChunks(mockDatasetId, {
        chunk_html: "<p>Test content</p>",
        tracking_id: "track-001",
        tag_set: ["test"],
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://korrektly.com/api/v1/datasets/${mockDatasetId}/chunks`,
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockApiToken}`,
            "Content-Type": "application/json",
          },
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    test("should create multiple chunks in batch", async () => {
      const mockResponse: ChunkResponse = {
        success: true,
        message: "Chunks created successfully",
        data: {
          chunks_created: 2,
          chunks: [
            {
              id: "chunk-id-1",
              tracking_id: "track-001",
              content: "Content 1",
              weight: 1.0,
              tag_set: ["test"],
              timestamp: null,
              group_id: null,
              created_at: "2025-01-01T00:00:00Z",
            },
            {
              id: "chunk-id-2",
              tracking_id: "track-002",
              content: "Content 2",
              weight: 1.0,
              tag_set: ["test"],
              timestamp: null,
              group_id: null,
              created_at: "2025-01-01T00:00:00Z",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await client.createChunks(mockDatasetId, {
        chunks: [
          {
            chunk_html: "<p>Content 1</p>",
            tracking_id: "track-001",
          },
          {
            chunk_html: "<p>Content 2</p>",
            tracking_id: "track-002",
          },
        ],
      });

      expect(result).toEqual(mockResponse);
      expect(result.data.chunks_created).toBe(2);
    });

    test("should handle upsert operation", async () => {
      const mockResponse: ChunkResponse = {
        success: true,
        message: "Chunk upserted successfully",
        data: {
          chunks_created: 1,
          chunks: [
            {
              id: "chunk-id-1",
              tracking_id: "track-001",
              content: "Updated content",
              weight: 1.0,
              tag_set: ["updated"],
              timestamp: null,
              group_id: null,
              created_at: "2025-01-01T00:00:00Z",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await client.createChunks(mockDatasetId, {
        chunk_html: "<p>Updated content</p>",
        tracking_id: "track-001",
        upsert_by_tracking_id: true,
        tag_set: ["updated"],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("upsert_by_tracking_id"),
        }),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("search", () => {
    test("should perform basic search", async () => {
      const mockResponse: SearchResponse = {
        success: true,
        data: {
          query: "test query",
          total_results: 2,
          search_query_id: "query-id",
          results: [
            {
              id: "result-1",
              content: "Test result 1",
              content_html: "<p>Test result 1</p>",
              source_type: "api",
              source_url: null,
              weight: 1.0,
              tag_set: ["test"],
              timestamp: null,
              num_value: null,
              group: null,
              scores: {
                hybrid: 0.95,
                dense: 0.9,
                sparse: 0.8,
                fulltext: 0.85,
              },
              ranks: {
                dense: 1,
                sparse: 1,
                fulltext: 1,
              },
              metadata: [],
            },
            {
              id: "result-2",
              content: "Test result 2",
              content_html: "<p>Test result 2</p>",
              source_type: "api",
              source_url: null,
              weight: 1.0,
              tag_set: ["test"],
              timestamp: null,
              num_value: null,
              group: null,
              scores: {
                hybrid: 0.85,
                dense: 0.8,
                sparse: 0.75,
                fulltext: 0.8,
              },
              ranks: {
                dense: 2,
                sparse: 2,
                fulltext: 2,
              },
              metadata: [],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await client.search(mockDatasetId, {
        query: "test query",
        limit: 10,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://korrektly.com/api/v1/datasets/${mockDatasetId}/search`,
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: "test query", limit: 10 }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    test("should perform semantic search", async () => {
      const mockResponse: SearchResponse = {
        success: true,
        data: {
          query: "semantic query",
          total_results: 1,
          search_query_id: "query-id",
          results: [
            {
              id: "result-1",
              content: "Semantic result",
              content_html: "<p>Semantic result</p>",
              source_type: "api",
              source_url: null,
              weight: 1.0,
              tag_set: [],
              timestamp: null,
              num_value: null,
              group: null,
              scores: {
                hybrid: 0.9,
                dense: 0.95,
                sparse: 0.0,
                fulltext: 0.0,
              },
              ranks: {
                dense: 1,
                sparse: 0,
                fulltext: 0,
              },
              metadata: [],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await client.search(mockDatasetId, {
        query: "semantic query",
        search_type: "semantic",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            query: "semantic query",
            search_type: "semantic",
          }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    test("should handle advanced filters with boolean logic", async () => {
      const mockResponse: SearchResponse = {
        success: true,
        data: {
          query: "filtered query",
          total_results: 1,
          search_query_id: "query-id",
          results: [
            {
              id: "result-1",
              content: "Filtered result",
              content_html: "<p>Filtered result</p>",
              source_type: "api",
              source_url: null,
              weight: 1.0,
              tag_set: ["important", "active"],
              timestamp: null,
              num_value: null,
              group: null,
              scores: {
                hybrid: 0.9,
                dense: 0.9,
                sparse: 0.85,
                fulltext: 0.8,
              },
              ranks: {
                dense: 1,
                sparse: 1,
                fulltext: 1,
              },
              metadata: [],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await client.search(mockDatasetId, {
        query: "filtered query",
        filters: {
          must: [{ tags: ["important"] }],
          should: [{ tags: ["active"] }, { tags: ["priority"] }],
          minimum_should_match: 1,
          must_not: [{ tags: ["archived"] }],
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("must"),
        }),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("error handling", () => {
    test("should throw error on failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      } as unknown as Response);

      await expect(
        client.search(mockDatasetId, { query: "test" }),
      ).rejects.toThrow("API request failed: 401 Unauthorized");
    });

    test("should throw error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        client.search(mockDatasetId, { query: "test" }),
      ).rejects.toThrow("Network error");
    });

    test("should handle 404 errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as unknown as Response);

      await expect(
        client.autocomplete(mockDatasetId, { query: "test" }),
      ).rejects.toThrow("API request failed: 404 Not Found");
    });

    test("should handle 422 validation errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
      } as unknown as Response);

      await expect(
        client.createChunks(mockDatasetId, { chunk_html: "" }),
      ).rejects.toThrow("API request failed: 422 Unprocessable Entity");
    });
  });

  describe("base URL configuration", () => {
    test("should use custom base URL for requests", async () => {
      const customClient = new Korrektly({
        apiToken: mockApiToken,
        baseUrl: "http://localhost:8000",
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { results: [] } }),
      } as unknown as Response);

      await customClient.search(mockDatasetId, { query: "test" });

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/api/v1/datasets/${mockDatasetId}/search`,
        expect.any(Object),
      );
    });
  });

  describe("trackClick", () => {
    test("should track click with all required fields", async () => {
      const searchQueryId = "550e8400-e29b-41d4-a716-446655440000";
      const chunkId = "660e8400-e29b-41d4-a716-446655440000";
      const position = 0;

      const mockResponse: ClickTrackingResponse = {
        success: true,
        data: {
          message: "Click tracked successfully",
          search_query_id: searchQueryId,
          chunk_id: chunkId,
          position: position,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await client.trackClick(mockDatasetId, {
        search_query_id: searchQueryId,
        chunk_id: chunkId,
        position: position,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://korrektly.com/api/v1/datasets/${mockDatasetId}/clicks`,
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            search_query_id: searchQueryId,
            chunk_id: chunkId,
            position: position,
          }),
        }),
      );
      expect(result).toEqual(mockResponse);
      expect(result.data.message).toBe("Click tracked successfully");
      expect(result.data.search_query_id).toBe(searchQueryId);
      expect(result.data.chunk_id).toBe(chunkId);
      expect(result.data.position).toBe(position);
    });

    test("should track click without optional position field", async () => {
      const searchQueryId = "550e8400-e29b-41d4-a716-446655440000";
      const chunkId = "660e8400-e29b-41d4-a716-446655440000";

      const mockResponse: ClickTrackingResponse = {
        success: true,
        data: {
          message: "Click tracked successfully",
          search_query_id: searchQueryId,
          chunk_id: chunkId,
          position: null,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await client.trackClick(mockDatasetId, {
        search_query_id: searchQueryId,
        chunk_id: chunkId,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://korrektly.com/api/v1/datasets/${mockDatasetId}/clicks`,
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            search_query_id: searchQueryId,
            chunk_id: chunkId,
          }),
        }),
      );
      expect(result).toEqual(mockResponse);
      expect(result.data.position).toBeNull();
    });

    test("should handle click tracking error responses", async () => {
      const searchQueryId = "550e8400-e29b-41d4-a716-446655440000";
      const chunkId = "660e8400-e29b-41d4-a716-446655440000";

      const mockErrorResponse = {
        message: "The search query does not belong to this dataset.",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockErrorResponse,
      } as unknown as Response);

      await expect(
        client.trackClick(mockDatasetId, {
          search_query_id: searchQueryId,
          chunk_id: chunkId,
          position: 0,
        }),
      ).rejects.toThrow(/403 Forbidden/);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("should handle validation errors (422)", async () => {
      const mockErrorResponse = {
        message: "The search query ID is required.",
        errors: {
          search_query_id: ["The search query ID is required."],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockErrorResponse,
      } as unknown as Response);

      await expect(
        client.trackClick(mockDatasetId, {
          search_query_id: "",
          chunk_id: "660e8400-e29b-41d4-a716-446655440000",
        }),
      ).rejects.toThrow(/422 Unprocessable Entity/);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("should integrate with search workflow", async () => {
      const searchQueryId = "550e8400-e29b-41d4-a716-446655440000";
      const chunkId = "660e8400-e29b-41d4-a716-446655440000";

      // Mock search response with search_query_id
      const mockSearchResponse: SearchResponse = {
        success: true,
        data: {
          query: "authentication tutorial",
          total_results: 1,
          search_query_id: searchQueryId,
          results: [
            {
              id: chunkId,
              content: "Getting started with authentication...",
              content_html: "<p>Getting started with authentication...</p>",
              source_type: "api",
              source_url: "https://example.com/auth-guide",
              weight: 1.0,
              tag_set: ["tutorial", "auth"],
              timestamp: null,
              num_value: null,
              group: null,
              scores: {
                hybrid: 0.9234,
                dense: 0.85,
                sparse: 0.92,
                fulltext: 0.88,
              },
              ranks: {
                dense: 1,
                sparse: 1,
                fulltext: 1,
              },
              metadata: [],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockSearchResponse,
      } as unknown as Response);

      // Perform search
      const searchResult = await client.search(mockDatasetId, {
        query: "authentication tutorial",
        track_query: true,
      });

      expect(searchResult.data.search_query_id).toBe(searchQueryId);

      // Extract search_query_id (verified above to be defined)
      const searchQueryIdFromSearch = searchResult.data.search_query_id;
      if (!searchQueryIdFromSearch) {
        throw new Error("search_query_id should be defined");
      }

      // Mock click tracking response
      const mockClickResponse: ClickTrackingResponse = {
        success: true,
        data: {
          message: "Click tracked successfully",
          search_query_id: searchQueryId,
          chunk_id: chunkId,
          position: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockClickResponse,
      } as unknown as Response);

      // Track click on first result
      const clickResult = await client.trackClick(mockDatasetId, {
        search_query_id: searchQueryIdFromSearch,
        chunk_id: searchResult.data.results[0].id,
        position: 0,
      });

      expect(clickResult.success).toBe(true);
      expect(clickResult.data.search_query_id).toBe(searchQueryId);
      expect(clickResult.data.chunk_id).toBe(chunkId);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
