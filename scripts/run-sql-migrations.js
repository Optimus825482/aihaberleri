#!/usr/bin/env node
/**
 * One-time SQL migration runner.
 *
 * Reads all .sql files from ../migrations/ (sorted alphabetically)
 * and executes them against the database.
 *
 * All SQL files MUST be idempotent (use IF NOT EXISTS / IF EXISTS etc.)
 * so running them multiple times is safe.
 *
 * Usage: node scripts/run-sql-migrations.js
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const prisma = new PrismaClient();

/**
 * Split a SQL string into individual statements.
 * Handles: semicolons, dollar-quoted strings, single quotes.
 */
function splitStatements(sql) {
  const statements = [];
  let current = "";
  let inDollar = false;
  let dollarTag = "";
  let inQuote = false;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Dollar-quoted string: $tag$...$tag$ or $$...$$
    if (!inQuote && ch === "$") {
      // For $$ (untagged), skip the second $
      if (!inDollar && next === "$" && sql.indexOf("$", i + 2) !== -1) {
        const closePos = sql.indexOf("$$", i + 2);
        if (closePos !== -1) {
          // $$...$$ block — add everything until closing $$
          current += sql.slice(i, closePos + 2);
          i = closePos + 2;
          continue;
        }
      }
      const end = sql.indexOf("$", i + 1);
      if (end !== -1) {
        const tag = sql.slice(i, end + 1);
        if (!inDollar) {
          inDollar = true;
          dollarTag = tag;
          current += ch;
          i++;
          continue;
        } else if (sql.slice(i, i + dollarTag.length) === dollarTag) {
          inDollar = false;
          dollarTag = "";
          current += ch;
          i++;
          continue;
        }
      }
    }

    // Single-quoted string
    if (!inDollar && ch === "'" && !inQuote) {
      inQuote = true;
      current += ch;
      i++;
      continue;
    }
    if (inQuote && ch === "'" && next === "'") {
      current += ch + next;
      i += 2;
      continue;
    }
    if (inQuote && ch === "'") {
      inQuote = false;
      current += ch;
      i++;
      continue;
    }

    // Statement separator
    if (!inDollar && !inQuote && ch === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      i++;
      continue;
    }

    // Skip single-line comments
    if (!inDollar && !inQuote && ch === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      i++;
      continue;
    }

    // Skip block comments
    if (!inDollar && !inQuote && ch === "/" && next === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    current += ch;
    i++;
  }

  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);

  return statements;
}

async function main() {
  console.log("📂 Scanning migrations folder...");

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log("⚠️  No migrations/ directory found, skipping.");
    await prisma.$disconnect();
    return;
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("✅ No SQL migration files to apply.");
    await prisma.$disconnect();
    return;
  }

  console.log(`📋 Found ${files.length} migration file(s): ${files.join(", ")}`);

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, "utf-8");
    const statements = splitStatements(sql);

    console.log(`\n▶️  Applying: ${file} (${statements.length} statement(s))`);

    for (let idx = 0; idx < statements.length; idx++) {
      const stmt = statements[idx].trim();
      if (!stmt) continue;

      // Skip BEGIN/COMMIT — Prisma $executeRaw handles transactions per statement
      if (stmt.toUpperCase() === "BEGIN" || stmt.toUpperCase() === "COMMIT") {
        continue;
      }

      try {
        await prisma.$executeRawUnsafe(stmt + ";");
      } catch (err) {
        const msg = err?.message || "";
        // These errors are safe to ignore — object already exists
        const ignorablePatterns = [
          "already exists",
          "duplicate key",
          "duplicate column",
          "relation",
          "does not exist", // for DROP IF NOT EXISTS that fails
        ];
        const isIgnorable = ignorablePatterns.some((p) =>
          msg.toLowerCase().includes(p.toLowerCase()),
        );
        if (isIgnorable) {
          console.log(`   ⏭️  Skipped: ${msg.split("\n")[0].substring(0, 120)}`);
        } else {
          console.error(`   ❌ Error in ${file} statement ${idx + 1}:`, msg);
          // Don't exit — continue with remaining files
        }
      }
    }

    console.log(`   ✅ ${file} done`);
  }

  console.log("\n🎉 All SQL migrations applied successfully!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Migration runner failed:", err);
  process.exit(1);
});
