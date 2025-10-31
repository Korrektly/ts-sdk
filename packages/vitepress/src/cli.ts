#!/usr/bin/env node

import { homedir } from "node:os";
import { resolve } from "node:path";
import type { ChunkInput } from "@korrektly/sdk";
import { Korrektly } from "@korrektly/sdk";
import { Command } from "commander";
import { extractChunksFromMarkdown } from "./markdown.js";
import { extractChunksFromOpenAPI } from "./openapi.js";
import { extractMarkdownPaths } from "./utils.js";

/**
 * Expands tilde (~) notation in file paths to the user's home directory
 *
 * This utility function allows users to use Unix-style home directory shortcuts
 * in file paths (e.g., "~/docs" or "~"). The tilde is replaced with the absolute
 * path to the current user's home directory.
 *
 * @param filePath - The file path that may contain a tilde prefix
 * @returns The expanded file path with tilde replaced by the home directory, or the original path if no tilde prefix
 *
 * @example
 * ```typescript
 * expandTilde("~/documents/my-file.txt")
 * // Returns: "/home/username/documents/my-file.txt"
 *
 * expandTilde("/absolute/path")
 * // Returns: "/absolute/path"
 * ```
 */
function expandTilde(filePath: string): string {
  if (filePath.startsWith("~/") || filePath === "~") {
    return filePath.replace("~", homedir());
  }
  return filePath;
}

// Environment variables
const KORREKTLY_API_TOKEN = process.env.KORREKTLY_API_TOKEN;
const KORREKTLY_DATASET_ID = process.env.KORREKTLY_DATASET_ID;
const KORREKTLY_BASE_URL = process.env.KORREKTLY_BASE_URL;

/**
 * Validates that all required environment variables are set
 *
 * Checks for the presence of KORREKTLY_API_TOKEN environment variable.
 * If any required variables are missing, prints an error message listing
 * the missing variables and exits the process with code 1.
 *
 * @throws Process exits with code 1 if required environment variables are missing
 *
 * @example
 * ```typescript
 * // Before running CLI commands
 * validateEnvironment();
 * // Continues if KORREKTLY_API_TOKEN is set
 * // Exits with error if missing
 * ```
 */
function validateEnvironment() {
  const missing: string[] = [];

  if (!KORREKTLY_API_TOKEN) {
    missing.push("KORREKTLY_API_TOKEN");
  }

  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    for (const varName of missing) {
      console.error(`  - ${varName}`);
    }
    console.error(
      "\nPlease set these environment variables before running the command.",
    );
    process.exit(1);
  }
}

/**
 * Uploads documentation chunks to Korrektly in batches with automatic retry logic
 *
 * This function handles the batch upload of chunks to the Korrektly API with built-in
 * error handling and exponential backoff retry logic. Chunks are uploaded in configurable
 * batch sizes to avoid overwhelming the API and to handle rate limits gracefully.
 *
 * Features:
 * - Batched uploads for efficient processing
 * - Automatic retry with exponential backoff (up to 10 seconds)
 * - Detailed error reporting including problematic chunk details
 * - Optional upsert mode to update existing chunks by content_hash
 * - Progress logging for each batch
 *
 * @param client - Initialized Korrektly SDK client instance
 * @param datasetId - The target dataset ID where chunks will be uploaded
 * @param chunks - Array of chunk objects to upload
 * @param batchSize - Number of chunks to upload per batch (default: 80)
 * @param maxRetries - Maximum number of retry attempts per batch (default: 3)
 * @param upsert - Enable refresh_on_duplicate to update existing chunks (default: true)
 * @returns Promise that resolves when all batches are processed
 *
 * @example
 * ```typescript
 * const client = new Korrektly({ apiToken: "..." });
 * const chunks = [{ chunk_html: "<p>Content</p>", tracking_id: "doc-1" }];
 *
 * await uploadChunks(client, "dataset-123", chunks, 50, 3, true);
 * // Uploads chunks in batches of 50 with up to 3 retries
 * ```
 */
