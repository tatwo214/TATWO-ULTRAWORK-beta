import { callTool, toolDefinitions } from "./tools.mjs";
import { redact } from "../core/util.mjs";

export class MCPServer {
  constructor(input = process.stdin, output = process.stdout) {
    this.input = input;
    this.output = output;
    this.buffer = Buffer.alloc(0);
    this.mode = "ndjson";
  }

  start() {
    this.input.on("data", chunk => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.drain();
    });
    this.input.resume();
  }

  drain() {
    while (this.buffer.length) {
      const text = this.buffer.toString("utf8");
      const headerEnd = text.indexOf("\r\n\r\n");
      if (headerEnd >= 0) {
        const header = text.slice(0, headerEnd);
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          this.buffer = Buffer.from(text.slice(headerEnd + 4));
          continue;
        }
        const length = Number(match[1]);
        const bodyStart = Buffer.byteLength(text.slice(0, headerEnd + 4));
        if (this.buffer.length < bodyStart + length) return;
        const body = this.buffer.slice(bodyStart, bodyStart + length).toString("utf8");
        this.buffer = this.buffer.slice(bodyStart + length);
        this.mode = "framed";
        void this.handle(body);
        continue;
      }
      const newline = text.indexOf("\n");
      if (newline < 0) {
        try {
          JSON.parse(text.trim());
          this.buffer = Buffer.alloc(0);
          void this.handle(text.trim());
        } catch {}
        return;
      }
      const line = text.slice(0, newline).trim();
      this.buffer = Buffer.from(text.slice(newline + 1));
      if (line) void this.handle(line);
    }
  }

  async handle(raw) {
    let request;
    try { request = JSON.parse(raw); }
    catch {
      this.send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse_error" } });
      return;
    }
    if (request.id === undefined || request.id === null) return;
    try {
      if (request.method === "initialize") {
        this.send({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            protocolVersion: request.params?.protocolVersion || "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "tatwo-ultrawork-beta", version: "0.1.0-beta.2" }
          }
        });
      } else if (request.method === "ping") {
        this.send({ jsonrpc: "2.0", id: request.id, result: {} });
      } else if (request.method === "tools/list") {
        this.send({ jsonrpc: "2.0", id: request.id, result: { tools: toolDefinitions } });
      } else if (request.method === "tools/call") {
        const payload = await callTool(request.params?.name, request.params?.arguments || {});
        this.send({
          jsonrpc: "2.0",
          id: request.id,
          result: { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], isError: false }
        });
      } else {
        this.send({ jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "method_not_found" } });
      }
    } catch (error) {
      this.send({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [{ type: "text", text: JSON.stringify({ ok: false, error: redact(error?.message || error) }) }],
          isError: true
        }
      });
    }
  }

  send(message) {
    const body = JSON.stringify(message);
    if (this.mode === "framed") {
      this.output.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    } else {
      this.output.write(`${body}\n`);
    }
  }
}
