import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

/**
 * Parses a .gitignore file and returns an array of ignore patterns
 *
 * Reads the .gitignore file from the specified root directory and extracts
 * all non-comment, non-empty lines as ignore patterns. These patterns are
 * used to exclude files and directories from being processed during markdown
 * extraction.
 *
 * Pattern processing:
 * - Filters out empty lines and comments (lines starting with #)
 * - Removes trailing slashes from directory patterns
 * - Preserves wildcard patterns (*, **)
 * - Returns empty array if .gitignore doesn't exist
 *
 * @param rootPath - The root directory path where .gitignore is located
 * @returns Promise resolving to array of gitignore patterns (empty if file not found)
 *
 * @example
 * ```typescript
 * const patterns = await parseGitignore("/path/to/project");
 * // Returns: ["node_modules", "dist", "*.log", ".env"]
 * ```
 *
 * @private
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
 * Checks if a file path matches any gitignore pattern
 *
 * Implements gitignore pattern matching logic to determine if a file or directory
 * should be excluded from processing. Supports exact matches, directory matches,
 * wildcard patterns (*, **), and nested directory matching.
 *
 * Matching rules:
 * - Exact match: "file.txt" matches "file.txt"
 * - Directory match: "node_modules" matches "node_modules/package.json"
 * - Wildcard single: "*.log" matches "error.log"
 * - Wildcard recursive: "**\/test" matches "src/utils/test/file.js"
 * - Parent directory: "dist" matches "docs/dist/index.html"
 * - Negation patterns (starting with !) are currently skipped
 *
 * @param relativePath - The file path relative to the root directory
 * @param patterns - Array of gitignore patterns to match against
 * @returns `true` if the path matches any pattern and should be ignored, `false` otherwise
 *
 * @example
 * ```typescript
 * const patterns = ["node_modules", "*.log", "dist"];
 * isIgnored("node_modules/package.json", patterns); // true
 * isIgnored("src/index.ts", patterns); // false
 * isIgnored("error.log", patterns); // true
 * isIgnored("docs/dist/index.html", patterns); // true
 * ```
 *
 * @private
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
