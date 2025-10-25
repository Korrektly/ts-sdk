import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Recursively extract all markdown file paths from a directory
 */
export async function extractMarkdownPaths(
  folderPath: string,
): Promise<string[]> {
  const mdPaths: string[] = [];

  try {
    const entries = await readdir(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(folderPath, entry.name);

      if (entry.isDirectory() && !fullPath.includes("node_modules")) {
        // Recursively search subdirectories
        const subPaths = await extractMarkdownPaths(fullPath);
        mdPaths.push(...subPaths);
      } else if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) {
        mdPaths.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${folderPath}:`, err);
  }

  return mdPaths;
}

/**
 * Generate a URL-safe tracking ID from components
 */
export function generateTrackingId(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join("-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();
}

/**
 * Extract hierarchy from file path
 */
export function extractHierarchy(path: string): string[] {
  return path
    .replace(/\.mdx?$/, "")
    .split("/")
    .filter((x) => x && x !== ".");
}

/**
 * Clean and normalize text content
 */
export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
}
