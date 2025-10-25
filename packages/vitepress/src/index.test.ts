import { describe, expect, test } from "bun:test";
import { cleanText, extractHierarchy, generateTrackingId } from "./utils.js";

describe("@korrektly/vitepress", () => {
  describe("cleanText", () => {
    test("should remove extra whitespace", () => {
      const input = "  Hello   world  \n  test  ";
      const result = cleanText(input);
      expect(result).toBe("Hello world test");
    });

    test("should handle empty strings", () => {
      const result = cleanText("");
      expect(result).toBe("");
    });

    test("should handle strings with only whitespace", () => {
      const result = cleanText("   \n   \t   ");
      expect(result).toBe("");
    });
  });

  describe("extractHierarchy", () => {
    test("should extract hierarchy from file path", () => {
      const path = "docs/guide/getting-started.md";
      const result = extractHierarchy(path);
      expect(result).toEqual(["docs", "guide", "getting-started"]);
    });

    test("should remove .mdx extension", () => {
      const path = "docs/api/reference.mdx";
      const result = extractHierarchy(path);
      expect(result).toEqual(["docs", "api", "reference"]);
    });

    test("should filter out empty segments and dots", () => {
      const path = "./docs//guide/index.md";
      const result = extractHierarchy(path);
      expect(result).toEqual(["docs", "guide", "index"]);
    });

    test("should handle single file", () => {
      const path = "README.md";
      const result = extractHierarchy(path);
      expect(result).toEqual(["README"]);
    });
  });

  describe("generateTrackingId", () => {
    test("should generate consistent tracking IDs for the same input", () => {
      const url = "https://example.com/docs";
      const heading = "Introduction";
      const id1 = generateTrackingId(url, heading);
      const id2 = generateTrackingId(url, heading);
      expect(id1).toBe(id2);
    });

    test("should generate different tracking IDs for different inputs", () => {
      const url = "https://example.com/docs";
      const id1 = generateTrackingId(url, "Heading 1");
      const id2 = generateTrackingId(url, "Heading 2");
      expect(id1).not.toBe(id2);
    });

    test("should generate tracking IDs without heading", () => {
      const url = "https://example.com/docs";
      const id = generateTrackingId(url);
      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });
});
