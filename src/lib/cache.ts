/**
 * Advanced Multi-Level Cache Manager
 * L1: In-memory cache (30s TTL, 1000 entry limit)
 * L2: Redis cache (configurable TTL)
 *
 * Features:
 * - Type-safe generic implementation
 * - Tag-based invalidation
 * - Pattern-based invalidation
 * - Automatic fallback if Redis unavailable
 * - LRU eviction for memory cache
 * - Cache hit/miss metrics
 */

import { getRedis } from "./redis";
import type { Redis } from "ioredis";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  tags: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  l1Hits: number;
  l2Hits: number;
  evictions: number;
  errors: number;
}

interface CacheOptions {
  ttl?: number; // TTL in seconds (default: 300 = 5 min)
  tags?: string[]; // Tags for invalidation
  skipL1?: boolean; // Skip memory cache
  skipL2?: boolean; // Skip Redis cache
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>>;
  private readonly L1_TTL = 30; // 30 seconds for L1
  private readonly MAX_MEMORY_ENTRIES = 1000;
  private stats: CacheStats;
  private redis: Redis | null = null;
  private redisAvailable: boolean = true;

  constructor() {
    this.memoryCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      l1Hits: 0,
      l2Hits: 0,
      evictions: 0,
      errors: 0,
    };
    this.initRedis();
  }

  private initRedis() {
    try {
      this.redis = getRedis();
      if (!this.redis) {
        console.warn("⚠️  Redis not available - using memory cache only");
        this.redisAvailable = false;
      }
    } catch (error) {
      console.error("❌ Redis initialization failed:", error);
      this.redisAvailable = false;
    }
  }

  /**
   * Get cached value with type safety
   * Checks L1 (memory) first, then L2 (Redis)
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { skipL1, skipL2 } = options;

    // Check L1 (memory) first
    if (!skipL1) {
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry) {
        const age = Date.now() - memoryEntry.timestamp;
        if (age < this.L1_TTL * 1000) {
          this.stats.hits++;
          this.stats.l1Hits++;
          console.log(`✅ Cache HIT (L1): ${key} (age: ${age}ms)`);
          return memoryEntry.data as T;
        } else {
          // Expired, remove from memory
          this.memoryCache.delete(key);
        }
      }
    }

    // Check L2 (Redis)
    if (!skipL2 && this.redisAvailable && this.redis) {
      try {
        const cached = await this.redis.get(`cache:${key}`);
        if (cached) {
          const data = JSON.parse(cached) as T;

          // Populate L1 cache
          if (!skipL1) {
            this.setMemoryCache(key, data, []);
          }

          this.stats.hits++;
          this.stats.l2Hits++;
          console.log(`✅ Cache HIT (L2): ${key}`);
          return data;
        }
      } catch (error) {
        console.error(`❌ Redis GET error for ${key}:`, error);
        this.stats.errors++;
      }
    }

    this.stats.misses++;
    console.log(`❌ Cache MISS: ${key}`);
    return null;
  }

  /**
   * Set cached value with TTL and tags
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {},
  ): Promise<void> {
    const { ttl = 300, tags = [], skipL1, skipL2 } = options;

    // Set L1 (memory) cache
    if (!skipL1) {
      this.setMemoryCache(key, data, tags);
    }

    // Set L2 (Redis) cache
    if (!skipL2 && this.redisAvailable && this.redis) {
      try {
        const serialized = JSON.stringify(data);
        await this.redis.setex(`cache:${key}`, ttl, serialized);

        // Store tag mappings for invalidation
        if (tags.length > 0) {
          for (const tag of tags) {
            await this.redis.sadd(`cache:tag:${tag}`, key);
            await this.redis.expire(`cache:tag:${tag}`, ttl);
          }
        }

        console.log(
          `💾 Cache SET (L2): ${key} (TTL: ${ttl}s, Tags: [${tags.join(", ")}])`,
        );
      } catch (error) {
        console.error(`❌ Redis SET error for ${key}:`, error);
        this.stats.errors++;
      }
    }
  }

  /**
   * Set memory cache with LRU eviction
   */
  private setMemoryCache<T>(key: string, data: T, tags: string[]): void {
    // LRU eviction: if cache is full, remove oldest entry
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Invalidate all cache entries with a specific tag
   * Useful for invalidating related data (e.g., all "articles" cache)
   */
  async invalidateByTag(tag: string): Promise<void> {
    console.log(`🗑️  Invalidating cache by tag: ${tag}`);

    // Invalidate L1 (memory)
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags.includes(tag)) {
        this.memoryCache.delete(key);
      }
    }

    // Invalidate L2 (Redis)
    if (this.redisAvailable && this.redis) {
      try {
        const keys = await this.redis.smembers(`cache:tag:${tag}`);
        if (keys.length > 0) {
          const pipeline = this.redis.pipeline();
          for (const key of keys) {
            pipeline.del(`cache:${key}`);
          }
          await pipeline.exec();
          await this.redis.del(`cache:tag:${tag}`);
          console.log(
            `🗑️  Invalidated ${keys.length} cache entries for tag: ${tag}`,
          );
        }
      } catch (error) {
        console.error(`❌ Redis invalidateByTag error for ${tag}:`, error);
        this.stats.errors++;
      }
    }
  }

  /**
   * Invalidate cache entries by pattern (e.g., "articles:*")
   * USE WITH CAUTION: Can be slow on large Redis instances
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    console.log(`🗑️  Invalidating cache by pattern: ${pattern}`);

    // Invalidate L1 (memory) - simple prefix match
    for (const key of this.memoryCache.keys()) {
      const simplePattern = pattern.replace(/\*/g, "");
      if (key.startsWith(simplePattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Invalidate L2 (Redis)
    if (this.redisAvailable && this.redis) {
      try {
        const keys = await this.redis.keys(`cache:${pattern}`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          console.log(
            `🗑️  Invalidated ${keys.length} cache entries for pattern: ${pattern}`,
          );
        }
      } catch (error) {
        console.error(
          `❌ Redis invalidateByPattern error for ${pattern}:`,
          error,
        );
        this.stats.errors++;
      }
    }
  }

  /**
   * Clear all cache (both L1 and L2)
   */
  async clearAll(): Promise<void> {
    console.log("🗑️  Clearing all cache");

    // Clear L1
    this.memoryCache.clear();

    // Clear L2 (only cache keys)
    if (this.redisAvailable && this.redis) {
      try {
        const keys = await this.redis.keys("cache:*");
        if (keys.length > 0) {
          await this.redis.del(...keys);
          console.log(`🗑️  Cleared ${keys.length} Redis cache entries`);
        }
      } catch (error) {
        console.error("❌ Redis clearAll error:", error);
        this.stats.errors++;
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRatio: string; l1Size: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRatio =
      total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : "0.00";

    return {
      ...this.stats,
      hitRatio: `${hitRatio}%`,
      l1Size: this.memoryCache.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      l1Hits: 0,
      l2Hits: 0,
      evictions: 0,
      errors: 0,
    };
  }
}

// Singleton instance
let cacheInstance: CacheManager | null = null;

export const getCache = (): CacheManager => {
  if (!cacheInstance) {
    cacheInstance = new CacheManager();
  }
  return cacheInstance;
};

// Export type for options
export type { CacheOptions, CacheStats };
