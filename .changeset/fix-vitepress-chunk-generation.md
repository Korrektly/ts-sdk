---
"@korrektly/vitepress": patch
---

fix: resolve chunk generation issue and add .gitignore support in VitePress adapter

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
