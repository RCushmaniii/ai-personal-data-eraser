import { dirname, resolve } from "node:path";

/**
 * Resolves a resource path for both dev mode and compiled binary.
 * In dev: returns `devPath` unchanged.
 * In compiled binary: resolves to `<exe dir>/resources/<resourceName>`.
 */
export function resolveResource(devPath: string, resourceName: string): string {
	const execPath = process.execPath.replace(/\\/g, "/");
	const isCompiled = !execPath.endsWith("/bun") && !execPath.endsWith("/bun.exe");
	if (isCompiled) {
		return resolve(dirname(process.execPath), "resources", resourceName);
	}
	return devPath;
}