async function uploadChunks(
  client: Korrektly,
  datasetId: string,
  chunks: ChunkInput[],
  batchSize = 80,
  maxRetries = 3,
  upsert = true,
): Promise<void> {
  console.log(
    `\nUploading ${chunks.length} chunks in batches of ${batchSize}...`,
  );
  if (upsert) {
    console.log(
      "Refresh mode: enabled (will update existing chunks data by content_hash)",
    );
  }

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(chunks.length / batchSize);

    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} chunks)`);

    let retries = 0;
    let success = false;

    while (retries <= maxRetries && !success) {
      try {
        await client.createChunks(datasetId, {
          chunks: batch,
          refresh_on_duplicate: upsert,
        });
        console.log(`  ✓ Batch uploaded successfully`);
        success = true;
      } catch (err) {
        retries++;
        console.error(
          `  ✗ Batch upload failed (attempt ${retries}/${maxRetries}):`,
          err,
        );

        // If the error mentions a specific chunk index, show that chunk's details
        const errorStr = String(err);
        const chunkIndexMatch = errorStr.match(/chunks\.(\d+)/);
        if (chunkIndexMatch && retries === 1) {
          const chunkIndex = parseInt(chunkIndexMatch[1], 10);
          if (chunkIndex < batch.length) {
            console.error(`\n  🔍 Problematic chunk at index ${chunkIndex}:`);
            console.error(
              `     source_url: ${batch[chunkIndex].source_url || "(none)"}`,
            );
            console.error(`     tracking_id: ${batch[chunkIndex].tracking_id}`);
            console.error(
              `     chunk_html: ${batch[chunkIndex].chunk_html?.substring(0, 100)}...`,
            );
          }
        }

        if (retries <= maxRetries) {
          const waitTime = Math.min(1000 * 2 ** (retries - 1), 10000);
          console.log(`  ⏳ Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    if (!success) {
      console.error(
        `  ✗ Batch ${batchNum} failed after ${maxRetries} retries. Skipping...`,
      );
    }
  }

  console.log("\n✓ Upload complete!");
}

/**
 * Main entry point for the Korrektly VitePress CLI adapter
 *
 * This CLI tool extracts and indexes VitePress documentation and OpenAPI specifications
 * into Korrektly for semantic search. It processes markdown files, extracts content
 * sections, and uploads them as searchable chunks.
 *
 * Workflow:
 * 1. Validates environment variables (KORREKTLY_API_TOKEN)
 * 2. Processes OpenAPI spec if provided (extracts API endpoints)
 * 3. Discovers markdown files in the VitePress docs directory
 * 4. Extracts chunks from each markdown file (respecting .gitignore)
 * 5. Deduplicates chunks by tracking_id
 * 6. Validates chunk URLs
 * 7. Uploads chunks in batches with retry logic
 *
 * CLI Options:
 * - `-p, --path <path>` - Path to VitePress docs directory (required)
 * - `-d, --dataset <id>` - Dataset ID (overrides KORREKTLY_DATASET_ID env var)
 * - `-r, --root-url <url>` - Root URL for source URLs (e.g., https://docs.example.com)
 * - `-s, --openapi-spec <url>` - URL of OpenAPI specification file
 * - `-a, --api-ref-path <path>` - API reference path prefix (default: "api")
 * - `-b, --batch-size <number>` - Chunks per batch (default: 50)
 * - `--no-upsert` - Disable upsert by tracking_id
 * - `--no-gitignore` - Disable .gitignore file respecting
 *
 * @throws Process exits with code 1 on fatal errors or missing required configuration
 *
 * @example
 * ```bash
 * # Set required environment variables
 * export KORREKTLY_API_TOKEN="your-api-token"
 * export KORREKTLY_DATASET_ID="your-dataset-id"
 *
 * # Run the CLI
 * korrektly-vitepress --path ./docs --root-url https://docs.example.com
 *
 * # With OpenAPI spec
 * korrektly-vitepress --path ./docs --root-url https://docs.example.com \
 *   --openapi-spec https://api.example.com/openapi.json
 * ```
 */
