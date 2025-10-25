#!/usr/bin/env node

import type { ChunkInput } from "@korrektly/sdk";
import { Korrektly } from "@korrektly/sdk";
import { Command } from "commander";
import { extractChunksFromMarkdown } from "./markdown.js";
import { extractChunksFromOpenAPI } from "./openapi.js";
import { extractMarkdownPaths } from "./utils.js";

// Environment variables
const KORREKTLY_API_TOKEN = process.env.KORREKTLY_API_TOKEN;
const KORREKTLY_DATASET_ID = process.env.KORREKTLY_DATASET_ID;
const KORREKTLY_BASE_URL = process.env.KORREKTLY_BASE_URL;

// Validate required environment variables
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
 * Upload chunks in batches with retry logic
 */
async function uploadChunks(
  client: Korrektly,
  datasetId: string,
  chunks: ChunkInput[],
  batchSize = 120,
  maxRetries = 3,
): Promise<void> {
  console.log(
    `\nUploading ${chunks.length} chunks in batches of ${batchSize}...`,
  );

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(chunks.length / batchSize);

    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} chunks)`);

    let retries = 0;
    let success = false;

    while (retries <= maxRetries && !success) {
      try {
        await client.createChunks(datasetId, { chunks: batch });
        console.log(`  ✓ Batch uploaded successfully`);
        success = true;
      } catch (err) {
        retries++;
        console.error(
          `  ✗ Batch upload failed (attempt ${retries}/${maxRetries}):`,
          err,
        );

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
 * Main CLI program
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

  // Initialize Korrektly client
  const client = new Korrektly({
    apiToken: KORREKTLY_API_TOKEN as string,
    baseUrl: KORREKTLY_BASE_URL,
  });

  console.log("Korrektly VitePress Adapter");
  console.log("===========================");
  console.log(`Dataset ID: ${datasetId}`);
  console.log(`Docs path: ${options.path}`);
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
    const markdownPaths = await extractMarkdownPaths(options.path, {
      respectGitignore: options.gitignore !== false,
    });
    console.log(`  Found ${markdownPaths.length} markdown files`);
    if (options.gitignore !== false) {
      console.log("  Respecting .gitignore patterns");
    }

    for (const path of markdownPaths) {
      const chunks = await extractChunksFromMarkdown(path, options.rootUrl);
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

  // Upload chunks
  if (uniqueChunks.length === 0) {
    console.log("\n⚠️  No chunks to upload. Exiting.");
    process.exit(0);
  }

  await uploadChunks(client, datasetId, uniqueChunks);

  console.log("\n✨ Done!");
  process.exit(0);
}

// Run the CLI
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
