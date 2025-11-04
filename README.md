# RedNote MCP - Xiaohongshu Content Search Tool

## Overview

RedNote MCP is a Model Context Protocol (MCP) server for searching and retrieving content from Xiaohongshu (Red Book) platform. It provides intelligent content extraction with automatic login management and parallel processing capabilities.

## Features

- **Smart Search**: Keyword-based content search on Xiaohongshu
- **Auto Login**: Automatic cookie management and login handling
- **Parallel Processing**: Efficient concurrent content retrieval
- **Rich Data Extraction**:
  - Note titles and content
  - Author information and descriptions
  - Interaction metrics (likes, favorites, comments)
  - Images and hashtags
  - Direct note links

## Technical Stack

- **Runtime**: Node.js with TypeScript
- **Browser Automation**: Playwright
- **Protocol**: Model Context Protocol (MCP) SDK
- **Validation**: Zod schema validation
- **Package Manager**: pnpm

## Data Structure

```typescript
interface RedBookNote {
  title: string;        // Note title
  content: string;      // Note content
  author: string;       // Author name
  authorDesc?: string;  // Author description
  link: string;         // Note URL
  likes?: number;       // Like count
  collects?: number;    // Favorite count
  comments?: number;    // Comment count
  tags?: string[];      // Hashtag list
  images?: string[];    // Image URLs (WebP format)
}
```

## Installation

### Prerequisites
- Node.js 18+ 
- pnpm package manager

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd rednote-mcp
```

2. Install dependencies:
```bash
pnpm install
```

3. Install Playwright browsers:
```bash
pnpm exec playwright install
```

4. Build the project:
```bash
pnpm build
```

## Usage

### Running the MCP Server

```bash
pnpm start
```

### Development Mode

```bash
pnpm dev
```

### Testing

```bash
pnpm test
```

## MCP Client Configuration

### Claude Desktop

Add the following configuration to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "rednote-mcp": {
      "command": "node",
      "args": [
        "C:\\ABSOLUTE\\PATH\\TO\\rednote-mcp\\build\\index.js"
      ]
    }
  }
}
```

**For macOS/Linux users:**
```json
{
  "mcpServers": {
    "rednote-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/rednote-mcp/build/index.js"
      ]
    }
  }
}
```

Replace the path with your actual project directory.

### Other MCP Clients

For other MCP-compatible clients, use the built server file:
```bash
node build/index.js
```

## Tool Usage

Once configured, you can use the search tool in your MCP client:

```
Search for "food recommendation" on Xiaohongshu
```

The tool will return structured data including titles, content, author information, and images.

## Important Notes

- **First Run**: Manual login to Xiaohongshu is required on first use
- **Performance**: Initial searches may take 30-60 seconds due to browser startup and content loading
- **Rate Limiting**: Concurrent requests are limited to 3 to avoid platform restrictions
- **Image Format**: Images are provided in WebP format
- **Cookie Management**: Login state is automatically saved and reused

## Development

### Project Structure
```
rednote-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   └── xiaohongshu.ts    # Core scraping logic
├── cookies/              # Auto-generated cookie storage
├── results/              # Optional: saved search results
├── build/                # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

### Available Scripts

- `pnpm build` - Build TypeScript to JavaScript
- `pnpm start` - Run the built MCP server
- `pnpm dev` - Development mode with auto-reload
- `pnpm test` - Run tests (if available)
- `pnpm clean` - Clean build directory

## Troubleshooting

### Common Issues

1. **Login Required**: If you see login prompts, delete the `cookies/` directory and restart
2. **Timeout Errors**: Increase the MCP client timeout settings
3. **Browser Not Found**: Run `pnpm exec playwright install` to install browsers
4. **Permission Errors**: Ensure the project directory has proper read/write permissions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is for educational and research purposes. Please respect Xiaohongshu's terms of service and rate limits when using this tool.

## Kubernetes Deployment

### Prerequisites
- Docker
- Kubernetes cluster (e.g., Minikube, EKS, GKE)
- kubectl configured

### Build and Push Docker Image

1. Build the Docker image:
```bash
docker build -t rednote-mcp:latest .
```

2. Tag and push to your registry (replace with your registry):
```bash
docker tag rednote-mcp:latest your-registry/rednote-mcp:latest
docker push your-registry/rednote-mcp:latest
```

**Automated CI/CD**: The project includes a GitHub Actions workflow that automatically builds and pushes the Docker image to GitHub Container Registry (`ghcr.io`) whenever code is pushed to the `develop` branch. The image will be available at `ghcr.io/xiaoland/rednote-mcp:latest`.

### Deploy to Kubernetes

1. The Docker image is automatically built and pushed to GitHub Container Registry on pushes to the `develop` branch.

2. Update the host in `k8s/ingress.yaml` if using Ingress:
```yaml
host: your-domain.com
```

3. Apply the Kubernetes manifests:
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

4. Check deployment status:
```bash
kubectl get pods
kubectl get services
kubectl get ingress
```

### Access the Application

- **ClusterIP Service**: Access via `http://rednote-mcp-service:8000` from within the cluster
- **Ingress**: Access via the configured domain (e.g., `http://your-domain.com`)

### Scaling

To scale the deployment:
```bash
kubectl scale deployment rednote-mcp --replicas=3
```

### Logs

View application logs:
```bash
kubectl logs -f deployment/rednote-mcp
```
