/**
 * Lightweight User-Agent parser
 * No external dependencies - regex based
 */

export interface ParsedUA {
  device: "Desktop" | "Mobile" | "Tablet";
  browser: string;
  os: string;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { device: "Desktop", browser: "Unknown", os: "Unknown" };

  const lower = ua.toLowerCase();

  // Device detection
  let device: ParsedUA["device"] = "Desktop";
  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    device = "Tablet";
  } else if (
    /mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)
  ) {
    device = "Mobile";
  }

  // Browser detection (order matters - more specific first)
  let browser = "Other";
  if (lower.includes("edg/") || lower.includes("edge/")) browser = "Edge";
  else if (lower.includes("opr/") || lower.includes("opera")) browser = "Opera";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome"))
    browser = "Safari";
  else if (lower.includes("chrome/")) browser = "Chrome";

  // OS detection
  let os = "Other";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("mac os") || lower.includes("macintosh"))
    os = "macOS";
  else if (lower.includes("linux") && !lower.includes("android")) os = "Linux";
  else if (lower.includes("android")) os = "Android";
  else if (
    lower.includes("iphone") ||
    lower.includes("ipad") ||
    lower.includes("ipod")
  )
    os = "iOS";

  return { device, browser, os };
}
