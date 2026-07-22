import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";
import { MCPServer } from "../src/mcp/server.mjs";

function request(server, input, output, message) {
  return new Promise(resolve => {
    output.once("data", chunk => resolve(JSON.parse(chunk.toString("utf8").trim())));
    input.write(`${JSON.stringify(message)}\n`);
    server.drain();
  });
}

test("MCP initializes and exposes the public tool surface", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const server = new MCPServer(input, output);
  server.start();
  const initialized = await request(server, input, output, {
    jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" }
  });
  assert.equal(initialized.result.serverInfo.name, "tatwo-ultrawork-beta");
  const listed = await request(server, input, output, { jsonrpc: "2.0", id: 2, method: "tools/list" });
  const names = listed.result.tools.map(tool => tool.name);
  assert.ok(names.includes("tatwo.os.begin"));
  assert.ok(names.includes("tatwo.gateway.fanout"));
  assert.ok(names.includes("tatwo.sandbox.run"));
  assert.ok(!names.some(name => name.includes("app")));
});
