/**
 * Curated seed list of known data brokers.
 * Replaces fragile Google search scraping with a reliable, categorized list.
 * Includes all brokers that already have YAML playbooks.
 */

import type { BrokerCategory } from "../types/index.js";

export interface SeedBroker {
	domain: string;
	name: string;
	category: BrokerCategory;
}

const SEED_BROKERS: SeedBroker[] = [
	// ─── People Search ───────────────────────────────────────────────────
	{ domain: "spokeo.com", name: "Spokeo", category: "people_search" },
	{ domain: "beenverified.com", name: "BeenVerified", category: "people_search" },
	{ domain: "whitepages.com", name: "Whitepages", category: "people_search" },
	{ domain: "truepeoplesearch.com", name: "TruePeopleSearch", category: "people_search" },
	{ domain: "fastpeoplesearch.com", name: "FastPeopleSearch", category: "people_search" },
	{ domain: "peoplefinders.com", name: "PeopleFinders", category: "people_search" },
	{ domain: "intelius.com", name: "Intelius", category: "people_search" },
	{ domain: "thatsthem.com", name: "ThatsThem", category: "people_search" },
	{ domain: "radaris.com", name: "Radaris", category: "people_search" },
	{ domain: "usphonebook.com", name: "USPhonebook", category: "people_search" },
	{ domain: "zabasearch.com", name: "ZabaSearch", category: "people_search" },
	{ domain: "nuwber.com", name: "Nuwber", category: "people_search" },
	{ domain: "addresses.com", name: "Addresses.com", category: "people_search" },
	{ domain: "411.com", name: "411.com", category: "people_search" },
	{ domain: "anywho.com", name: "AnyWho", category: "people_search" },
	{ domain: "clustrmaps.com", name: "ClustrMaps", category: "people_search" },
	{ domain: "cyberbackgroundchecks.com", name: "CyberBackgroundChecks", category: "people_search" },
	{ domain: "smartbackgroundchecks.com", name: "SmartBackgroundChecks", category: "people_search" },
	{ domain: "publicrecordsnow.com", name: "PublicRecordsNow", category: "people_search" },
	{ domain: "searchpeoplefree.com", name: "SearchPeopleFree", category: "people_search" },

	// ─── Background Check ────────────────────────────────────────────────
	{ domain: "checkpeople.com", name: "CheckPeople", category: "background_check" },
	{ domain: "instantcheckmate.com", name: "Instant Checkmate", category: "background_check" },
	{ domain: "truthfinder.com", name: "TruthFinder", category: "background_check" },
	{ domain: "backgroundchecks.org", name: "BackgroundChecks.org", category: "background_check" },
	{ domain: "cocofinder.com", name: "CocoFinder", category: "background_check" },
	{ domain: "ussearch.com", name: "US Search", category: "background_check" },
	{ domain: "checksecrets.com", name: "CheckSecrets", category: "background_check" },

	// ─── Marketing / Data Aggregator ─────────────────────────────────────
	{ domain: "acxiom.com", name: "Acxiom", category: "marketing" },
	{ domain: "epsilon.com", name: "Epsilon", category: "marketing" },
	{ domain: "oracle.com/cx/advertising", name: "Oracle Data Cloud", category: "marketing" },
	{ domain: "lotame.com", name: "Lotame", category: "marketing" },
	{ domain: "lob.com", name: "Lob", category: "marketing" },
	{ domain: "tapad.com", name: "Tapad", category: "marketing" },
	{ domain: "kochava.com", name: "Kochava", category: "marketing" },

	// ─── Data Aggregator ─────────────────────────────────────────────────
	{ domain: "lexisnexis.com", name: "LexisNexis", category: "data_aggregator" },
	{ domain: "thomsonreuters.com", name: "Thomson Reuters", category: "data_aggregator" },
	{ domain: "equifax.com", name: "Equifax", category: "data_aggregator" },
	{ domain: "experian.com", name: "Experian", category: "data_aggregator" },
	{ domain: "transunion.com", name: "TransUnion", category: "data_aggregator" },
	{ domain: "verisk.com", name: "Verisk", category: "data_aggregator" },
	{ domain: "corelogic.com", name: "CoreLogic", category: "data_aggregator" },
	{ domain: "dataxltd.com", name: "DataX", category: "data_aggregator" },

	// ─── Social Media / People Intelligence ──────────────────────────────
	{ domain: "pipl.com", name: "Pipl", category: "social_media" },
	{ domain: "socialcatfish.com", name: "Social Catfish", category: "social_media" },
	{ domain: "peekyou.com", name: "PeekYou", category: "social_media" },
	{ domain: "lullar.com", name: "Lullar", category: "social_media" },

	// ─── Public Records ──────────────────────────────────────────────────
	{ domain: "publicrecords.searchsystems.net", name: "SearchSystems", category: "public_records" },
	{ domain: "judyrecords.com", name: "Judy Records", category: "public_records" },
	{ domain: "courtlistener.com", name: "CourtListener", category: "public_records" },
	{ domain: "propertyshark.com", name: "PropertyShark", category: "public_records" },
	{ domain: "blockshopper.com", name: "BlockShopper", category: "public_records" },
];

/**
 * Get seed brokers filtered by category.
 * @param category - Broker category to filter by
 * @param limit - Maximum number of results (default: all)
 */
export function getSeedBrokers(category: BrokerCategory, limit?: number): SeedBroker[] {
	const filtered = SEED_BROKERS.filter((b) => b.category === category);
	return limit ? filtered.slice(0, limit) : filtered;
}

/**
 * Get all seed brokers across all categories.
 */
export function getAllSeedBrokers(): SeedBroker[] {
	return [...SEED_BROKERS];
}
