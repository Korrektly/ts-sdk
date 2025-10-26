---
"@korrektly/sdk": patch
---

Enhanced API error handling with detailed error messages

- Improved error handling to include detailed error messages from API response body
- Added JSON content-type validation before parsing responses

---
"@korrektly/vitepress": patch
---

Added upsert support and improved batch processing configuration

- Added upsert support with --no-upsert flag for controlling document update behavior
- Made batch size configurable via --batch-size option
- Reduced default batch size from 120 to 80 for better reliability
