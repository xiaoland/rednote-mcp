# Quick Start Guide - Cloudflare Workers Deployment

This is a quick reference guide for deploying RedNote MCP to Cloudflare Workers. For detailed information, see the comprehensive guides.

## 🚀 5-Minute Quick Start

### Prerequisites
- Node.js 18+
- Cloudflare account (free tier works)
- A server/VPS for the scraping service (or use Google Cloud Run free tier)

### Step 1: Clone and Build

```bash
git clone https://github.com/xiaoland/rednote-mcp.git
cd rednote-mcp
npm install
npm run build
```

### Step 2: Deploy Scraping Service

**Option A: Using Docker (Easiest)**
```bash
docker-compose up -d
```

**Option B: On a VPS**
```bash
npm run start:scraping-service
```

**Option C: Google Cloud Run (Free Tier)**
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT/rednote-scraping
gcloud run deploy rednote-scraping \
  --image gcr.io/YOUR_PROJECT/rednote-scraping \
  --platform managed \
  --allow-unauthenticated
```

Note the URL of your deployed service (e.g., `https://your-service.com`)

### Step 3: Deploy to Cloudflare

```bash
# Login (first time only)
npx wrangler login

# Create KV namespace
npx wrangler kv:namespace create COOKIES
# Copy the ID from output and update wrangler.toml

# Set environment variables
npx wrangler secret put XIAOHONGSHU_API_URL
# Enter: https://your-scraping-service-url.com

npx wrangler secret put SCRAPING_SERVICE_API_KEY
# Enter: your-secret-key (use the same key you set in the scraping service)

# Deploy
npm run deploy
```

### Step 4: Test

```bash
curl https://your-worker.workers.dev/health
# Should return: OK

curl -X POST https://your-worker.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

## 📁 File Overview

| File | Purpose |
|------|---------|
| `src/index.ts` | Original Node.js/stdio MCP server |
| `src/worker.ts` | Cloudflare Worker HTTP/MCP server |
| `src/scraping-service.ts` | External Playwright scraping service |
| `wrangler.toml` | Cloudflare configuration |
| `Dockerfile` | Docker image for scraping service |
| `docker-compose.yml` | Local Docker testing |

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Main project documentation |
| [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) | Detailed Cloudflare deployment |
| [SCRAPING_SERVICE_DEPLOYMENT.md](SCRAPING_SERVICE_DEPLOYMENT.md) | Scraping service deployment |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture and examples |
| [TESTING.md](TESTING.md) | Testing guide |

## 🔧 npm Scripts

```bash
# Node.js version (original)
npm run build           # Build TypeScript
npm start               # Run stdio MCP server
npm run dev             # Watch mode

# Scraping service
npm run start:scraping-service  # Run HTTP scraping service

# Cloudflare Worker
npm run build:worker    # Build and validate
npm run dev:worker      # Test locally
npm run deploy          # Deploy to Cloudflare
```

## 🌐 Deployment Options

### Option 1: Full Serverless (Recommended)
- **Worker**: Cloudflare Workers (Free tier)
- **Scraping**: Google Cloud Run (Free tier)
- **Cost**: $0/month (within free tiers)

### Option 2: Hybrid
- **Worker**: Cloudflare Workers (Free tier)
- **Scraping**: VPS (DigitalOcean/Linode)
- **Cost**: $6-12/month

### Option 3: Local Only
- **Server**: Local Node.js
- **Transport**: stdio (original)
- **Cost**: $0

## 🔑 Environment Variables

### Cloudflare Worker
- `XIAOHONGSHU_API_URL` - URL of scraping service
- `SCRAPING_SERVICE_API_KEY` - API key (optional but recommended)

### Scraping Service
- `PORT` - Port to listen on (default: 3000)
- `API_KEY` - API key for authentication
- `NODE_ENV` - Environment (production/development)

## 🚨 Common Issues

### "Browser-based scraping is not available"
➡️ Set `XIAOHONGSHU_API_URL` environment variable in Worker

### "API request failed: 401"
➡️ Check that API keys match in both services

### Slow responses
➡️ Scraping takes 30-60 seconds on first run (browser startup)

### Login required
➡️ Delete cookies directory on scraping service and re-login

## 💰 Cost Estimates

| Setup | Monthly Cost |
|-------|-------------|
| Free tier (Cloudflare + GCP) | $0 |
| Cloudflare + VPS | $6-12 |
| AWS Fargate | $15-30 |

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/xiaoland/rednote-mcp/issues)
- **Docs**: See comprehensive guides above
- **MCP Protocol**: [MCP Documentation](https://modelcontextprotocol.io)

## ✅ Next Steps

1. ✅ Deploy scraping service
2. ✅ Deploy Cloudflare Worker
3. ✅ Test endpoints
4. ✅ Configure monitoring
5. ✅ Set up alerts
6. ✅ Use with MCP client

---

**Need Help?** Check the detailed guides:
- New to Cloudflare Workers? → [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md)
- Need to deploy scraping service? → [SCRAPING_SERVICE_DEPLOYMENT.md](SCRAPING_SERVICE_DEPLOYMENT.md)
- Want to understand the architecture? → [ARCHITECTURE.md](ARCHITECTURE.md)
- Ready to test? → [TESTING.md](TESTING.md)
