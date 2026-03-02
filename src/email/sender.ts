import { createTransport, type Transporter } from "nodemailer";
import { getConfig } from "../config/index.js";
import type { EmailMessage } from "../types/index.js";

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
	if (!_transporter) {
		const config = getConfig();
		_transporter = createTransport({
			host: config.smtp.host,
			port: config.smtp.port,
			secure: config.smtp.secure,
			auth: {
				user: config.smtp.user,
				pass: config.smtp.pass,
			},
		});
	}
	return _transporter;
}

/**
 * Sends an email message via SMTP.
 */
export async function sendEmail(message: EmailMessage): Promise<{ messageId: string }> {
	const config = getConfig();
	const transporter = getTransporter();

	const result = await transporter.sendMail({
		from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
		to: message.to,
		subject: message.subject,
		text: message.textBody,
		html: message.htmlBody,
		headers: {
			"X-AI-Eraser-Request-ID": message.id,
			"X-AI-Eraser-Broker": message.brokerId,
		},
	});

	return { messageId: result.messageId };
}

/**
 * Verifies SMTP connection is working.
 */
export async function verifySmtpConnection(): Promise<boolean> {
	try {
		const transporter = getTransporter();
		await transporter.verify();
		return true;
	} catch {
		return false;
	}
}

/**
 * Resets the transporter (useful for testing or config changes).
 */
export function resetTransporter(): void {
	if (_transporter) {
		_transporter.close();
		_transporter = null;
	}
}
