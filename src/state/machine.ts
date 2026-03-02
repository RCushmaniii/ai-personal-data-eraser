import { type AnyActorRef, createActor, setup } from "xstate";
import type { BrokerStatus } from "../types/index.js";

/**
 * XState v5 state machine for broker lifecycle management.
 * Tracks a broker record through discovery → scanning → opt-out → removal.
 */

type BrokerContext = {
	brokerId: string;
	profileId: string;
	recordId: string;
	attempts: number;
	maxAttempts: number;
	lastError: string | null;
};

type BrokerEvent =
	| { type: "SCAN" }
	| { type: "MATCH_FOUND"; profileUrl: string; confidence: number }
	| { type: "NO_MATCH" }
	| { type: "START_OPT_OUT" }
	| { type: "OPT_OUT_SUBMITTED" }
	| { type: "VERIFICATION_NEEDED" }
	| { type: "VERIFICATION_COMPLETE" }
	| { type: "CONFIRMATION_RECEIVED" }
	| { type: "REMOVAL_FAILED"; error: string }
	| { type: "RE_APPEARED" }
	| { type: "RETRY" };

export const brokerMachine = setup({
	types: {
		context: {} as BrokerContext,
		events: {} as BrokerEvent,
		input: {} as BrokerContext,
	},
	guards: {
		canRetry: ({ context }) => context.attempts < context.maxAttempts,
		maxRetriesReached: ({ context }) => context.attempts >= context.maxAttempts,
	},
	actions: {
		incrementAttempts: ({ context }) => {
			context.attempts += 1;
		},
		setError: ({ context, event }) => {
			if (event.type === "REMOVAL_FAILED") {
				context.lastError = event.error;
			}
		},
		clearError: ({ context }) => {
			context.lastError = null;
		},
	},
}).createMachine({
	id: "broker",
	initial: "discovered",
	context: ({ input }: { input: BrokerContext }) => input,
	states: {
		discovered: {
			on: {
				SCAN: { target: "scanning", actions: "clearError" },
			},
		},
		scanning: {
			on: {
				MATCH_FOUND: { target: "found" },
				NO_MATCH: { target: "notFound" },
			},
		},
		found: {
			on: {
				START_OPT_OUT: { target: "optOutStarted" },
			},
		},
		notFound: {
			type: "final",
		},
		optOutStarted: {
			on: {
				OPT_OUT_SUBMITTED: { target: "optOutSubmitted" },
				VERIFICATION_NEEDED: { target: "verificationNeeded" },
				REMOVAL_FAILED: {
					target: "removalFailed",
					actions: ["setError", "incrementAttempts"],
				},
			},
		},
		optOutSubmitted: {
			on: {
				CONFIRMATION_RECEIVED: { target: "awaitingConfirmation" },
				VERIFICATION_NEEDED: { target: "verificationNeeded" },
				REMOVAL_FAILED: {
					target: "removalFailed",
					actions: ["setError", "incrementAttempts"],
				},
			},
		},
		verificationNeeded: {
			on: {
				VERIFICATION_COMPLETE: { target: "optOutSubmitted" },
				REMOVAL_FAILED: {
					target: "removalFailed",
					actions: ["setError", "incrementAttempts"],
				},
			},
		},
		awaitingConfirmation: {
			on: {
				CONFIRMATION_RECEIVED: { target: "removalConfirmed" },
				REMOVAL_FAILED: {
					target: "removalFailed",
					actions: ["setError", "incrementAttempts"],
				},
			},
		},
		removalConfirmed: {
			on: {
				RE_APPEARED: { target: "reAppeared" },
			},
		},
		removalFailed: {
			on: {
				RETRY: [
					{
						target: "optOutStarted",
						guard: "canRetry",
						actions: "clearError",
					},
					{
						target: "removalFailed",
						guard: "maxRetriesReached",
					},
				],
			},
		},
		reAppeared: {
			on: {
				START_OPT_OUT: { target: "optOutStarted", actions: "clearError" },
			},
		},
	},
});

/** Maps XState state values to our BrokerStatus type */
export function stateToStatus(stateValue: string): BrokerStatus {
	const mapping: Record<string, BrokerStatus> = {
		discovered: "discovered",
		scanning: "scanning",
		found: "found",
		notFound: "not_found",
		optOutStarted: "opt_out_started",
		optOutSubmitted: "opt_out_submitted",
		verificationNeeded: "verification_needed",
		awaitingConfirmation: "awaiting_confirmation",
		removalConfirmed: "removal_confirmed",
		removalFailed: "removal_failed",
		reAppeared: "re_appeared",
	};
	return mapping[stateValue] ?? "discovered";
}

/** Creates a new broker state machine actor */
export function createBrokerActor(
	brokerId: string,
	profileId: string,
	recordId: string,
	maxAttempts = 3,
): AnyActorRef {
	return createActor(brokerMachine, {
		input: {
			brokerId,
			profileId,
			recordId,
			attempts: 0,
			maxAttempts,
			lastError: null,
		},
	});
}
