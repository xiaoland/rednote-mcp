/**
 * Example External Scraping Service
 * 
 * This is a standalone HTTP service that wraps the Playwright-based scraping
 * functionality. Deploy this to a VPS, AWS Lambda, or any server that supports
 * Node.js and Playwright.
 * 
 * The Cloudflare Worker can then call this service to perform browser-based scraping.
 */

import { searchXiaohongshu } from './xiaohongshu.js';
import http from 'http';
import url from 'url';

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || ''; // Optional: Add API key authentication

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const parsedUrl = url.parse(req.url || '', true);
    
    // Health check endpoint
    if (parsedUrl.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    // Search endpoint
    if (parsedUrl.pathname === '/search' && req.method === 'GET') {
      // Optional: Check API key
      if (API_KEY) {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
      }

      const query = parsedUrl.query.query as string;
      const count = parseInt(parsedUrl.query.count as string || '10', 10);

      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing query parameter' }));
        return;
      }

      console.log(`Received search request: query="${query}", count=${count}`);

      // Perform the search using Playwright
      const results = await searchXiaohongshu(query, count);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
      return;
    }

    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    console.error('Error handling request:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Internal server error'
      // Error details are logged but not exposed to the client for security
    }));
  }
});

server.listen(PORT, () => {
  console.log(`External scraping service listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Search endpoint: http://localhost:${PORT}/search?query=YOUR_QUERY&count=10`);
  if (API_KEY) {
    console.log('API key authentication enabled');
  } else {
    console.log('Warning: No API key set. Set API_KEY environment variable for security.');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
