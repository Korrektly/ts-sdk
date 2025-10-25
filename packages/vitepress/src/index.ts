/**
 * @korrektly/vitepress
 * VitePress documentation adapter for Korrektly
 */

export { extractChunksFromMarkdown } from "./markdown.js";
export { extractChunksFromOpenAPI } from "./openapi.js";
export {
  cleanText,
  extractHierarchy,
  extractMarkdownPaths,
  generateTrackingId,
} from "./utils.js";
