/**
 * Script to fix all agent API routes to use JWT authentication
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const API_AGENT_DIR = "src/app/api/agent";

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    const items = readdirSync(currentDir);

    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith(".ts") && !item.endsWith(".d.ts")) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function fixFile(filePath: string): boolean {
  try {
    let content = readFileSync(filePath, "utf-8");
    const originalContent = content;

    // Skip if already using requireAdminAuth
    if (content.includes("requireAdminAuth")) {
      console.log(`⏭️  Skipping (already fixed): ${filePath}`);
      return false;
    }

    // Skip if doesn't use auth()
    if (!content.includes("await auth()")) {
      return false;
    }

    // Replace import
    if (content.includes('import { auth } from "@/lib/auth"')) {
      content = content.replace(
        'import { auth } from "@/lib/auth";',
        'import { requireAdminAuth } from "@/lib/admin-auth";',
      );
    }

    // Fix auth checks - multiple patterns
    content = content.replace(
      /const session = await auth\(\);\s*\n\s*if \(!session\) \{\s*\n\s*return NextResponse\.json\([^}]+\}, \{ status: 401 \}\);?\s*\n\s*\}/g,
      `const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }`,
    );

    content = content.replace(
      /const session = await auth\(\);\s*\n\s*if \(!session\) \{\s*\n\s*return new Response\([^)]+\);?\s*\n\s*\}/g,
      `const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }`,
    );

    // Fix conditional auth (production only)
    content = content.replace(
      /if \(process\.env\.NODE_ENV === "production"\) \{\s*\n\s*const session = await auth\(\);\s*\n\s*if \(!session\) \{\s*\n\s*return new Response\([^)]+\);?\s*\n\s*\}\s*\n\s*\}/g,
      `if (process.env.NODE_ENV === "production") {
      const session = await requireAdminAuth();
      if (session instanceof NextResponse) {
        return session;
      }
    }`,
    );

    // Fix permission checks
    content = content.replace(
      /hasPermission\(session\.user\.role,/g,
      "hasPermission(session.role,",
    );

    // Only write if changed
    if (content !== originalContent) {
      writeFileSync(filePath, content, "utf-8");
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

// Main execution
console.log("🔧 Fixing agent API authentication...\n");

const files = getAllTsFiles(API_AGENT_DIR);
console.log(`📁 Found ${files.length} TypeScript files\n`);

let fixedCount = 0;

for (const file of files) {
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\n✅ Fixed ${fixedCount} files`);
console.log(`⏭️  Skipped ${files.length - fixedCount} files`);
