import { readFile } from "node:fs/promises";
import { normalize, relative, resolve } from "node:path";
import type { ChunkInput } from "@korrektly/sdk";
import { parseHTML } from "linkedom";
import { marked } from "marked";
import { parse as parseYaml } from "yaml";
import { cleanText, extractHierarchy, generateTrackingId } from "./utils.js";

interface Frontmatter {
  title?: string;
  subtitle?: string;
  description?: string;
  slug?: string;
  weight?: number;
  [key: string]: unknown;
}

interface HeadingSection {
  heading: string;
  body: string;
  level: number;
}

/**
 * Parses YAML frontmatter and content from a markdown file
 *
 * Extracts frontmatter metadata enclosed in `---` delimiters at the beginning
 * of the file. The frontmatter is parsed as YAML and returned along with the
 * remaining content. If no frontmatter exists or parsing fails, returns an
 * empty frontmatter object and the full file content.
 *
 * Frontmatter format:
 * ```markdown
 * ---
 * title: Page Title
 * description: Page description
 * ---
 * Content here...
 * ```
 *
 * @param fileContent - The raw markdown file content as a string
 * @returns Object containing parsed frontmatter and the remaining content
 * @returns frontmatter - Parsed YAML metadata (empty object if none found)
 * @returns content - Markdown content after frontmatter
 *
 * @private
 */
function parseFrontmatter(fileContent: string): {
  frontmatter: Frontmatter;
  content: string;
} {
  const parts = fileContent.split("---");

  if (parts.length >= 3) {
    const frontmatterStr = parts[1].trim();
    const content = parts.slice(2).join("---").trim();

    try {
      const frontmatter = parseYaml(frontmatterStr) as Frontmatter;
      return { frontmatter, content };
    } catch (err) {
      console.warn("Failed to parse frontmatter:", err);
    }
  }

  return {
    frontmatter: {},
    content: fileContent,
  };
}

/**
 * Splits HTML content into logical sections based on heading elements
 *
 * This function parses HTML and divides it into sections, where each section
 * consists of a heading (H1-H6) and its associated body content. The body
 * includes all elements between the heading and the next heading. This enables
 * chunk-based indexing where each heading and its content becomes a searchable unit.
 *
 * Uses linkedom for fast HTML parsing and DOM manipulation. Sections without
 * headings are filtered out to ensure all chunks have meaningful titles.
 *
 * @param html - HTML string to be split into sections
 * @returns Array of heading sections, each containing heading text, body content, and heading level
 * @returns heading - The heading text (H1-H6)
 * @returns body - The body content associated with this heading
 * @returns level - The heading level (1-6)
 *
 * @example
 * ```typescript
 * const html = `
 *   <h1>Introduction</h1>
 *   <p>Welcome to the docs</p>
 *   <h2>Getting Started</h2>
 *   <p>Install the package</p>
 * `;
 * const sections = splitIntoSections(html);
 * // Returns:
 * // [
 * //   { heading: "Introduction", body: "Welcome to the docs", level: 1 },
 * //   { heading: "Getting Started", body: "Install the package", level: 2 }
 * // ]
 * ```
 *
 * @private
 */
function splitIntoSections(html: string): HeadingSection[] {
  const { document } = parseHTML(
    `<!DOCTYPE html><html><body>${html}</body></html>`,
  );
  const body = document.body;
  const sections: HeadingSection[] = [];

  let currentHeading = "";
  let currentBody = "";
  let currentLevel = 0;
  const headingRegex = /^H[1-6]$/i;

  for (const element of Array.from(body.children) as Element[]) {
    const isHeading = headingRegex.test(element.tagName);

    if (isHeading) {
      // Save previous section if it exists
      if (currentHeading || currentBody) {
        sections.push({
          heading: currentHeading,
          body: cleanText(currentBody),
          level: currentLevel,
        });
      }

      // Start new section
      currentHeading = cleanText(element.textContent || "");
      currentBody = "";
      currentLevel = parseInt(element.tagName.substring(1), 10);
    } else {
      // Accumulate body content
      const text = element.textContent || "";
      currentBody += (currentBody ? "\n" : "") + text;
    }
  }

  // Add final section
  if (currentHeading || currentBody) {
    sections.push({
      heading: currentHeading,
      body: cleanText(currentBody),
      level: currentLevel,
    });
  }

  return sections.filter((s) => s.heading); // Only keep sections with headings
}

