/**
 * Cloudflare Worker entry point for the RedNote MCP server
 * This provides an HTTP interface to the MCP server
 */

/// <reference types="@cloudflare/workers-types" />

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define the Worker environment type
export interface Env {
  COOKIES: KVNamespace;
  XIAOHONGSHU_API_URL?: string; // Optional: External API endpoint for scraping
  SCRAPING_SERVICE_API_KEY?: string; // Optional: API key for scraping service
}

// Since Playwright doesn't work in Cloudflare Workers, we'll create a stub
// that returns mock data or calls an external API
async function searchXiaohongshuWorker(
  query: string,
  count: number = 5,
  env: Env
): Promise<any[]> {
  // If an external API is configured, use it
  if (env.XIAOHONGSHU_API_URL) {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add API key if configured
      if (env.SCRAPING_SERVICE_API_KEY) {
        headers['Authorization'] = `Bearer ${env.SCRAPING_SERVICE_API_KEY}`;
      }

      const response = await fetch(
        `${env.XIAOHONGSHU_API_URL}/search?query=${encodeURIComponent(query)}&count=${count}`,
        { headers }
      );
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error calling external API:", error);
      throw error;
    }
  }

  // For now, return a message indicating that browser-based scraping
  // is not available in Cloudflare Workers
  throw new Error(
    "Browser-based scraping is not available in Cloudflare Workers. " +
    "Please configure XIAOHONGSHU_API_URL environment variable to point to " +
    "an external scraping service, or use the Node.js version for local scraping."
  );
}

// Create MCP server instance
function createMcpServer(env: Env) {
  const server = new McpServer({
    name: "rednote-mcp",
    version: "1.1.0",
    description:
      "MCP server for searching and retrieving content from Xiaohongshu (Red Note) platform.",
  });

  type ContentBlock =
    | {
        type: "text";
        text: string;
      }
    | {
        type: "resource";
        resource: {
          uri: string;
          text: string;
          mimeType?: string;
        };
      };

  server.tool(
    "search_xiaohongshu",
    "Searches for content on Xiaohongshu (Red Note) based on a query",
    {
      query: z.string().describe("Search query for Xiaohongshu content"),
      count: z.number().optional().default(10).describe("Number of results to return"),
    },
    async (params: { query: string; count: number }, extra) => {
      const { query, count } = params;
      try {
        console.log(`Searching Xiaohongshu: ${query}, Count: ${count}`);

        // Fetch search results from Xiaohongshu
        const results = await searchXiaohongshuWorker(query, count, env);

        // Initialize an array for content blocks
        const contentBlocks: ContentBlock[] = [];

        // Add a main header for the search results
        contentBlocks.push({
          type: "text",
          text: `# Xiaohongshu Search Results for "${query}"\n\nFound ${results.length} related notes.`,
        });

        // Loop through each note to generate its corresponding text and image blocks
        for (let i = 0; i < results.length; i++) {
          const note = results[i];

          // Generate text content for the current note
          let noteTextContent = `## ${i + 1}. ${note.title}\n\n`;

          // Author information
          noteTextContent += `**Author:** ${note.author}`;
          if (note.authorDesc) {
            noteTextContent += ` (${note.authorDesc})`;
          }
          noteTextContent += "\n\n";

          // Interaction data
          const interactionInfo = [];
          if (typeof note.likes !== "undefined") interactionInfo.push(`👍 ${note.likes}`);
          if (typeof note.collects !== "undefined") interactionInfo.push(`⭐ ${note.collects}`);
          if (typeof note.comments !== "undefined") interactionInfo.push(`💬 ${note.comments}`);
          if (interactionInfo.length > 0) {
            noteTextContent += `**Interactions:** ${interactionInfo.join(" · ")}\n\n`;
          }

          // Note content body
          noteTextContent += `### Content\n${note.content.trim()}\n\n`;

          // Tags
          if (note.tags && note.tags.length > 0) {
            noteTextContent += `**Tags:** ${note.tags.map((tag: string) => `#${tag}`).join(" ")}\n\n`;
          }

          // Original Link
          noteTextContent += `**Original Link:** ${note.link}`;

          // Add the formatted text block to the array
          contentBlocks.push({
            type: "text",
            text: noteTextContent,
          });

          // Generate resource links for images in the current note
          if (note.images && note.images.length > 0) {
            for (let j = 0; j < note.images.length; j++) {
              const imageUrl = note.images[j];

              contentBlocks.push({
                type: "resource",
                resource: {
                  uri: imageUrl,
                  text: `Image ${j + 1} for note: "${note.title}"`,
                },
              });
            }
          }

          // Add a separator block
          contentBlocks.push({
            type: "text",
            text: "\n\n---\n\n",
          });
        }

        // Return the structured JSON object
        return {
          content: contentBlocks,
        };
      } catch (error) {
        console.error("Xiaohongshu search error:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error searching Xiaohongshu content: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

// Simple HTTP-based MCP transport for Cloudflare Workers
async function handleMcpRequest(request: Request, env: Env): Promise<Response> {
  // Only accept POST requests
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json() as any;
    const server = createMcpServer(env);

    // Handle MCP protocol messages
    if (body.method === "tools/list") {
      // Return list of available tools
      const tools = Array.from((server as any)._tools.values());
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            tools: tools.map((tool: any) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.schema,
            })),
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (body.method === "tools/call") {
      // Execute tool
      const { name, arguments: args } = body.params;
      
      // Get the tool and execute it
      const tool = (server as any)._tools.get(name);
      if (!tool) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: -32601,
              message: `Tool not found: ${name}`,
            },
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 404,
          }
        );
      }

      const result = await tool.handler(args, {});
      
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (body.method === "initialize") {
      // Handle initialization
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "rednote-mcp",
              version: "1.1.0",
            },
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Unknown method
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        error: {
          code: -32601,
          message: "Method not found",
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 404,
      }
    );
  } catch (error) {
    console.error("Error handling MCP request:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error"
        // Error details are logged but not exposed to the client for security
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Cloudflare Worker fetch handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    // MCP endpoint
    if (url.pathname === "/mcp" || url.pathname === "/") {
      return handleMcpRequest(request, env);
    }

    return new Response("Not found", { status: 404 });
  },
};
