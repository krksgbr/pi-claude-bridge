/**
 * Tests for the compaction model role reader. Pi has no native compaction-model
 * setting, so the bridge reads the `compaction` role from model-roles.json.
 * Pins: missing files fall through, project overrides global, and an explicit
 * null clears the role instead of falling back.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
import { resolveConfiguredCompactionModel } from "../src/compaction-model.js";

function withTempDirs(fn) {
	const oldHome = process.env.HOME;
	const oldAgentDir = process.env.PI_CODING_AGENT_DIR;
	const home = mkdtempSync(join(tmpdir(), "claude-bridge-home-"));
	const cwd = mkdtempSync(join(tmpdir(), "claude-bridge-project-"));
	try {
		process.env.HOME = home;
		process.env.PI_CODING_AGENT_DIR = join(home, ".pi", "agent");
		return fn(cwd);
	} finally {
		if (oldHome === undefined) delete process.env.HOME;
		else process.env.HOME = oldHome;
		if (oldAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = oldAgentDir;
		rmSync(home, { recursive: true, force: true });
		rmSync(cwd, { recursive: true, force: true });
	}
}

function writeRoles(dir, roles) {
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "model-roles.json"), JSON.stringify({ version: 1, roles }));
}

describe("resolveConfiguredCompactionModel", () => {
	it("returns undefined when no model-roles.json exists", () => withTempDirs((cwd) => {
		assert.equal(resolveConfiguredCompactionModel(cwd), undefined);
	}));

	it("reads the global compaction role", () => withTempDirs((cwd) => {
		writeRoles(getAgentDir(), { compaction: { model: "claude-bridge/claude-opus-5" } });
		assert.equal(resolveConfiguredCompactionModel(cwd), "claude-bridge/claude-opus-5");
	}));

	it("lets the project role override the global role", () => withTempDirs((cwd) => {
		writeRoles(getAgentDir(), { compaction: { model: "claude-bridge/claude-opus-5" } });
		writeRoles(join(cwd, CONFIG_DIR_NAME), { compaction: { model: "openai/gpt-9" } });
		assert.equal(resolveConfiguredCompactionModel(cwd), "openai/gpt-9");
	}));

	it("treats an explicit null project role as cleared, not a fallback", () => withTempDirs((cwd) => {
		writeRoles(getAgentDir(), { compaction: { model: "claude-bridge/claude-opus-5" } });
		writeRoles(join(cwd, CONFIG_DIR_NAME), { compaction: { model: null } });
		assert.equal(resolveConfiguredCompactionModel(cwd), undefined);
	}));

	it("ignores an unparseable file instead of throwing", () => withTempDirs((cwd) => {
		const globalDir = getAgentDir();
		mkdirSync(globalDir, { recursive: true });
		writeFileSync(join(globalDir, "model-roles.json"), "{ not json");
		assert.equal(resolveConfiguredCompactionModel(cwd), undefined);
	}));
});
