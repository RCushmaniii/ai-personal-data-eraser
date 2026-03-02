import { describe, test, expect } from "bun:test";
import { createActor } from "xstate";
import { brokerMachine, stateToStatus } from "../src/state/machine.js";

function createTestActor() {
	return createActor(brokerMachine, {
		input: {
			brokerId: "test-broker",
			profileId: "test-profile",
			recordId: "test-record",
			attempts: 0,
			maxAttempts: 3,
			lastError: null,
		},
	});
}

describe("Broker State Machine", () => {
	test("starts in discovered state", () => {
		const actor = createTestActor();
		actor.start();
		expect(actor.getSnapshot().value).toBe("discovered");
		actor.stop();
	});

	test("transitions through happy path", () => {
		const actor = createTestActor();
		actor.start();

		actor.send({ type: "SCAN" });
		expect(actor.getSnapshot().value).toBe("scanning");

		actor.send({ type: "MATCH_FOUND", profileUrl: "http://test.com", confidence: 0.8 });
		expect(actor.getSnapshot().value).toBe("found");

		actor.send({ type: "START_OPT_OUT" });
		expect(actor.getSnapshot().value).toBe("optOutStarted");

		actor.send({ type: "OPT_OUT_SUBMITTED" });
		expect(actor.getSnapshot().value).toBe("optOutSubmitted");

		actor.send({ type: "CONFIRMATION_RECEIVED" });
		expect(actor.getSnapshot().value).toBe("awaitingConfirmation");

		actor.send({ type: "CONFIRMATION_RECEIVED" });
		expect(actor.getSnapshot().value).toBe("removalConfirmed");

		actor.stop();
	});

	test("handles scan with no match", () => {
		const actor = createTestActor();
		actor.start();

		actor.send({ type: "SCAN" });
		actor.send({ type: "NO_MATCH" });
		expect(actor.getSnapshot().value).toBe("notFound");

		actor.stop();
	});

	test("handles verification needed", () => {
		const actor = createTestActor();
		actor.start();

		actor.send({ type: "SCAN" });
		actor.send({ type: "MATCH_FOUND", profileUrl: "http://test.com", confidence: 0.8 });
		actor.send({ type: "START_OPT_OUT" });
		actor.send({ type: "VERIFICATION_NEEDED" });
		expect(actor.getSnapshot().value).toBe("verificationNeeded");

		actor.send({ type: "VERIFICATION_COMPLETE" });
		expect(actor.getSnapshot().value).toBe("optOutSubmitted");

		actor.stop();
	});

	test("handles failure and retry", () => {
		const actor = createTestActor();
		actor.start();

		actor.send({ type: "SCAN" });
		actor.send({ type: "MATCH_FOUND", profileUrl: "http://test.com", confidence: 0.8 });
		actor.send({ type: "START_OPT_OUT" });
		actor.send({ type: "REMOVAL_FAILED", error: "Network error" });
		expect(actor.getSnapshot().value).toBe("removalFailed");

		actor.send({ type: "RETRY" });
		expect(actor.getSnapshot().value).toBe("optOutStarted");

		actor.stop();
	});

	test("handles re-appearance after confirmed removal", () => {
		const actor = createTestActor();
		actor.start();

		actor.send({ type: "SCAN" });
		actor.send({ type: "MATCH_FOUND", profileUrl: "http://test.com", confidence: 0.8 });
		actor.send({ type: "START_OPT_OUT" });
		actor.send({ type: "OPT_OUT_SUBMITTED" });
		actor.send({ type: "CONFIRMATION_RECEIVED" });
		actor.send({ type: "CONFIRMATION_RECEIVED" });
		expect(actor.getSnapshot().value).toBe("removalConfirmed");

		actor.send({ type: "RE_APPEARED" });
		expect(actor.getSnapshot().value).toBe("reAppeared");

		actor.stop();
	});

	test("stateToStatus maps correctly", () => {
		expect(stateToStatus("discovered")).toBe("discovered");
		expect(stateToStatus("optOutSubmitted")).toBe("opt_out_submitted");
		expect(stateToStatus("removalConfirmed")).toBe("removal_confirmed");
		expect(stateToStatus("notFound")).toBe("not_found");
	});
});
