/** Heuristic difficulty scoring for data broker opt-out processes. No AI calls. */

import type { BrokerDifficulty } from "../types/broker.js";
import type { DifficultySignals } from "../types/research.js";

interface DifficultyResult {
	score: number;
	difficulty: BrokerDifficulty;
}

/**
 * Computes a difficulty score from individual signals.
 *
 * | Signal                        | Points |
 * |-------------------------------|--------|
 * | Web form opt-out (baseline)   | 0      |
 * | Requires account creation     | +2     |
 * | Has CAPTCHA                   | +2     |
 * | Requires ID/document upload   | +3     |
 * | Requires postal mail          | +4     |
 * | Email-only opt-out            | +1     |
 * | Each extra verification step  | +1     |
 * | Estimated days > 30           | +1     |
 * | Estimated days > 60           | +2     |
 *
 * Thresholds: 0–2 = easy, 3–4 = medium, 5–7 = hard, 8+ = very_hard
 */
export function scoreDifficulty(signals: DifficultySignals): DifficultyResult {
	let score = 0;

	if (signals.requiresAccount) score += 2;
	if (signals.hasCaptcha) score += 2;
	if (signals.requiresIdUpload) score += 3;
	if (signals.requiresPostalMail) score += 4;
	if (signals.optOutMethod === "email") score += 1;
	if (signals.verificationSteps > 0) score += signals.verificationSteps;

	if (signals.estimatedDays !== null) {
		if (signals.estimatedDays > 60) {
			score += 2;
		} else if (signals.estimatedDays > 30) {
			score += 1;
		}
	}

	let difficulty: BrokerDifficulty;
	if (score <= 2) {
		difficulty = "easy";
	} else if (score <= 4) {
		difficulty = "medium";
	} else if (score <= 7) {
		difficulty = "hard";
	} else {
		difficulty = "very_hard";
	}

	return { score, difficulty };
}
