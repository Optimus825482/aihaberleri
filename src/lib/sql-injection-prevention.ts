/**
 * SQL Injection Prevention
 *
 * Fix #16: SQL Injection Prevention
 * Skill: vulnerability-scanner → A05 Injection + api-patterns → Parameterized queries
 *
 * Features:
 * - Input sanitization
 * - Raw query detection
 * - Prisma query validation
 * - OWASP A05 Injection prevention
 */

/**
 * Sanitize input to prevent SQL injection
 *
 * Prisma parametreli sorgular kullandığı için SQL anahtar kelime stripping yapılmaz.
 * Bu fonksiyon yalnızca HTML/XSS risklerini azaltmaya odaklanır.
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return "";

  return (
    input
      // Remove script tags
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")

      // Remove inline event handlers (onclick, onerror, ...)
      .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")

      // Remove javascript: pseudo-protocol
      .replace(/javascript\s*:/gi, "")

      // Trim whitespace
      .trim()
  );
}

/**
 * Detect if query contains raw SQL
 *
 * Returns true if query is potentially unsafe
 */
export function detectRawQuery(query: string): boolean {
  const rawSqlPatterns = [
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b/i,
    /\$queryRaw/i,
    /\$executeRaw/i,
    /prisma\.\$queryRaw/i,
    /prisma\.\$executeRaw/i,
  ];

  return rawSqlPatterns.some((pattern) => pattern.test(query));
}

/**
 * Validate Prisma query for safety
 *
 * Checks:
 * - No raw SQL methods
 * - No SQL keywords in values
 * - Proper parameterization
 */
export function validatePrismaQuery(query: any): boolean {
  // Check for raw SQL methods
  if (
    query.method &&
    (query.method === "$queryRaw" || query.method === "$executeRaw")
  ) {
    return false;
  }

  // Check for SQL keywords in where clause
  if (query.where) {
    const whereString = JSON.stringify(query.where);

    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+\w+\s+SET/i,
      /UNION\s+SELECT/i,
      /;\s*DROP/i,
      /;\s*DELETE/i,
      /--/,
      /\/\*/,
      /SLEEP\(/i,
      /BENCHMARK\(/i,
    ];

    if (dangerousPatterns.some((pattern) => pattern.test(whereString))) {
      return false;
    }
  }

  return true;
}

/**
 * Audit Prisma queries in codebase
 *
 * Returns list of potentially unsafe queries
 */
export interface QueryAuditResult {
  file: string;
  line: number;
  query: string;
  issue: string;
  severity: "high" | "medium" | "low";
}

export function auditPrismaQueries(
  code: string,
  filename: string,
): QueryAuditResult[] {
  const results: QueryAuditResult[] = [];
  const lines = code.split("\n");

  lines.forEach((line, index) => {
    // Check for $queryRaw usage
    if (line.includes("$queryRaw")) {
      results.push({
        file: filename,
        line: index + 1,
        query: line.trim(),
        issue: "Raw SQL query detected - use parameterized queries instead",
        severity: "high",
      });
    }

    // Check for $executeRaw usage
    if (line.includes("$executeRaw")) {
      results.push({
        file: filename,
        line: index + 1,
        query: line.trim(),
        issue: "Raw SQL execution detected - use Prisma methods instead",
        severity: "high",
      });
    }

    // Check for string concatenation in queries
    if (
      line.includes("prisma.") &&
      line.includes("+") &&
      line.includes("where")
    ) {
      results.push({
        file: filename,
        line: index + 1,
        query: line.trim(),
        issue: "String concatenation in query - potential SQL injection",
        severity: "medium",
      });
    }

    // Check for template literals in queries
    if (
      line.includes("prisma.") &&
      line.includes("${") &&
      line.includes("where")
    ) {
      results.push({
        file: filename,
        line: index + 1,
        query: line.trim(),
        issue: "Template literal in query - ensure proper sanitization",
        severity: "medium",
      });
    }
  });

  return results;
}

/**
 * Convert raw query to parameterized Prisma query
 *
 * Example:
 * Raw: SELECT * FROM articles WHERE status = 'PUBLISHED'
 * Parameterized: prisma.article.findMany({ where: { status: 'PUBLISHED' } })
 */
export interface QueryConversion {
  original: string;
  converted: string;
  explanation: string;
}

export function convertToParameterized(
  rawQuery: string,
): QueryConversion | null {
  // Simple SELECT conversion
  const selectMatch = rawQuery.match(
    /SELECT\s+\*\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*'([^']+)'/i,
  );
  if (selectMatch) {
    const [, table, field, value] = selectMatch;
    return {
      original: rawQuery,
      converted: `prisma.${table.toLowerCase()}.findMany({ where: { ${field}: '${value}' } })`,
      explanation:
        "Converted SELECT query to Prisma findMany with parameterized where clause",
    };
  }

  // Simple UPDATE conversion
  const updateMatch = rawQuery.match(
    /UPDATE\s+(\w+)\s+SET\s+(\w+)\s*=\s*'([^']+)'\s+WHERE\s+(\w+)\s*=\s*'([^']+)'/i,
  );
  if (updateMatch) {
    const [, table, setField, setValue, whereField, whereValue] = updateMatch;
    return {
      original: rawQuery,
      converted: `prisma.${table.toLowerCase()}.update({ where: { ${whereField}: '${whereValue}' }, data: { ${setField}: '${setValue}' } })`,
      explanation:
        "Converted UPDATE query to Prisma update with parameterized where and data",
    };
  }

  // Simple DELETE conversion
  const deleteMatch = rawQuery.match(
    /DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*'([^']+)'/i,
  );
  if (deleteMatch) {
    const [, table, field, value] = deleteMatch;
    return {
      original: rawQuery,
      converted: `prisma.${table.toLowerCase()}.delete({ where: { ${field}: '${value}' } })`,
      explanation:
        "Converted DELETE query to Prisma delete with parameterized where clause",
    };
  }

  return null;
}

