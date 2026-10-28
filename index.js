#!/usr/bin/env node
// Zero-dependency MCP server (stdio, JSON-RPC 2.0, newline-delimited).
// Tools: roll_dice, word_count, release_notes_template

const readline = require("readline");

const SERVER_INFO = { name: "hello-mcp-server", version: "0.1.0" };

const TOOLS = [
  {
    name: "roll_dice",
    description: "Roll one or more dice and return the results.",
    inputSchema: {
      type: "object",
      properties: {
        sides: { type: "integer", minimum: 2, maximum: 1000, default: 6, description: "Number of sides per die" },
        count: { type: "integer", minimum: 1, maximum: 100, default: 1, description: "How many dice to roll" },
      },
    },
  },
  {
    name: "word_count",
    description: "Count words, characters and lines in a piece of text.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "The text to analyse" } },
      required: ["text"],
    },
  },
  {
    name: "release_notes_template",
    description: "Return a Markdown release-notes skeleton for a given version and list of changes.",
    inputSchema: {
      type: "object",
      properties: {
        version: { type: "string", description: "Version number, e.g. 1.2.0" },
        changes: { type: "array", items: { type: "string" }, description: "One line per change" },
      },
      required: ["version"],
    },
  },
];

const PROMPTS = [
  {
    name: "write_release_notes",
    description: "Write release notes for this milestone.",
    arguments: [{ name: "version", description: "Version number", required: true }],
  },
];

function callTool(name, args = {}) {
  switch (name) {
    case "roll_dice": {
      const sides = Number.isInteger(args.sides) ? args.sides : 6;
      const count = Number.isInteger(args.count) ? args.count : 1;
      const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
      return `Rolled ${count}d${sides}: [${rolls.join(", ")}] total=${rolls.reduce((a, b) => a + b, 0)}`;
    }
    case "word_count": {
      const t = String(args.text ?? "");
      const words = t.trim() ? t.trim().split(/\s+/).length : 0;
      return JSON.stringify({ words, characters: t.length, lines: t ? t.split(/\r?\n/).length : 0 });
    }
    case "release_notes_template": {
      const items = (args.changes || []).map((c) => `- ${c}`).join("\n") || "- (none)";
      return `# Release ${args.version}\n\n## Changes\n${items}\n\n## Upgrade notes\n- \n`;
    }
    default:
      throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32602 });
  }
}

function handle(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case "initialize":
      return {
        protocolVersion: params?.protocolVersion || "2025-06-18",
        capabilities: { tools: {}, prompts: {} },
        serverInfo: SERVER_INFO,
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call":
      return { content: [{ type: "text", text: callTool(params.name, params.arguments) }] };
    case "prompts/list":
      return { prompts: PROMPTS };
    case "prompts/get":
      return {
        description: PROMPTS[0].description,
        messages: [
          {
            role: "user",
            content: { type: "text", text: `Write the release notes for version ${params?.arguments?.version ?? "x.y.z"}. Use the release_notes_template tool.` },
          },
        ],
      };
    default:
      if (id === undefined) return undefined; // notification, no reply
      throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 });
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  try {
    const result = handle(msg);
    if (msg.id !== undefined && result !== undefined) {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }) + "\n");
    }
  } catch (e) {
    if (msg.id !== undefined) {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: e.code || -32603, message: e.message } }) + "\n");
    }
  }
});
