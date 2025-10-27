# External Scraping Service Deployment Guide

This guide explains how to deploy the external scraping service that works with the Cloudflare Worker.

## Why an External Service?

Cloudflare Workers don't support browser automation (Playwright/Puppeteer). To enable actual web scraping from Xiaohongshu, you need to deploy the scraping logic separately to a server that supports Node.js and headless browsers.

## Architecture

```
┌─────────────┐      HTTP/JSON-RPC      ┌──────────────────┐
│   MCP       │ ◄──────────────────────► │   Cloudflare     │
│   Client    │                          │   Worker         │
└─────────────┘                          └────────┬─────────┘
                                                  │
                                                  │ HTTP/REST
                                                  │
                                         ┌────────▼─────────┐
                                         │   Scraping       │
                                         │   Service        │
                                         │   (Playwright)   │
                                         └──────────────────┘
```

## Deployment Options

### Option 1: Docker (Recommended)

The easiest way to deploy the scraping service is using Docker.

#### Build the Docker Image

```bash
docker build -t rednote-scraping-service .
```

#### Run Locally

```bash
docker run -p 3000:3000 \
  -e API_KEY=your-secret-key \
  rednote-scraping-service
```

#### Deploy to Cloud Platforms

**AWS ECS/Fargate:**
```bash
# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URL
docker tag rednote-scraping-service:latest YOUR_ECR_URL/rednote-scraping-service:latest
docker push YOUR_ECR_URL/rednote-scraping-service:latest

# Create ECS service (see AWS documentation)
```

**Google Cloud Run:**
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT/rednote-scraping-service
gcloud run deploy rednote-scraping --image gcr.io/YOUR_PROJECT/rednote-scraping-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars API_KEY=your-secret-key
```

**DigitalOcean App Platform:**
```bash
# Push to DigitalOcean Container Registry
doctl registry login
docker tag rednote-scraping-service registry.digitalocean.com/YOUR_REGISTRY/rednote-scraping-service
docker push registry.digitalocean.com/YOUR_REGISTRY/rednote-scraping-service

# Create app via DigitalOcean UI or API
```

**Fly.io:**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch --image rednote-scraping-service
fly secrets set API_KEY=your-secret-key
fly deploy
```

### Option 2: VPS (Traditional Server)

Deploy to any VPS provider (DigitalOcean, Linode, Vultr, AWS EC2, etc.)

#### Prerequisites
- Ubuntu 22.04 or similar
- Node.js 20+
- PM2 for process management

#### Setup Steps

1. **SSH into your server:**
```bash
ssh user@your-server-ip
```

2. **Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Install PM2:**
```bash
sudo npm install -g pm2
```

4. **Clone and build the project:**
```bash
git clone https://github.com/xiaoland/rednote-mcp.git
cd rednote-mcp
npm install
npm run build
```

5. **Install Playwright browsers:**
```bash
npx playwright install --with-deps chromium
```

6. **Set environment variables:**
```bash
export PORT=3000
export API_KEY=your-secret-key
```

Or create a `.env` file (not recommended for production):
```bash
echo "PORT=3000" >> .env
echo "API_KEY=your-secret-key" >> .env
```

7. **Start the service with PM2:**
```bash
pm2 start dist/scraping-service.js --name rednote-scraping
pm2 save
pm2 startup
```

8. **Set up nginx as reverse proxy (optional but recommended):**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

9. **Enable SSL with Let's Encrypt (recommended):**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 3: Serverless Functions

While possible, serverless functions with browser support are more complex:

#### AWS Lambda with Puppeteer Layer

1. Use a pre-built Puppeteer layer or build your own
2. Deploy the scraping function
3. Set timeout to at least 60 seconds
4. Allocate sufficient memory (at least 1GB)

#### Vercel/Netlify Functions

These platforms have limitations with browser automation. Not recommended.

## Configuration

### Environment Variables

