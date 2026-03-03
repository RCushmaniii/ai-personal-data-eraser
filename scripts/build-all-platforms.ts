#!/usr/bin/env bun
/**
 * Cross-platform build script.
 * Compiles ai-eraser binary for all supported targets and packages
 * each with its resources directory into a distributable archive.
 */

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { $ } from "bun";

interface Target {
	name: string;
	bunTarget: string;
	exe: string;
	archiveExt: "zip" | "tar.gz";
}

const targets: Target[] = [
	{
		name: "ai-eraser-windows-x64",
		bunTarget: "bun-windows-x64",
		exe: "ai-eraser.exe",
		archiveExt: "zip",
	},
	{
		name: "ai-eraser-linux-x64",
		bunTarget: "bun-linux-x64",
		exe: "ai-eraser",
		archiveExt: "tar.gz",
	},
	{
		name: "ai-eraser-linux-arm64",
		bunTarget: "bun-linux-arm64",
		exe: "ai-eraser",
		archiveExt: "tar.gz",
	},
	{
		name: "ai-eraser-darwin-x64",
		bunTarget: "bun-darwin-x64",
		exe: "ai-eraser",
		archiveExt: "tar.gz",
	},
	{
		name: "ai-eraser-darwin-arm64",
		bunTarget: "bun-darwin-arm64",
		exe: "ai-eraser",
		archiveExt: "tar.gz",
	},
];

const root = resolve(import.meta.dir, "..");
const distDir = resolve(root, "dist");

async function buildDashboard() {
	console.log("Building dashboard...");
	await $`bun run build:dashboard`.cwd(root);
}

function copyResources(targetDir: string) {
	const resourcesDir = resolve(targetDir, "resources");
	mkdirSync(resourcesDir, { recursive: true });

	// Dashboard build output
	const dashboardSrc = resolve(root, "src/dashboard/app/dist");
	if (existsSync(dashboardSrc)) {
		cpSync(dashboardSrc, resolve(resourcesDir, "dashboard"), { recursive: true });
	} else {
		console.warn("  Warning: Dashboard not built, skipping dashboard resources");
	}

	// Broker playbooks
	cpSync(resolve(root, "src/brokers/playbooks"), resolve(resourcesDir, "playbooks"), {
		recursive: true,
	});

	// Email templates
	cpSync(resolve(root, "src/email/templates"), resolve(resourcesDir, "templates"), {
		recursive: true,
	});

	// .env.example
	const envExample = resolve(root, ".env.example");
	if (existsSync(envExample)) {
		cpSync(envExample, resolve(targetDir, ".env.example"));
	}
}

async function buildTarget(target: Target) {
	const targetDir = resolve(distDir, target.name);

	// Clean previous build
	if (existsSync(targetDir)) {
		rmSync(targetDir, { recursive: true });
	}
	mkdirSync(targetDir, { recursive: true });

	const outfile = resolve(targetDir, target.exe);
	console.log(`Compiling for ${target.bunTarget}...`);

	await $`bun build ./src/cli/index.ts --compile --minify --target=${target.bunTarget} --outfile ${outfile}`.cwd(
		root,
	);

	// Copy resources alongside the binary
	copyResources(targetDir);

	// Create archive
	const archiveName = `${target.name}.${target.archiveExt}`;
	console.log(`  Packaging ${archiveName}...`);

	if (target.archiveExt === "zip") {
		// Use PowerShell Compress-Archive on Windows
		await $`powershell -Command "Compress-Archive -Path '${targetDir}/*' -DestinationPath '${resolve(distDir, archiveName)}' -Force"`.cwd(
			distDir,
		);
	} else {
		await $`tar -czf ${archiveName} -C ${distDir} ${target.name}`.cwd(distDir);
	}

	console.log(`  Done: dist/${archiveName}`);
}

async function main() {
	console.log("=== ai-eraser cross-platform build ===\n");

	// Clean dist
	if (existsSync(distDir)) {
		rmSync(distDir, { recursive: true });
	}
	mkdirSync(distDir, { recursive: true });

	// Build dashboard first (shared across all targets)
	await buildDashboard();

	// Build each target sequentially (cross-compilation)
	for (const target of targets) {
		try {
			await buildTarget(target);
		} catch (error) {
			console.error(`Failed to build ${target.name}:`, error);
		}
	}

	console.log("\nBuild complete! Archives in dist/");
}

main().catch(console.error);
