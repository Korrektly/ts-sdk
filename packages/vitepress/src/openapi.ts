import $RefParser from "@apidevtools/json-schema-ref-parser";
import type { ChunkInput } from "@korrektly/sdk";
import pluralize from "pluralize";
import { parse as parseYaml } from "yaml";
import { cleanText, generateTrackingId } from "./utils.js";

interface OpenAPIPath {
  [method: string]: {
    operationId?: string;
    summary?: string;
    description?: string;
    tags?: string[];
    [key: string]: unknown;
  };
}

interface OpenAPISpec {
  paths?: {
    [path: string]: OpenAPIPath;
  };
  [key: string]: unknown;
}

/**
 * Extract chunks from an OpenAPI specification
 */
export async function extractChunksFromOpenAPI(
  specUrl: string,
  siteUrl?: string,
  apiRefParent?: string,
): Promise<ChunkInput[]> {
  const chunks: ChunkInput[] = [];

  try {
    // Fetch the OpenAPI spec
    console.log("Fetching OpenAPI spec from:", specUrl);
    const response = await fetch(specUrl);
    const specText = await response.text();

    // Parse based on file extension
    const isJson = specUrl.endsWith(".json");
    const rawSpec = isJson ? JSON.parse(specText) : parseYaml(specText);

    // Dereference all $refs to get a complete spec
    console.log("Dereferencing OpenAPI spec...");
    const spec = (await $RefParser.dereference(rawSpec)) as OpenAPISpec;

    if (!spec.paths) {
      console.warn("No paths found in OpenAPI spec");
      return chunks;
    }

    const pathEntries = Object.entries(spec.paths);
    console.log(`Processing ${pathEntries.length} API paths...`);

    for (const [path, pathData] of pathEntries) {
      const methods = Object.keys(pathData).filter((key) =>
        ["get", "post", "put", "patch", "delete", "options", "head"].includes(
          key.toLowerCase(),
        ),
      );

      for (const method of methods) {
        const operation = pathData[method];
        if (!operation) continue;

        const operationId =
          operation.operationId ?? generateTrackingId(method, path);
        const summary = operation.summary ?? "";
        const description = operation.description ?? "";
        const tags = operation.tags ?? [];

        // Generate endpoint name from summary or path
        const [namespace, ...parts] = summary?.toLowerCase().split(" ") ?? [];
        const endpoint = namespace
          ? `${pluralize(parts.join("-"))}/${namespace}`
          : path;

        // Build page link
        // The apiRefParent is the full URL path (e.g., "docs/api-reference/api/operations")
        // Final URL: https://coolify.io/docs/api-reference/api/operations/{operationId}
        const apiPath = apiRefParent ?? "api";

        // Normalize siteUrl to remove trailing slashes
        const normalizedSiteUrl = siteUrl?.replace(/\/+$/, "");
        const pageLink = normalizedSiteUrl
          ? `${normalizedSiteUrl}/${apiPath}/${operationId}`
          : `/${apiPath}/${operationId}`;

        // Create metadata
        // Build hierarchy by splitting the apiPath
        // e.g., "docs/api-reference/api/operations" -> ["docs", "api", "operations", operationId]
        const pathParts = apiPath.split("/");
        const hierarchyParts = pathParts.filter(
          (part) => part !== "api-reference",
        );

        const metadata: Record<string, string | number | boolean | string[]> = {
          operation_id: operationId,
          method: method.toUpperCase(),
          path,
          endpoint,
          url: pageLink,
          hierarchy: [...hierarchyParts, operationId],
        };

        if (summary) metadata.summary = summary;
        if (description) metadata.description = description;
        if (tags.length > 0) metadata.tags = tags.join(", ");

        // Build chunk HTML
        const methodUpper = method.toUpperCase();
        const heading = `${methodUpper} ${summary || path} ${endpoint}`;
        let chunkHtml = `<h2><span class="openapi-method">${methodUpper}</span> ${summary || path} <code>/${endpoint}</code></h2>`;

        if (description) {
          chunkHtml += `\n<p>${cleanText(description)}</p>`;
        }

        // Build semantic content
        const semanticContent = [heading, description]
          .filter(Boolean)
          .join(" ");

        const chunk: ChunkInput = {
          chunk_html: chunkHtml,
          tracking_id: operationId,
          source_url: pageLink,
          tag_set: [
            "openapi-route",
            operationId,
            method.toLowerCase(),
            ...tags,
          ],
          metadata,
          semantic_content: semanticContent,
          fulltext_content: semanticContent,
          refresh_on_duplicate: true,
          group_tracking_ids: [path],
        };

        chunks.push(chunk);
      }
    }

    console.log(`Generated ${chunks.length} chunks from OpenAPI spec`);
  } catch (err) {
    console.error(`Error processing OpenAPI spec from ${specUrl}:`, err);
  }

  return chunks;
}