- `PORT` - Port to listen on (default: 3000)
- `API_KEY` - Optional API key for authentication
- `NODE_ENV` - Set to "production" in production

### Security Recommendations

1. **Always use API key authentication in production**
   ```bash
   export API_KEY=$(openssl rand -base64 32)
   ```

2. **Use HTTPS** (SSL/TLS) for communication

3. **Restrict CORS** if needed (modify `scraping-service.ts`)

4. **Use environment-specific configuration**

5. **Monitor and limit rate** to avoid abuse

## Testing the Service

### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Search Request
```bash
curl "http://localhost:3000/search?query=food&count=5" \
  -H "Authorization: Bearer your-secret-key"
```

## Connecting to Cloudflare Worker

Once deployed, update your Cloudflare Worker environment:

### Using Wrangler CLI
```bash
wrangler secret put XIAOHONGSHU_API_URL
# Enter: https://your-scraping-service.com
```

### Using Cloudflare Dashboard
1. Go to Workers & Pages
2. Select your worker
3. Go to Settings > Variables
4. Add `XIAOHONGSHU_API_URL` with value `https://your-scraping-service.com`

If using API key authentication:
```bash
wrangler secret put SCRAPING_SERVICE_API_KEY
# Enter your API key
```

Update `worker.ts` to include the API key in requests:
```typescript
const response = await fetch(
  `${env.XIAOHONGSHU_API_URL}/search?query=${encodeURIComponent(query)}&count=${count}`,
  {
    headers: {
      'Authorization': `Bearer ${env.SCRAPING_SERVICE_API_KEY}`
    }
  }
);
```

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs rednote-scraping
```

### Docker Logs
```bash
docker logs -f container-id
```

### Cloud Platform Monitoring
- AWS CloudWatch
- Google Cloud Logging
- DigitalOcean Insights
- Fly.io Metrics

## Cost Estimates

### Docker on VPS
- **DigitalOcean Droplet**: $6-12/month (Basic Droplet)
- **Linode**: $5-10/month (Nanode or Shared CPU)
- **Vultr**: $6-12/month (Cloud Compute)
- **AWS EC2 t3.micro**: ~$8/month (may need t3.small: ~$15/month)

### Serverless Options
- **Google Cloud Run**: $0 (free tier up to 2M requests) + compute time
- **AWS Fargate**: ~$15-30/month (depends on usage)
- **Fly.io**: $0-5/month (free tier available)

### Bandwidth Considerations
Most scraping use cases will stay within free tiers for bandwidth (1TB+/month)

## Troubleshooting

### Browser Installation Issues
```bash
# Install missing dependencies
npx playwright install-deps chromium
```

### Memory Issues
Increase container memory or VM size. Playwright requires at least 512MB, recommend 1GB+.

### Performance Issues
- Use SSD-based VPS
- Increase concurrency limits carefully
- Consider caching results
- Use a CDN if serving static content

### CORS Issues
If calling from a web client, update CORS headers in `scraping-service.ts`:
```typescript
res.setHeader('Access-Control-Allow-Origin', 'https://your-worker-url.workers.dev');
```

## Scaling

### Horizontal Scaling
- Deploy multiple instances behind a load balancer
- Use Docker Swarm or Kubernetes
- Cloud provider auto-scaling (AWS ECS, GCP Cloud Run)

### Vertical Scaling
- Increase CPU/memory allocation
- Use faster SSD storage
- Optimize Playwright settings

## Maintenance

### Updates
```bash
# Pull latest code
git pull

# Rebuild
npm install
npm run build

# Restart service
pm2 restart rednote-scraping
```

### Backup
Regularly backup:
- Application code
- Configuration files
- Cookies directory (if using)

## Next Steps

1. Deploy the scraping service using your preferred method
2. Note the public URL
3. Configure the Cloudflare Worker with the service URL
4. Test the complete workflow
5. Set up monitoring and alerts
6. Implement rate limiting if needed