/**
 * Extract chunks from a markdown file
 */
export async function extractChunksFromMarkdown(
  filePath: string,
  rootUrl?: string,
  basePath?: string,
): Promise<ChunkInput[]> {
  try {
    const fileContent = await readFile(filePath, "utf-8");

    // Skip Vue component files (VitePress dynamic routes with <script setup>)
    if (
      fileContent.includes("<script setup") ||
      fileContent.includes("<OAOperation") ||
      /<[A-Z]\w+\s+:/.test(fileContent) // Vue component syntax like <Component :prop="value">
    ) {
      return [];
    }

    const { frontmatter, content } = parseFrontmatter(fileContent);

    // Convert markdown to HTML
    const html = await marked(content);

    // Prepend title and subtitle to HTML if they exist
    let finalHtml = html;

    if (frontmatter.title || frontmatter.subtitle) {
      const parts: string[] = [];

      if (frontmatter.title) {
        parts.push(`<h1>${frontmatter.title}</h1>`);
      }

      if (frontmatter.subtitle) {
        parts.push(`<h2>${frontmatter.subtitle}</h2>`);
      }

      parts.push(html);
      finalHtml = parts.join("\n");
    }

    // Split into sections
    const sections = splitIntoSections(finalHtml);

    // Generate chunks
    const chunks: ChunkInput[] = [];

    // Compute relative path for slug (relative to base docs directory)
    // Normalize and resolve paths to handle ~ and symlinks
    const normalizedFilePath = resolve(filePath);
    const normalizedBasePath = basePath ? resolve(basePath) : null;

    let relativePath = normalizedBasePath
      ? relative(normalizedBasePath, normalizedFilePath)
      : normalizedFilePath;

    // Normalize the relative path and convert backslashes to forward slashes
    relativePath = normalize(relativePath).replace(/\\/g, "/");

    // Remove any leading ../ or ./ to ensure valid URLs
    relativePath = relativePath
      .replace(/^(\.\.(\/|\\))+/, "")
      .replace(/^\.\//, "");

    const hierarchy = extractHierarchy(relativePath);
    const slug = frontmatter.slug ?? relativePath.replace(/\.mdx?$/, "");

    // Ensure slug doesn't start with / if we're going to add one
    const cleanSlug = slug.replace(/^\/+/, "");
    const baseUrl = `/${cleanSlug}`;
    const sourceUrl = rootUrl ? `${rootUrl}${baseUrl}` : baseUrl;

    // Validate the source URL
    if (rootUrl) {
      try {
        new URL(sourceUrl);
      } catch {
        console.warn(
          `Skipping file ${filePath}: Invalid source URL generated: ${sourceUrl}`,
        );
        return [];
      }
    }

    for (const section of sections) {
      if (!section.heading) continue;

      // Create chunk HTML
      const chunkHtml = `<h${section.level}>${section.heading}</h${section.level}>\n<p>${section.body}</p>`;

      // Build semantic content (for embedding)
      const semanticParts = [section.heading];
      if (frontmatter.title) semanticParts.unshift(frontmatter.title);
      if (frontmatter.subtitle) semanticParts.unshift(frontmatter.subtitle);
      if (section.body) semanticParts.push(section.body);
      const semanticContent = semanticParts.join(" ");

      // Build metadata
      const metadata: Record<string, string | number | boolean | string[]> = {
        heading: section.heading,
        url: sourceUrl,
        hierarchy: hierarchy,
      };

      if (frontmatter.title) metadata.title = frontmatter.title;
      if (frontmatter.subtitle) metadata.subtitle = frontmatter.subtitle;
      if (frontmatter.description)
        metadata.description = frontmatter.description;

      // Generate tracking ID
      const trackingId = generateTrackingId(slug, section.heading);

      const chunk: ChunkInput = {
        chunk_html: chunkHtml,
        tracking_id: trackingId,
        source_url: sourceUrl,
        tag_set: hierarchy,
        metadata,
        semantic_content: semanticContent,
        fulltext_content: `${section.heading} ${section.body}`,
        weight: frontmatter.weight ?? (section.level === 1 ? 1.2 : 1.0),
        refresh_on_duplicate: true,
        group_tracking_ids: [filePath],
      };

      chunks.push(chunk);
    }

    return chunks;
  } catch (err) {
    console.error(`Error processing markdown file ${filePath}:`, err);
    return [];
  }
}
