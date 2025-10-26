# @korrektly/sdk

## 0.1.1

### Patch Changes

- 39af6b0: Enhanced API error handling with detailed error messages

  - Improved error handling to include detailed error messages from API response body
  - Added JSON content-type validation before parsing responses

  ***

  ## "@korrektly/vitepress": patch

  Added upsert support and improved batch processing configuration

  - Added upsert support with --no-upsert flag for controlling document update behavior
  - Made batch size configurable via --batch-size option
  - Reduced default batch size from 120 to 80 for better reliability

## 0.1.0

### Minor Changes

- eda585d: Initial release of @korrektly/sdk

  This is the first public release of the official Korrektly TypeScript/JavaScript SDK.

  Features:

  - Hybrid, semantic, and full-text search capabilities
  - Advanced filtering with boolean queries (must, should, must_not)
  - Range filters for numeric and date-based queries
  - Autocomplete with prefix matching and trigram similarity fallback
  - Comprehensive chunk management with upsert support
  - Batch operations for efficient data upload (up to 120 chunks)
  - Rich metadata support including tags, weights, timestamps, and custom fields
  - Full TypeScript support with comprehensive type definitions
  - Built with Bun for optimal performance
