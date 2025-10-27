# Deploying RedNote MCP to Cloudflare Workers

This guide explains how to deploy the RedNote MCP server to Cloudflare Workers.

## Overview

The Cloudflare Workers deployment provides an HTTP interface to the MCP server, making it accessible from anywhere. However, due to Cloudflare Workers' limitations, browser-based scraping with Playwright is not supported directly.

## Prerequisites

1. A Cloudflare account (free tier works)
2. Node.js 18+ installed
3. npm or pnpm package manager

## Deployment Options

### Option 1: Using External Scraping Service (Recommended)

Since Cloudflare Workers don't support browser automation, you'll need to set up an external scraping service:

1. **Deploy a separate scraping service** (e.g., on a VPS, AWS Lambda, or similar) that runs the Playwright-based scraping
2. **Configure the Worker** to call this external service

### Option 2: Hybrid Architecture

Use the Node.js version for scraping and the Worker for the MCP protocol handling.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Wrangler

If this is your first time using Wrangler, authenticate with Cloudflare:

```bash
npx wrangler login
```

### 3. Create KV Namespace (for cookie storage)

```bash
npx wrangler kv:namespace create COOKIES
```

This will output a namespace ID. Update the `wrangler.toml` file with this ID:

```toml
[[kv_namespaces]]
binding = "COOKIES"
id = "your-namespace-id-here"
```

For preview/development:

```bash
npx wrangler kv:namespace create COOKIES --preview
```

Update the `preview_id` in `wrangler.toml` as well.

### 4. Set Up External Scraping Service (Optional)

If you want to use browser-based scraping, you need to deploy a separate service:

**Option A: Deploy to a VPS or traditional server**
- Clone this repository on your server
- Run the Node.js version: `npm start`
- Expose it via HTTP (use nginx or similar)

**Option B: Use a serverless function with browser support**
- Deploy to AWS Lambda with Puppeteer layers
- Use services like Browserless.io or ScrapingBee

Then, set the environment variable in `wrangler.toml`:

```toml
[vars]
XIAOHONGSHU_API_URL = "https://your-scraping-service.example.com"
```

Or use Wrangler secrets for sensitive values:

```bash
npx wrangler secret put XIAOHONGSHU_API_URL
```

### 5. Build the Project

```bash
npm run build
```

### 6. Test Locally

```bash
npm run dev:worker
```

This will start a local development server. You can test it with:

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

### 7. Deploy to Cloudflare Workers

```bash
npm run deploy
```

After successful deployment, you'll get a URL like: `https://rednote-mcp.your-subdomain.workers.dev`

## Using the Deployed Worker

### HTTP/MCP Interface

The Worker exposes an HTTP endpoint that speaks the MCP protocol. You can interact with it using JSON-RPC:

#### List Available Tools

```bash
curl -X POST https://rednote-mcp.your-subdomain.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

#### Search Xiaohongshu

```bash
curl -X POST https://rednote-mcp.your-subdomain.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_xiaohongshu",
      "arguments": {
        "query": "food recommendation",
        "count": 5
      }
    }
  }'
```

#### Health Check

```bash
curl https://rednote-mcp.your-subdomain.workers.dev/health
```

## Configuration

### Environment Variables

You can set environment variables in `wrangler.toml`:

```toml
[vars]
XIAOHONGSHU_API_URL = "https://your-api.example.com"
```

Or use secrets for sensitive values:

```bash
npx wrangler secret put XIAOHONGSHU_API_URL
```

### KV Namespaces

The Worker uses Cloudflare KV for storing cookies (when using external scraping service):

```toml
[[kv_namespaces]]
binding = "COOKIES"
id = "your-namespace-id"
preview_id = "your-preview-namespace-id"
```

## MCP Client Configuration

To use the deployed Worker with an MCP client like Claude Desktop, you'll need a client that supports HTTP transport. Update your MCP client configuration:

```json
{
  "mcpServers": {
    "rednote-mcp": {
      "url": "https://rednote-mcp.your-subdomain.workers.dev/mcp",
      "transport": "http"
    }
  }
}
```

**Note:** As of now, many MCP clients primarily support stdio transport. You may need to use a proxy or adapter to bridge HTTP to stdio.

## Limitations

### Cloudflare Workers Limitations

1. **No Browser Automation**: Playwright/Puppeteer don't work in Workers
2. **Execution Time**: Maximum 30 seconds (free tier) or 15 minutes (paid)
3. **Memory**: Limited to 128MB (free tier) or 128MB+ (paid)
4. **No File System**: Cannot use `fs` module directly

### Solutions

- Use external scraping services for browser automation
- Store state in KV or Durable Objects instead of file system
- Optimize for quick responses or use async patterns

## Troubleshooting

### Error: "Browser-based scraping is not available"

This means the Worker doesn't have access to an external scraping service. You need to:

1. Set up an external scraping service
2. Configure `XIAOHONGSHU_API_URL` environment variable

### Error: "KV namespace not found"

Make sure you've created the KV namespace and updated `wrangler.toml` with the correct ID.

### Deployment fails

Check that:
- You're logged into Wrangler: `npx wrangler whoami`
- Your `wrangler.toml` is properly configured
- You've built the project: `npm run build`

## Alternative: Node.js Deployment

If you need full browser automation support, consider deploying the Node.js version to:

- AWS Lambda (with Puppeteer layers)
- Google Cloud Functions
- DigitalOcean App Platform
- Traditional VPS (cheaper and simpler)

The Node.js version in this repository supports full Playwright functionality.

## Cost Estimates

### Cloudflare Workers
- **Free Tier**: 100,000 requests/day
- **Paid**: $5/month for 10M requests

### External Scraping Service
- VPS: $5-20/month (DigitalOcean, Linode, etc.)
- Browserless.io: Starting at $50/month
- AWS Lambda: Pay per use (usually < $10/month for moderate use)

## Support

For issues specific to Cloudflare Workers deployment, please open an issue on GitHub.

For general MCP questions, refer to the main README.md.
