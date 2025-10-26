# @korrektly/vitepress

## 0.1.3

### Patch Changes

- Updated dependencies [39af6b0]
  - @korrektly/sdk@0.1.1

## 0.1.2

### Patch Changes

- b7c1377: fix: resolve chunk generation issue and add .gitignore support in VitePress adapter

  Fixed a critical bug where the VitePress adapter would find markdown files but generate 0 chunks. The issue was caused by:

  1. HTML content being wrapped in a container DIV, preventing the section splitter from accessing heading elements directly
  2. parseHTML receiving HTML fragments instead of complete documents, causing parsing failures

  Added .gitignore support to respect repository ignore patterns when indexing documentation files.

  Changes:

  - Removed DOM-based HTML manipulation in favor of string concatenation for title/subtitle injection
  - Added proper HTML document wrapper (`<!DOCTYPE html><html><body>...</body></html>`) before parsing HTML fragments
  - Added .gitignore file parsing and pattern matching (enabled by default)
  - Added `--no-gitignore` CLI flag to disable .gitignore respecting if needed

  This fix enables the adapter to successfully extract chunks from VitePress documentation sites while respecting gitignore patterns.

## 0.1.1

### Patch Changes

- d8c54ef: fix: use npm dependency for korrektly sdk

## 0.1.0

### Minor Changes

- eda585d: Initial release of @korrektly/vitepress

  This is the first public release of the VitePress documentation adapter for Korrektly.

  Features:

  - Automatic markdown/MDX file discovery and indexing
  - OpenAPI/Swagger specification integration
  - Smart content chunking by heading levels (h1-h6)
  - Frontmatter support for metadata (title, subtitle, slug, weight, description)
  - CLI tool for easy integration with documentation workflows
  - Programmatic API for custom integration scenarios
  - Batch upload with automatic retry logic
  - Incremental updates using upsert strategy
  - Source URL generation for linking back to documentation
  - Tag-based organization using file path hierarchy
  - Metadata extraction for enhanced searchability
  - Compatible with Node.js, Bun, and Deno

### Patch Changes

- Updated dependencies [eda585d]
  - @korrektly/sdk@0.1.0
