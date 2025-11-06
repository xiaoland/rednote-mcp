#!/usr/bin/env node

import express from 'express';
import { searchXiaohongshu, setLoginCookies } from "./xiaohongshu.js";
import { searchCache } from "./cache.js";
import { z } from "zod";
import path from 'path';
import * as fs from 'fs/promises';


// Create Express app
const app = express();
const port = 8000;

// Middleware to parse JSON bodies
app.use(express.json());

// Define the schema for the search query parameters
const searchSchema = z.object({
  query: z.string().min(1, { message: "Query parameter cannot be empty" }),
  count: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().positive().optional().default(10)
  ).describe("Number of results to return")
});

app.get('/search', async (req, res) => {
  try {
    // Validate the query parameters
    const validationResult = searchSchema.safeParse(req.query);

    if (!validationResult.success) {
      return res.status(400).json({ error: "Invalid query parameters", details: validationResult.error.flatten() });
    }

    const { query, count } = validationResult.data;

    console.error(`Searching Xiaohongshu: ${query}, Count: ${count}`);

    // Check cache first
    const cachedResults = await searchCache.get(query, count);
    if (cachedResults) {
      console.error(`Returning cached results for: ${query}`);
      return res.status(200).json(cachedResults);
    }

    // Cache miss - perform actual search
    console.error(`Cache miss - performing search for: ${query}`);
    const results = await searchXiaohongshu(query, count);
    
    // Store results in cache
    await searchCache.set(query, count, results);
    
    res.status(200).json(results);

  } catch (error) {
    console.error("Xiaohongshu search error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to search Xiaohongshu", details: errorMessage });
  }
});

app.get('/mocking/search', async (req, res) => {
  try {
    const MOCK_PATH = path.join(process.cwd(), 'mock', 'example_search_result.json');
    const data = JSON.parse(await fs.readFile(MOCK_PATH, 'utf-8'));
    return res.status(200).json(data);
  } catch (error) {
    console.error("Failed to read mock search result:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to load mock search result", details: errorMessage });
  }
});

app.put('/login', async (req, res) => {
  try {
    const cookies = req.body;
    if (!Array.isArray(cookies)) {
      return res.status(400).json({ error: "Invalid request body. Expected an array of cookies." });
    }

    await setLoginCookies(cookies);
    res.status(204).send();

  } catch (error) {
    console.error("Failed to set login cookies:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to set login cookies", details: errorMessage });
  }
});

// Cache management endpoints
app.get('/cache/stats', async (req, res) => {
  try {
    const stats = await searchCache.getStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to get cache stats", details: errorMessage });
  }
});

app.delete('/cache', async (req, res) => {
  try {
    await searchCache.clear();
    res.status(204).send();
  } catch (error) {
    console.error("Failed to clear cache:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to clear cache", details: errorMessage });
  }
});


// Start server
async function main() {
  try {
    app.listen(port, () => {
      console.error(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
