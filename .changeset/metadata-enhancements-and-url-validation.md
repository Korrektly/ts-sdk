---
"@korrektly/sdk": patch
"@korrektly/vitepress": patch
---

Improve VitePress adapter with metadata enhancements and URL validation

- Add refresh_on_duplicate field to replace upsert behavior
- Change metadata hierarchy from string to array for better structure
- Add comprehensive URL validation and error reporting
- Implement tilde expansion for file paths
- Skip Vue component files during markdown processing
- Improve path normalization and slug generation
- Add detailed error messages showing problematic chunks
- Allow forward slashes in tracking IDs
