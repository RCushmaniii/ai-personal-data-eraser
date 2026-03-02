import { z } from "zod";

/** Schema for YAML broker playbook files */

const stepActionSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("navigate"),
		url: z.string(),
		description: z.string().optional(),
	}),
	z.object({
		type: z.literal("fill_form"),
		fields: z.record(z.string()),
		description: z.string().optional(),
	}),
	z.object({
		type: z.literal("click"),
		selector: z.string(),
		description: z.string().optional(),
	}),
	z.object({
		type: z.literal("wait"),
		seconds: z.number().positive(),
		description: z.string().optional(),
	}),
	z.object({
		type: z.literal("send_email"),
		template: z.string(),
		to: z.string(),
		description: z.string().optional(),
	}),
	z.object({
		type: z.literal("ai_analyze"),
		prompt: z.string(),
		description: z.string().optional(),
	}),
	z.object({
		type: z.literal("verify_removal"),
		checkUrl: z.string(),
		description: z.string().optional(),
	}),
	z.object({
		type: z.literal("captcha"),
		handler: z.enum(["manual", "ai_assist"]),
		description: z.string().optional(),
	}),
]);

export type PlaybookStepAction = z.infer<typeof stepActionSchema>;

const playbookStepSchema = z.object({
	name: z.string(),
	action: stepActionSchema,
	onFailure: z.enum(["retry", "skip", "abort"]).default("abort"),
	maxRetries: z.number().int().nonnegative().default(2),
});

export type PlaybookStep = z.infer<typeof playbookStepSchema>;

export const playbookSchema = z.object({
	id: z.string(),
	name: z.string(),
	domain: z.string(),
	category: z.enum([
		"people_search",
		"background_check",
		"marketing",
		"data_aggregator",
		"social_media",
		"public_records",
	]),
	difficulty: z.enum(["easy", "medium", "hard", "very_hard"]),
	estimatedDays: z.number().int().positive(),
	legalFrameworks: z.array(z.enum(["ccpa", "gdpr", "generic"])),
	requiresVerification: z.boolean().default(false),
	searchUrl: z.string().url(),
	optOutUrl: z.string().url(),
	optOutMethods: z.array(
		z.enum(["web_form", "email", "postal_mail", "phone", "api", "account_deletion"]),
	),
	notes: z.string().optional(),
	steps: z.object({
		search: z.array(playbookStepSchema),
		optOut: z.array(playbookStepSchema),
		verify: z.array(playbookStepSchema),
	}),
});

export type Playbook = z.infer<typeof playbookSchema>;
