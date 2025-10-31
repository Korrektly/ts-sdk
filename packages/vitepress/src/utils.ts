import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

/**
 * Parse .gitignore file and return patterns
 */
async function parseGitignore(rootPath: string): Promise<string[]> {
  try {
    const gitignorePath = join(rootPath, ".gitignore");
    const content = await readFile(gitignorePath, "utf-8");

    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((pattern) => {
        // Remove trailing slashes
        if (pattern.endsWith("/")) {
          pattern = pattern.slice(0, -1);
        }
        return pattern;
      });
  } catch {
    return [];
  }
}

/**
 * Check if a path matches any gitignore pattern
 */
function isIgnored(relativePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Handle negation patterns
    if (pattern.startsWith("!")) {
      continue;
    }

    // Remove leading slash if present (gitignore syntax)
    const cleanPattern = pattern.startsWith("/") ? pattern.slice(1) : pattern;

    // Exact match
    if (relativePath === cleanPattern) {
      return true;
    }

    // Directory match (e.g., node_modules matches node_modules/*)
    // This handles both "node_modules" and "node_modules/" patterns
    if (relativePath.startsWith(`${cleanPattern}/`)) {
      return true;
    }

    // Also check if the pattern itself ends with / and matches as a directory
    if (pattern.endsWith("/") && relativePath.startsWith(cleanPattern)) {
      return true;
    }

    // Wildcard patterns
    if (cleanPattern.includes("*")) {
      const regexPattern = cleanPattern
        .replace(/\./g, "\\.")
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*");

      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(relativePath)) {
        return true;
      }

      // Also try matching with /** appended for directory patterns
      const dirRegex = new RegExp(`^${regexPattern}/.*$`);
      if (dirRegex.test(relativePath)) {
        return true;
      }
    }

    // Check if any parent directory or the directory itself matches
    const parts = relativePath.split("/");
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Match exact directory name
      if (part === cleanPattern) {
        return true;
      }
      // Match path prefix (e.g., "dist" matches "docs/dist/foo.md")
      const pathPrefix = parts.slice(0, i + 1).join("/");
      if (pathPrefix === cleanPattern) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Recursively extract all markdown file paths from a directory
 */
export async function extractMarkdownPaths(
  folderPath: string,
  options?: {
    respectGitignore?: boolean;
    rootPath?: string;
    gitignorePatterns?: string[];
  },
): Promise<string[]> {
  const mdPaths: string[] = [];
  const respectGitignore = options?.respectGitignore ?? true;
  const isRoot = options?.rootPath === undefined;
  const actualRootPath = options?.rootPath ?? folderPath;
  let gitignorePatterns = options?.gitignorePatterns;

  // Load .gitignore patterns from root directory if enabled
  if (isRoot && respectGitignore) {
    gitignorePatterns = await parseGitignore(actualRootPath);
  }

  try {
    const entries = await readdir(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(folderPath, entry.name);
      const relativePath = relative(actualRootPath, fullPath);

      // Skip if ignored by gitignore or is node_modules
      if (
        entry.name === "node_modules" ||
        isIgnored(relativePath, gitignorePatterns ?? [])
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subPaths = await extractMarkdownPaths(fullPath, {
          respectGitignore,
          rootPath: actualRootPath,
          gitignorePatterns,
        });
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
    .replace(/[^a-zA-Z0-9-_/]/g, "")
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
