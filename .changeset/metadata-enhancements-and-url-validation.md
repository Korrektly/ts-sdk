---
"@korrektly/sdk": patch
---

Add refresh_on_duplicate field and extend metadata type support

- Add refresh_on_duplicate field to ChunkInput and ChunkRequest for controlling timestamp updates on duplicates
- Extend metadata type to support string arrays in addition to string, number, and boolean values
