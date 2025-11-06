# AGENTS.md

## AI Agent Documentation for RedNote MCP

This document provides comprehensive information for AI agents (like Claude, GPT, etc.) on how to effectively use, understand, and work with the RedNote MCP (Xiaohongshu Content Search Tool) project.

## Project Overview

**RedNote MCP** is a content search and retrieval system for Xiaohongshu (Little Red Book), a popular Chinese social media platform. The project provides intelligent content extraction with automatic login management and parallel processing capabilities.

### Current Architecture
- **Service Type**: HTTP REST API (not a traditional MCP server despite the name)
- **Primary Function**: Web scraping and content extraction from Xiaohongshu
- **Technology Stack**: Node.js + TypeScript + Playwright + Express.js
- **Deployment Options**: Local development, Cloudflare Workers, Docker/Kubernetes

## For AI Agents: Understanding This Project

### What This Project Does
1. **Content Search**: Searches Xiaohongshu for posts matching keywords
2. **Data Extraction**: Extracts rich metadata including:
   - Post titles and content
   - Author information and descriptions  
   - Engagement metrics (likes, favorites, comments)
   - Images and hashtags
   - Direct post links
3. **Browser Automation**: Uses Playwright for web scraping with login management
4. **API Interface**: Provides REST endpoints for programmatic access

### Key Interfaces

#### Primary Data Structure
```typescript
interface RedBookNote {
  title: string;        // Post title
  content: string;      // Post content text
  author: string;       // Author username
  authorDesc?: string;  // Author bio/description
  link: string;         // Direct URL to post
  likes?: number;       // Like count
  collects?: number;    // Favorite/bookmark count
  comments?: number;    // Comment count
  tags?: string[];      // Hashtag array
  images?: string[];    // Image URLs (WebP format)
}
```

#### API Endpoints
- `GET /search?query={keyword}&count={number}` - Search for content
- `GET /mocking/search` - Returns mock/sample data for testing
- `PUT /login` - Set authentication cookies

### Project Structure for Agents
```
rednote-mcp/
├── src/
│   ├── index.ts            # Main Express server + API endpoints
│   └── xiaohongshu.ts      # Core scraping logic with Playwright
├── mock/
│   └── example_search_result.json  # Sample API response
├── cookies/                # Auto-generated login state storage
├── results/                # Optional: saved search results
├── k8s/                    # Kubernetes deployment manifests
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── wrangler.toml           # Cloudflare Workers config
└── Dockerfile              # Container build instructions
```

## Agent Usage Guidelines

### When Working with This Codebase

#### 1. Understanding the "MCP" Naming
- **Important**: Despite the name "rednote-mcp", this is NOT a Model Context Protocol server
- It's a web scraping service with REST API endpoints
- The name appears to be historical/legacy

#### 2. Core Functionality Analysis
- **Primary Module**: `src/xiaohongshu.ts` contains all scraping logic
- **API Layer**: `src/index.ts` provides Express.js REST endpoints
- **Authentication**: Cookie-based login with automatic persistence
- **Concurrency**: Limited to 3 parallel requests to avoid rate limiting

#### 3. Key Technical Considerations
- **Browser Dependency**: Requires Playwright and Chromium for web automation
- **Login Requirement**: Needs valid Xiaohongshu account cookies
- **Rate Limiting**: Built-in delays and concurrency limits
- **Image Handling**: Returns WebP format image URLs
- **Error Handling**: Graceful fallbacks when content extraction fails

#### 4. Development Workflow
- **Package Manager**: Uses pnpm (but npm compatible)
- **Build Process**: TypeScript compilation with `tsc`
- **Development**: Watch mode with `npm run dev`
- **Testing**: Mock endpoint available for development

### Common Agent Tasks

#### Code Analysis & Understanding
```bash
# Key files to examine for understanding:
src/index.ts          # API endpoints and request handling
src/xiaohongshu.ts    # Web scraping implementation
mock/example_search_result.json  # Sample data structure
package.json          # Dependencies and available scripts
```

#### Making Modifications
1. **Adding Features**: Extend the `RedBookNote` interface and update extraction logic
2. **API Changes**: Modify endpoints in `src/index.ts`
3. **Scraping Logic**: Update selectors and extraction in `src/xiaohongshu.ts`
4. **Deployment**: Update Docker/K8s configs or Cloudflare Workers setup

#### Testing & Validation
```bash
npm run build         # Compile TypeScript
npm start            # Run the server
npm run dev          # Development mode with watch
```

### Important Notes for Agents

#### 1. Legal & Ethical Considerations
- This tool scrapes a commercial platform (Xiaohongshu)
- Agents should remind users about terms of service compliance
- Rate limiting is implemented to be respectful of the platform
- Intended for educational/research purposes

#### 2. Technical Limitations
- **Browser Dependency**: Playwright must be installed and functional
- **Login Required**: Manual login process on first run
- **Platform Changes**: Web scraping is fragile and may break with UI updates
- **Geographic Restrictions**: Xiaohongshu may not be accessible in all regions

#### 3. Deployment Considerations
- **Local Development**: Full Playwright support with browser automation
- **Cloudflare Workers**: Requires external scraping service (no browser support)
- **Docker/K8s**: Includes proper browser installation in containers

### Troubleshooting for Agents

#### Common Issues
1. **Login Problems**: Clear `cookies/` directory and re-authenticate
2. **Browser Issues**: Run `npm exec playwright install`
3. **Timeout Errors**: Increase timeouts in client configurations
4. **Empty Results**: Check if login cookies are valid

#### Debug Information
- **Logs**: Server logs to stderr for development
- **Screenshots**: Can be enabled in scraping logic for debugging
- **Mock Data**: Use `/mocking/search` endpoint for testing without scraping

## Integration Examples

### For API Clients
```javascript
// Search for content
const response = await fetch('http://localhost:8000/search?query=广外&count=5');
const notes = await response.json();
console.log(notes); // Array of RedBookNote objects
```

### For Development
```bash
# Start development server
npm run dev

# Test with mock data
curl http://localhost:8000/mocking/search

# Test real search (requires login)
curl "http://localhost:8000/search?query=test&count=3"
```

## Conclusion

This project serves as a bridge between Xiaohongshu's web interface and programmatic access, using sophisticated web scraping techniques. While named "MCP", it's actually a REST API service that could potentially be adapted to work with MCP protocols in the future.

For AI agents working with this codebase, focus on understanding the scraping logic, API structure, and deployment requirements rather than MCP-specific implementations.