export {
	analyzeForm,
	analyzeSearchResults,
	type FormFieldMapping,
	type FormAnalysisResult,
	type SearchAnalysisResult,
} from "./form-analyzer.js";

export { classifyResponse, generateLegalRequest } from "./response-parser.js";

export {
	FORM_ANALYZER_SYSTEM,
	RESPONSE_CLASSIFIER_SYSTEM,
	SEARCH_RESULT_ANALYZER_SYSTEM,
	LEGAL_REQUEST_SYSTEM,
} from "./prompts.js";