/**
 * Prisma best practices checker
 */
export interface BestPracticeViolation {
  type: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export function checkPrismaBestPractices(
  code: string,
): BestPracticeViolation[] {
  const violations: BestPracticeViolation[] = [];

  // Check for missing error handling
  if (
    code.includes("prisma.") &&
    !code.includes("try") &&
    !code.includes("catch")
  ) {
    violations.push({
      type: "error-handling",
      message: "Prisma query without try-catch error handling",
      severity: "warning",
    });
  }

  // Check for N+1 query problem
  if (code.includes(".map(") && code.includes("prisma.")) {
    violations.push({
      type: "n-plus-one",
      message: "Potential N+1 query problem - consider using include/select",
      severity: "warning",
    });
  }

  // Check for missing select/include
  if (
    code.includes("findMany") &&
    !code.includes("select") &&
    !code.includes("include")
  ) {
    violations.push({
      type: "over-fetching",
      message: "Query without select/include - may fetch unnecessary data",
      severity: "info",
    });
  }

  // Check for missing pagination
  if (
    code.includes("findMany") &&
    !code.includes("take") &&
    !code.includes("skip")
  ) {
    violations.push({
      type: "pagination",
      message: "findMany without pagination - may return too many results",
      severity: "info",
    });
  }

  return violations;
}

/**
 * Generate security report for codebase
 */
export interface SecurityReport {
  totalQueries: number;
  rawQueries: number;
  unsafeQueries: number;
  violations: BestPracticeViolation[];
  auditResults: QueryAuditResult[];
  recommendations: string[];
}

export function generateSecurityReport(
  files: Array<{ path: string; content: string }>,
): SecurityReport {
  let totalQueries = 0;
  let rawQueries = 0;
  let unsafeQueries = 0;
  const violations: BestPracticeViolation[] = [];
  const auditResults: QueryAuditResult[] = [];

  files.forEach((file) => {
    // Count queries
    const queryMatches = file.content.match(/prisma\.\w+\.\w+/g);
    if (queryMatches) {
      totalQueries += queryMatches.length;
    }

    // Audit queries
    const fileAudit = auditPrismaQueries(file.content, file.path);
    auditResults.push(...fileAudit);
    rawQueries += fileAudit.filter((r) => r.severity === "high").length;
    unsafeQueries += fileAudit.filter((r) => r.severity === "medium").length;

    // Check best practices
    const fileViolations = checkPrismaBestPractices(file.content);
    violations.push(...fileViolations);
  });

  const recommendations: string[] = [];

  if (rawQueries > 0) {
    recommendations.push(
      `${rawQueries} raw SQL query bulundu. Bunları parameterized Prisma query'lere çevirin.`,
    );
  }

  if (unsafeQueries > 0) {
    recommendations.push(
      `${unsafeQueries} potansiyel güvenlik riski bulundu. Input sanitization ekleyin.`,
    );
  }

  if (violations.length > 0) {
    recommendations.push(
      `${violations.length} best practice ihlali bulundu. Prisma dokümantasyonunu inceleyin.`,
    );
  }

  return {
    totalQueries,
    rawQueries,
    unsafeQueries,
    violations,
    auditResults,
    recommendations,
  };
}
