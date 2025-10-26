---
"@korrektly/sdk": minor
"@korrektly/vitepress": minor
---

Improve error handling and add upsert support

- Enhanced API error handling in SDK with detailed error messages from response body
- Added JSON content-type validation before parsing responses
- Added upsert support to vitepress CLI with --no-upsert flag
- Made batch size configurable via --batch-size option
- Reduced default batch size from 120 to 80 for better reliability
