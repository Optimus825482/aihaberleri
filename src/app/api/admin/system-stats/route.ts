/**
 * System Stats API
 * Returns server RAM, Disk, and CPU usage for admin dashboard
 * 🚀 OPTIMIZED: Added 15-second in-memory cache to prevent blocking execSync calls
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import os from "os";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-this",
);

// 🚀 PERFORMANCE: In-memory cache for system stats (15 seconds TTL)
let cachedStats: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds

// CPU usage tracking - we need two snapshots to calculate usage
let previousCpuInfo: { idle: number; total: number } | null = null;
let lastCpuPercent = 0;

function getCpuUsage(): number {
  try {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      totalIdle += cpu.times.idle;
      totalTick += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
    }

    if (previousCpuInfo) {
      const idleDiff = totalIdle - previousCpuInfo.idle;
      const totalDiff = totalTick - previousCpuInfo.total;
      if (totalDiff > 0) {
        lastCpuPercent = Math.round(100 - (idleDiff / totalDiff) * 100);
      }
    }

    previousCpuInfo = { idle: totalIdle, total: totalTick };
    return Math.max(0, Math.min(100, lastCpuPercent));
  } catch {
    // Fallback: use load average on Linux/Mac
    try {
      const loadAvg = os.loadavg()[0]; // 1-minute average
      const cpuCount = os.cpus().length;
      return Math.round(Math.min((loadAvg / cpuCount) * 100, 100));
    } catch {
      return 0;
    }
  }
}

interface DiskInfo {
  total: number;
  used: number;
  free: number;
  percent: number;
}

function getDiskUsage(): DiskInfo {
  try {
    // Check if running on Windows or Linux
    const platform = os.platform();

    if (platform === "win32") {
      // Windows: Use wmic command
      const output = execSync(
        "wmic logicaldisk where drivetype=3 get size,freespace /format:csv",
        {
          encoding: "utf8",
          timeout: 5000,
        },
      );

      const lines = output
        .trim()
        .split("\n")
        .filter((line) => line.includes(","));
      let totalSize = 0;
      let totalFree = 0;

      for (const line of lines) {
        const parts = line.split(",");
        if (parts.length >= 3) {
          const free = parseInt(parts[1]) || 0;
          const size = parseInt(parts[2]) || 0;
          totalFree += free;
          totalSize += size;
        }
      }

      const used = totalSize - totalFree;
      return {
        total: totalSize,
        used: used,
        free: totalFree,
        percent: totalSize > 0 ? Math.round((used / totalSize) * 100) : 0,
      };
    } else {
      // Linux/Unix: Use df command
      const output = execSync("df -B1 / | tail -1", {
        encoding: "utf8",
        timeout: 5000,
      });

      const parts = output.trim().split(/\s+/);
      const total = parseInt(parts[1]) || 0;
      const used = parseInt(parts[2]) || 0;
      const free = parseInt(parts[3]) || 0;

      return {
        total,
        used,
        free,
        percent: total > 0 ? Math.round((used / total) * 100) : 0,
      };
    }
  } catch (error) {
    console.error("Failed to get disk usage:", error);
    return { total: 0, used: 0, free: 0, percent: 0 };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get("admin-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: "Geçersiz oturum" }, { status: 401 });
    }

    // 🚀 PERFORMANCE: Return cached data if still valid
    const now = Date.now();
    if (cachedStats && now - cachedStats.timestamp < CACHE_TTL_MS) {
      const response = NextResponse.json(cachedStats.data);
      response.headers.set("X-Cache", "HIT");
      return response;
    }

    // RAM Info (from os module - no external calls)
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercent = Math.round((usedMemory / totalMemory) * 100);

    // Disk Info
    const diskInfo = getDiskUsage();

    // CPU Info
    const cpuPercent = getCpuUsage();
    const cpuCores = os.cpus().length;
    const cpuModel = os.cpus()[0]?.model || "Unknown";
    const loadAvg = os.loadavg();

    // Format bytes to human readable
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const response = {
      success: true,
      data: {
        memory: {
          total: totalMemory,
          used: usedMemory,
          free: freeMemory,
          percent: memoryPercent,
          totalFormatted: formatBytes(totalMemory),
          usedFormatted: formatBytes(usedMemory),
          freeFormatted: formatBytes(freeMemory),
        },
        disk: {
          total: diskInfo.total,
          used: diskInfo.used,
          free: diskInfo.free,
          percent: diskInfo.percent,
          totalFormatted: formatBytes(diskInfo.total),
          usedFormatted: formatBytes(diskInfo.used),
          freeFormatted: formatBytes(diskInfo.free),
        },
        cpu: {
          percent: cpuPercent,
          cores: cpuCores,
          model: cpuModel,
          loadAvg: {
            "1m": loadAvg[0]?.toFixed(2) || "0",
            "5m": loadAvg[1]?.toFixed(2) || "0",
            "15m": loadAvg[2]?.toFixed(2) || "0",
          },
        },
        uptime: os.uptime(),
        platform: os.platform(),
        hostname: os.hostname(),
        cpuCores: cpuCores,
      },
    };

    // 🚀 PERFORMANCE: Cache the response
    cachedStats = { data: response, timestamp: Date.now() };

    const jsonResponse = NextResponse.json(response);
    jsonResponse.headers.set("X-Cache", "MISS");
    return jsonResponse;
  } catch (error) {
    console.error("System stats error:", error);
    return NextResponse.json(
      { error: "Sistem bilgisi alınamadı" },
      { status: 500 },
    );
  }
}
