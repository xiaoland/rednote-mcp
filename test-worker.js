#!/usr/bin/env node

/**
 * Simple test script to verify the Cloudflare Worker MCP endpoints
 * Run this after starting the worker locally with: npm run dev:worker
 */

async function testWorkerEndpoint(url, body, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📍 URL: ${url}`);
  console.log(`📤 Request:`, JSON.stringify(body, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log(`📥 Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log(`✅ Response:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return null;
  }
}

async function main() {
  const baseUrl = process.env.WORKER_URL || 'http://localhost:8787';
  
  console.log('='.repeat(60));
  console.log('RedNote MCP Cloudflare Worker Test Suite');
  console.log('='.repeat(60));
  console.log(`Worker URL: ${baseUrl}`);
  console.log('Make sure the worker is running: npm run dev:worker');
  console.log('='.repeat(60));

  // Test 1: Health check
  console.log(`\n🧪 Testing: Health Check`);
  try {
    const response = await fetch(`${baseUrl}/health`);
    console.log(`📥 Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`✅ Response: ${text}`);
  } catch (error) {
    console.error(`❌ Error:`, error.message);
  }

  // Test 2: Initialize
  await testWorkerEndpoint(
    `${baseUrl}/mcp`,
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    },
    'Initialize MCP Connection'
  );

  // Test 3: List tools
  await testWorkerEndpoint(
    `${baseUrl}/mcp`,
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    },
    'List Available Tools'
  );

  // Test 4: Call search tool (will fail without external service)
  await testWorkerEndpoint(
    `${baseUrl}/mcp`,
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search_xiaohongshu',
        arguments: {
          query: 'test',
          count: 2,
        },
      },
    },
    'Call Search Tool (expected to fail without external service)'
  );

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test suite completed!');
  console.log('='.repeat(60));
  console.log('\nNOTE: The search tool will fail unless you have configured');
  console.log('the XIAOHONGSHU_API_URL environment variable to point to');
  console.log('a running scraping service.');
  console.log('\nTo set up the scraping service, see:');
  console.log('  - SCRAPING_SERVICE_DEPLOYMENT.md');
  console.log('  - CLOUDFLARE_DEPLOYMENT.md');
}

main().catch(console.error);
