import * as fs from 'fs/promises';
import * as path from 'path';
import { RedBookNote } from './xiaohongshu.js';

interface CacheEntry {
  data: RedBookNote[];
  timestamp: number;
  query: string;
  count: number;
}

interface CacheStorage {
  [key: string]: CacheEntry;
}

const CACHE_PATH = path.join(process.cwd(), 'cache', 'search-cache.json');
const CACHE_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds

class SearchCache {
  private cache: CacheStorage = {};
  private initialized = false;

  /**
   * Initialize cache by loading from file if it exists
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const cacheDir = path.dirname(CACHE_PATH);
      await fs.mkdir(cacheDir, { recursive: true });

      try {
        const data = await fs.readFile(CACHE_PATH, 'utf-8');
        this.cache = JSON.parse(data);
        console.error('Cache loaded from disk');
      } catch (readError) {
        // File doesn't exist or is invalid, start with empty cache
        this.cache = {};
        console.error('Starting with empty cache');
      }

      // Clean expired entries on startup
      await this.cleanExpiredEntries();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize cache:', error);
      this.cache = {};
      this.initialized = true;
    }
  }

  /**
   * Generate cache key from query and count
   */
  private generateKey(query: string, count: number): string {
    return `${query.toLowerCase().trim()}:${count}`;
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > CACHE_EXPIRY_MS;
  }

  /**
   * Get cached results for a query
   */
  async get(query: string, count: number): Promise<RedBookNote[] | null> {
    await this.init();

    const key = this.generateKey(query, count);
    const entry = this.cache[key];

    if (!entry) {
      console.error(`Cache miss for key: ${key}`);
      return null;
    }

    if (this.isExpired(entry)) {
      console.error(`Cache expired for key: ${key}`);
      delete this.cache[key];
      await this.save();
      return null;
    }

    console.error(`Cache hit for key: ${key}`);
    return entry.data;
  }

  /**
   * Store results in cache
   */
  async set(query: string, count: number, data: RedBookNote[]): Promise<void> {
    await this.init();

    const key = this.generateKey(query, count);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      query,
      count
    };

    this.cache[key] = entry;
    console.error(`Cached results for key: ${key} (${data.length} items)`);
    
    await this.save();
  }

  /**
   * Clean all expired entries from cache
   */
  async cleanExpiredEntries(): Promise<void> {
    const keys = Object.keys(this.cache);
    let cleanedCount = 0;

    for (const key of keys) {
      if (this.isExpired(this.cache[key])) {
        delete this.cache[key];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.error(`Cleaned ${cleanedCount} expired cache entries`);
      await this.save();
    }
  }

  /**
   * Save cache to disk
   */
  private async save(): Promise<void> {
    try {
      await fs.writeFile(CACHE_PATH, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Failed to save cache to disk:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ totalEntries: number; oldestEntry: string | null; newestEntry: string | null }> {
    await this.init();

    const entries = Object.values(this.cache);
    if (entries.length === 0) {
      return { totalEntries: 0, oldestEntry: null, newestEntry: null };
    }

    const sortedByTime = entries.sort((a, b) => a.timestamp - b.timestamp);
    const oldest = sortedByTime[0];
    const newest = sortedByTime[sortedByTime.length - 1];

    return {
      totalEntries: entries.length,
      oldestEntry: `${oldest.query}:${oldest.count} (${new Date(oldest.timestamp).toISOString()})`,
      newestEntry: `${newest.query}:${newest.count} (${new Date(newest.timestamp).toISOString()})`
    };
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache = {};
    await this.save();
    console.error('Cache cleared');
  }
}

export const searchCache = new SearchCache();