/**
 * Script to fix all admin API routes to use JWT authentication
 * instead of NextAuth session
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const API_ADMIN_DIR = "src/app/api/admin";

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

function fixAuthImport(content: string): string {
  // Replace auth import with admin-auth import
  if (content.includes('import { auth } from "@/lib/auth"')) {
    content = content.replace(
      'import { auth } from "@/lib/auth";',
      'import { requireAdminAuth } from "@/lib/admin-auth";',
    );
  }

  return content;
}

function fixAuthCheck(content: string): string {
  // Pattern 1: const session = await auth(); if (!session) { return ... }
  const pattern1 =
    /const session = await auth\(\);\s*\n\s*if \(!session\) \{\s*\n\s*return NextResponse\.json\([^}]+\}, \{ status: 401 \}\);?\s*\n\s*\}/g;

  content = content.replace(
    pattern1,
    `const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }`,
  );

  // Pattern 2: const session = await auth(); if (!session?.user) { return ... }
  const pattern2 =
    /const session = await auth\(\);\s*\n\s*if \(!session\?\.user\) \{\s*\n\s*return NextResponse\.json\([^}]+\}, \{ status: 401 \}\);?\s*\n\s*\}/g;

  content = content.replace(
    pattern2,
    `const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }`,
  );

  // Pattern 3: Single line - const session = await auth(); if (!session) return ...
  const pattern3 =
    /const session = await auth\(\);\s*if \(!session\) return NextResponse\.json\([^}]+\}, \{ status: 401 \}\);?/g;

  content = content.replace(
    pattern3,
    `const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;`,
  );

  return content;
}

function fixPermissionCheck(content: string): string {
  // Fix hasPermission calls that use session.user.role
  content = content.replace(
    /hasPermission\(session\.user\.role,/g,
    "hasPermission(session.role,",
  );

  return content;
}

function processFile(filePath: string): boolean {
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

    // Apply fixes
    content = fixAuthImport(content);
    content = fixAuthCheck(content);
    content = fixPermissionCheck(content);

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
console.log("🔧 Fixing admin API authentication...\n");

const files = getAllTsFiles(API_ADMIN_DIR);
console.log(`📁 Found ${files.length} TypeScript files\n`);

let fixedCount = 0;

for (const file of files) {
  if (processFile(file)) {
    fixedCount++;
  }
}

console.log(`\n✅ Fixed ${fixedCount} files`);
console.log(`⏭️  Skipped ${files.length - fixedCount} files`);
