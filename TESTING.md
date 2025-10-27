# Testing the Cloudflare Worker

This directory contains test scripts and examples for the Cloudflare Worker deployment.

## Quick Test

### 1. Start the Worker Locally

```bash
npm run dev:worker
```

This will start the worker on `http://localhost:8787`

### 2. Run the Test Script

In a separate terminal:

```bash
node test-worker.js
```

This will test:
- ✅ Health check endpoint
- ✅ MCP initialization
- ✅ Tool listing
- ⚠️ Search functionality (will fail without external scraping service)

## Manual Testing with cURL

### Health Check

```bash
curl http://localhost:8787/health
```

Expected output: `OK`

### Initialize MCP Connection

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

### List Available Tools

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### Call Search Tool

**Note:** This will fail unless you have the external scraping service running.

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
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

## Testing with External Scraping Service

### 1. Start the Scraping Service

In a separate terminal:

```bash
npm run build
npm run start:scraping-service
```

Or using Docker:

```bash
docker-compose up
```

The service will start on `http://localhost:3000`

### 2. Configure the Worker

Set the environment variable in your terminal before starting the worker:

```bash
export XIAOHONGSHU_API_URL=http://localhost:3000
npm run dev:worker
```

Or create a `.dev.vars` file in the project root:

```
XIAOHONGSHU_API_URL=http://localhost:3000
SCRAPING_SERVICE_API_KEY=dev-secret-key
```

### 3. Test the Complete Flow

Now the search tool should work:

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_xiaohongshu",
      "arguments": {
        "query": "food",
        "count": 2
      }
    }
  }'
```

## Environment Variables for Local Testing

Create a `.dev.vars` file:

```env
XIAOHONGSHU_API_URL=http://localhost:3000
SCRAPING_SERVICE_API_KEY=dev-secret-key
```

Wrangler will automatically load these variables during local development.

## Next Steps

1. ✅ Test locally as shown above
2. 📦 Deploy scraping service (see SCRAPING_SERVICE_DEPLOYMENT.md)
3. 🚀 Deploy to Cloudflare (see CLOUDFLARE_DEPLOYMENT.md)
4. 🔧 Configure production environment variables
5. ✨ Use with your MCP client

## Troubleshooting

### "Connection refused" errors

Make sure both the worker and scraping service are running.

### "Browser-based scraping is not available"

The worker can't find the external scraping service. Check:
- Is the scraping service running?
- Is XIAOHONGSHU_API_URL set correctly?
- Can the worker reach the service URL?

### CORS errors (if testing from browser)

The worker allows all origins by default. If you need to restrict, modify `worker.ts`.

### Invalid JSON errors

Make sure your request body is valid JSON and includes the required MCP protocol fields.