async function main() {
  const program = new Command();

  program
    .name("korrektly-vitepress")
    .description(
      "Index VitePress documentation and OpenAPI specs into Korrektly",
    )
    .version("0.1.0")
    .requiredOption("-p, --path <path>", "Path to the VitePress docs directory")
    .option(
      "-d, --dataset <id>",
      "Dataset ID (overrides KORREKTLY_DATASET_ID env var)",
    )
    .option(
      "-r, --root-url <url>",
      "Root URL for source URLs (e.g., https://docs.example.com)",
    )
    .option("-s, --openapi-spec <url>", "URL of OpenAPI specification file")
    .option(
      "-a, --api-ref-path <path>",
      'API reference path prefix (default: "api")',
      "api",
    )
    .option(
      "-b, --batch-size <number>",
      "Number of chunks to upload per batch (default: 50)",
      "50",
    )
    .option(
      "--no-upsert",
      "Disable upsert by tracking_id (upsert enabled by default)",
    )
    .option(
      "--no-gitignore",
      "Disable .gitignore file respecting (enabled by default)",
    )
    .parse(process.argv);

  const options = program.opts();

  // Validate environment
  validateEnvironment();

  // Get dataset ID
  const datasetId = options.dataset ?? KORREKTLY_DATASET_ID;
  if (!datasetId) {
    console.error(
      "Error: Dataset ID is required. Provide it via --dataset flag or KORREKTLY_DATASET_ID env var.",
    );
    process.exit(1);
  }

  // Expand tilde in path and resolve to absolute path
  const docsPath = resolve(expandTilde(options.path));

  // Initialize Korrektly client
  const client = new Korrektly({
    apiToken: KORREKTLY_API_TOKEN as string,
    baseUrl: KORREKTLY_BASE_URL,
  });

  console.log("Korrektly VitePress Adapter");
  console.log("===========================");
  console.log(`Dataset ID: ${datasetId}`);
  console.log(`Docs path: ${docsPath}`);
  if (options.rootUrl) console.log(`Root URL: ${options.rootUrl}`);
  if (options.openapiSpec) console.log(`OpenAPI spec: ${options.openapiSpec}`);

  let allChunks: ChunkInput[] = [];

  // Process OpenAPI spec if provided
  if (options.openapiSpec) {
    console.log("\n📖 Processing OpenAPI spec...");
    const openapiChunks = await extractChunksFromOpenAPI(
      options.openapiSpec,
      options.rootUrl,
      options.apiRefPath,
    );
    allChunks = allChunks.concat(openapiChunks);
    console.log(`  Found ${openapiChunks.length} API endpoints`);
  }

  // Process markdown files
  console.log("\n📄 Processing markdown files...");
  try {
    const markdownPaths = await extractMarkdownPaths(docsPath, {
      respectGitignore: options.gitignore !== false,
    });
    console.log(`  Found ${markdownPaths.length} markdown files`);
    console.log("  Skipping Vue component files (files with <script setup>)");
    if (options.gitignore !== false) {
      console.log("  Respecting .gitignore patterns");
    }

    for (const path of markdownPaths) {
      const chunks = await extractChunksFromMarkdown(
        path,
        options.rootUrl,
        docsPath,
      );
      allChunks = allChunks.concat(chunks);
    }

    console.log(
      `  Generated ${allChunks.length - (options.openapiSpec ? allChunks.length - allChunks.length : 0)} chunks from markdown`,
    );
  } catch (err) {
    console.error("Error processing markdown files:", err);
    process.exit(1);
  }

  // Deduplicate chunks by tracking_id
  const uniqueChunks = Array.from(
    new Map(allChunks.map((chunk) => [chunk.tracking_id, chunk])).values(),
  );

  if (uniqueChunks.length < allChunks.length) {
    console.log(
      `\n⚠️  Removed ${allChunks.length - uniqueChunks.length} duplicate chunks`,
    );
  }

  console.log(`\n📊 Total unique chunks: ${uniqueChunks.length}`);

  // Validate all chunks have valid source URLs
  console.log("\n🔍 Validating chunk URLs...");

  // Show sample URLs for debugging
  console.log("  Sample URLs being generated:");
  uniqueChunks.slice(0, 3).forEach((chunk, i) => {
    console.log(`    ${i + 1}. ${chunk.source_url || "(no URL)"}`);
  });

  const validChunks = uniqueChunks.filter((chunk, index) => {
    if (chunk.source_url) {
      // Check for common URL issues
      const url = chunk.source_url;

      // Check 1: Valid URL format
      try {
        new URL(url);
      } catch {
        console.warn(
          `  ⚠️  Skipping chunk ${index + 1}: Invalid URL format: ${url}`,
        );
        console.warn(`     Tracking ID: ${chunk.tracking_id}`);
        return false;
      }

      // Check 2: No double slashes in path (except after protocol)
      if (url.includes("://") && url.split("://")[1].includes("//")) {
        console.warn(
          `  ⚠️  Skipping chunk ${index + 1}: Double slashes in path: ${url}`,
        );
        console.warn(`     Tracking ID: ${chunk.tracking_id}`);
        return false;
      }

      // Check 3: No spaces or invalid characters
      if (url.includes(" ") || /[\s\t\n\r]/.test(url)) {
        console.warn(
          `  ⚠️  Skipping chunk ${index + 1}: Whitespace in URL: ${url}`,
        );
        console.warn(`     Tracking ID: ${chunk.tracking_id}`);
        return false;
      }

      return true;
    }
    return true; // Allow chunks without source_url
  });

  const skippedCount = uniqueChunks.length - validChunks.length;
  if (skippedCount > 0) {
    console.log(`  ⚠️  Skipped ${skippedCount} chunks with invalid URLs`);
  }
  console.log(`  ✓ ${validChunks.length} chunks validated`);

  // Upload chunks
  if (validChunks.length === 0) {
    console.log("\n⚠️  No valid chunks to upload. Exiting.");
    process.exit(0);
  }

  const batchSize = parseInt(options.batchSize, 10);
  const upsert = options.upsert !== false; // upsert is true by default unless --no-upsert is passed
  await uploadChunks(client, datasetId, validChunks, batchSize, 3, upsert);

  console.log("\n✨ Done!");
  process.exit(0);
}

// Run the CLI
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
