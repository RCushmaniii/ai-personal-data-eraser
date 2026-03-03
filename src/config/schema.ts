import { z } from "zod";

export const smtpConfigSchema = z.object({
	host: z.string().min(1),
	port: z.number().int().positive().default(587),
	secure: z.boolean().default(false),
	user: z.string().min(1),
	pass: z.string().min(1),
	fromName: z.string().default("AI Eraser"),
	fromEmail: z.string().email(),
});

export const imapConfigSchema = z.object({
	host: z.string().min(1),
	port: z.number().int().positive().default(993),
	user: z.string().min(1),
	pass: z.string().min(1),
	folder: z.string().default("INBOX"),
	pollInterval: z.number().int().positive().default(300),
});

export const vaultConfigSchema = z.object({
	dataDir: z.string().default("data/vault"),
	memoryCost: z.number().int().positive().default(65536),
	timeCost: z.number().int().positive().default(3),
});

export const dashboardConfigSchema = z.object({
	port: z.number().int().positive().default(3847),
	host: z.string().default("127.0.0.1"),
});

export const schedulerConfigSchema = z.object({
	scanCron: z.string().default("0 6 * * 1"),
	recheckCron: z.string().default("0 8 * * 3"),
	inboxCron: z.string().default("*/5 * * * *"),
	enabled: z.boolean().default(false),
});

export const appConfigSchema = z.object({
	anthropicApiKey: z.string().min(1, "ANTHROPIC_API_KEY is required"),
	model: z.string().default("claude-sonnet-4-20250514"),
	smtp: smtpConfigSchema,
	imap: imapConfigSchema,
	vault: vaultConfigSchema.default({}),
	dashboard: dashboardConfigSchema.default({}),
	scheduler: schedulerConfigSchema.default({}),
	dbPath: z.string().default("data/ai-eraser.db"),
	logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
	firecrawlApiKey: z.string().optional(),
});

export type ValidatedConfig = z.infer<typeof appConfigSchema>;
