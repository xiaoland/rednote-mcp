# Complete Architecture Example

This document shows a complete example of how all the pieces work together.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MCP Client                              │
│                    (Claude Desktop, etc.)                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP/JSON-RPC
                            │ (POST /mcp)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Worker                             │
│                   (MCP Protocol Handler)                        │
│                                                                 │
│  - Receives MCP JSON-RPC requests                              │
│  - Translates to internal format                               │
│  - Calls external scraping service                             │
│  - Returns formatted results                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            │ GET /search?query=...
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Scraping Service                          │
│              (VPS/Docker/Cloud Run)                             │
│                                                                 │
│  - Runs Playwright/Chromium                                    │
│  - Manages login cookies                                       │
│  - Scrapes Xiaohongshu                                         │
│  - Returns structured data                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Browser Automation
                            ▼
                    ┌───────────────┐
                    │  Xiaohongshu  │
                    │   Website     │
                    └───────────────┘
```

## Step-by-Step Example

### Step 1: Deploy the Scraping Service

Deploy to a VPS or use Docker:

```bash
# Using Docker
docker-compose up -d

# Or build and run manually
docker build -t scraping-service .
docker run -d -p 3000:3000 \
  -e API_KEY=your-secure-key \
  --name rednote-scraper \
  scraping-service
```

The service is now running at `http://your-server:3000`

### Step 2: Deploy the Cloudflare Worker

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Login to Cloudflare (first time only)
npx wrangler login

# Create KV namespace
npx wrangler kv:namespace create COOKIES
# Copy the ID and update wrangler.toml

# Set environment variables
npx wrangler secret put XIAOHONGSHU_API_URL
# Enter: http://your-server:3000

npx wrangler secret put SCRAPING_SERVICE_API_KEY
# Enter: your-secure-key

# Deploy
npm run deploy
```

Your worker is now live at: `https://rednote-mcp.your-subdomain.workers.dev`

### Step 3: Use the MCP Server

Send MCP requests to the worker:

#### Example: List Tools

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

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "search_xiaohongshu",
        "description": "Searches for content on Xiaohongshu (Red Note) based on a query",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Search query for Xiaohongshu content"
            },
            "count": {
              "type": "number",
              "description": "Number of results to return",
              "default": 10
            }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

#### Example: Search Xiaohongshu

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
        "query": "coffee shops in Shanghai",
        "count": 3
      }
    }
  }'
```

## Request Flow

Let's trace a complete request:

### 1. Client → Worker

Client sends MCP request:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_xiaohongshu",
    "arguments": {
      "query": "coffee",
      "count": 3
    }
  }
}
```

### 2. Worker → Scraping Service

Worker translates to HTTP request:
```
GET http://your-server:3000/search?query=coffee&count=3
Authorization: Bearer your-secure-key
```

### 3. Scraping Service → Xiaohongshu

- Launches headless browser (Chromium)
- Loads cookies (if previously logged in)
- Navigates to Xiaohongshu search page
- Extracts data from page
- Returns structured JSON

### 4. Scraping Service → Worker

Returns JSON array:
```json
[
  {
    "title": "Best Coffee in Shanghai",
    "content": "Amazing coffee shop...",
    "author": "CoffeeExpert",
    "link": "https://www.xiaohongshu.com/...",
    "likes": 1250,
    "collects": 340,
    "comments": 89,
    "images": ["https://..."],
    "tags": ["coffee", "shanghai"]
  },
  // ... more results
]
```

### 5. Worker → Client

Worker formats as MCP response:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "# Xiaohongshu Search Results for \"coffee\"\n\nFound 3 related notes."
      },
      {
        "type": "text",
        "text": "## 1. Best Coffee in Shanghai\n\n**Author:** CoffeeExpert\n\n..."
      },
      {
        "type": "resource",
        "resource": {
          "uri": "https://...",
          "text": "Image 1 for note: \"Best Coffee in Shanghai\""
        }
      }
      // ... more content blocks
    ]
  }
}
```

## Production Deployment Checklist

### Scraping Service

- [ ] Deploy to reliable hosting (VPS, Cloud Run, etc.)
- [ ] Set up SSL/TLS (HTTPS)
- [ ] Configure API key authentication
- [ ] Set up monitoring and logging
- [ ] Configure auto-restart on failure
- [ ] Set up regular cookie refresh
- [ ] Configure rate limiting
- [ ] Set up health checks
- [ ] Configure backups (cookies directory)

### Cloudflare Worker

- [ ] Create and configure KV namespace
- [ ] Set environment variables (secrets)
- [ ] Configure custom domain (optional)
- [ ] Set up analytics/monitoring
- [ ] Configure rate limiting (optional)
- [ ] Test all endpoints
- [ ] Set up alerts for errors

### Security

- [ ] Use strong API keys (32+ characters)
- [ ] Enable HTTPS everywhere
- [ ] Rotate API keys regularly
- [ ] Monitor for unusual activity
- [ ] Implement request logging
- [ ] Set up CORS properly
- [ ] Use secrets management (not environment vars in code)

## Cost Breakdown

### Monthly Costs (Estimated)

**Scraping Service:**
- VPS (DigitalOcean/Linode): $6-12/month
- Or Cloud Run (Google): $0-5/month (free tier)
- Or AWS Fargate: $15-30/month

**Cloudflare Worker:**
- Free tier: 100,000 requests/day (likely sufficient)
- Paid: $5/month for 10M requests

**Total:** $6-42/month depending on setup

### Free Tier Options

You can run this entirely free (or nearly free) using:
- Google Cloud Run (free tier)
- Cloudflare Workers (free tier)
- Oracle Cloud (always free VPS)

## Monitoring

### Health Checks

Set up monitoring for:
- Worker endpoint: `https://rednote-mcp.your-subdomain.workers.dev/health`
- Scraping service: `http://your-server:3000/health`

Use services like:
- UptimeRobot (free)
- Pingdom
- StatusCake
- Cloudflare Analytics

### Logging

- Cloudflare Workers: Built-in logging via dashboard
- Scraping service: PM2 logs, Docker logs, or cloud provider logs

### Alerts

Set up alerts for:
- Service downtime
- High error rates
- Slow response times
- Resource exhaustion

## Troubleshooting Production Issues

### Worker Returns "Browser-based scraping is not available"

- Check if XIAOHONGSHU_API_URL is set
- Verify scraping service is running
- Test scraping service directly
- Check firewall/security group rules

### Scraping Service Returns 401 Unauthorized

- Verify API key matches in both services
- Check if API key is set correctly in worker secrets

### Slow Response Times

- Check scraping service resources (CPU/RAM)
- Increase concurrent request limits carefully
- Consider adding caching
- Use CDN for static assets

### Login Required Errors

- Cookies expired or invalid
- Delete cookies directory and re-login
- Set up automated cookie refresh

## Next Steps

1. Review [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md)
2. Review [SCRAPING_SERVICE_DEPLOYMENT.md](SCRAPING_SERVICE_DEPLOYMENT.md)
3. Choose your deployment strategy
4. Deploy and test
5. Monitor and optimize
