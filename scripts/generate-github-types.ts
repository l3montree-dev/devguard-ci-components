#!/usr/bin/env bun
/**
 * Generate GitHub Actions TypeScript types from JSON Schema
 *
 * Downloads the official GitHub Actions workflow schema and generates
 * TypeScript type definitions automatically.
 */

import { compile } from "json-schema-to-typescript";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

const SCHEMA_URL = "https://www.schemastore.org/github-workflow.json";

const OUTPUT_FILE = "./definitions/lib/github-actions-schema.ts";

async function generateGitHubTypes() {
  try {
    console.log("📥 Downloading GitHub Actions schema from", SCHEMA_URL);

    const response = await fetch(SCHEMA_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to download schema: ${response.status} ${response.statusText}`,
      );
    }

    const schema = await response.json();
    console.log("✅ Schema downloaded");

    console.log("🔨 Generating TypeScript types...");

    const typeDefinitions = await compile(schema, "GitHubWorkflow", {
      bannerComment:
        "// This file is auto-generated from GitHub Actions schema\n// Do not edit directly - run: bun scripts/generate-github-types.ts",
      declareExternallyReferenced: true,
      unreachableDefinitions: false,
      strictIndexSignatures: true,
    });

    // Ensure output directory exists
    await mkdir(dirname(OUTPUT_FILE), { recursive: true });

    // Write the generated types
    await writeFile(OUTPUT_FILE, typeDefinitions);

    console.log(`✅ Types generated: ${OUTPUT_FILE}`);
    console.log(`   Lines: ${typeDefinitions.split("\n").length}`);
  } catch (error) {
    console.error("❌ Error generating types:", error);
    process.exit(1);
  }
}

generateGitHubTypes();
