/** Email system types */

export type EmailTemplateType = "ccpa_delete" | "gdpr_delete" | "generic_optout" | "followup";

export interface EmailMessage {
	id: string;
	to: string;
	from: string;
	subject: string;
	htmlBody: string;
	textBody: string;
	templateType: EmailTemplateType;
	brokerId: string;
	profileId: string;
	sentAt?: string;
	status: EmailStatus;
}

export type EmailStatus = "draft" | "queued" | "sent" | "delivered" | "bounced" | "failed";

export interface EmailTemplateData {
	recipientName: string;
	recipientEmail: string;
	senderName: string;
	senderEmail: string;
	brokerName: string;
	brokerDomain: string;
	profileUrl?: string;
	/** Fields to request deletion of */
	piiFields: string[];
	/** Legal reference text */
	legalReference: string;
	/** Deadline date for compliance */
	deadline: string;
	/** Unique request ID for tracking */
	requestId: string;
}

export interface InboxMessage {
	uid: number;
	from: string;
	to: string;
	subject: string;
	body: string;
	date: string;
	/** Whether this message has been processed */
	processed: boolean;
}

export type ResponseClassification =
	| "confirmation"
	| "denial"
	| "verification_needed"
	| "additional_info_needed"
	| "auto_reply"
	| "unrelated"
	| "unknown";

export interface ClassifiedResponse {
	messageUid: number;
	brokerId: string;
	classification: ResponseClassification;
	confidence: number;
	summary: string;
	actionRequired?: string;
}
