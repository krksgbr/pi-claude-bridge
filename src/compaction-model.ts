// Bridge-owned compaction normally runs on the active bridge model. A user can
// point it at a different claude-bridge model with the `compaction` role in
// model-roles.json (global ~/.pi/agent, project <cwd>/.pi), the same file the
// pi-tools extensions use. Pi itself has no compaction-model setting.
//
// Resolution mirrors the model-roles convention: project overrides global, and
// an explicit null clears the role.

import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface ModelRolesFile {
	roles?: {
		compaction?: {
			model?: unknown;
		};
	};
}

/** undefined = no opinion (fall through); null = explicitly cleared. */
function readCompactionModelSetting(path: string): string | null | undefined {
	if (!existsSync(path)) return undefined;
	let parsed: ModelRolesFile;
	try {
		parsed = JSON.parse(readFileSync(path, "utf8")) as ModelRolesFile;
	} catch (err) {
		console.error(`claude-bridge: failed to parse ${path}: ${err}`);
		return undefined;
	}
	const value = parsed?.roles?.compaction?.model;
	if (value === null) return null;
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * The configured compaction model as an exact `provider/model` id, or undefined
 * when the role is unset. Project settings override global.
 */
export function resolveConfiguredCompactionModel(cwd: string): string | undefined {
	const project = readCompactionModelSetting(join(cwd, CONFIG_DIR_NAME, "model-roles.json"));
	if (project !== undefined) return project ?? undefined;
	const global = readCompactionModelSetting(join(getAgentDir(), "model-roles.json"));
	return global ?? undefined;
}
