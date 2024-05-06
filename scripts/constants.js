export const ID = 'monster-parts-crafting';

export const FLAGS = {
	IMBUEMENTS: 'imbuements',
	REFINEMENT: 'refinement',
	INIT: 'itemInitialized',
	RULEAPPLIED: 'ruleApplied',
	REFINED: 'refined',
};

export const TEMPLATES = {
	MonsterPartsBody: `modules/${ID}/templates/monster-parts-body.hbs`,
	MonsterPartsTab: `modules/${ID}/templates/monster-parts-tab.hbs`,
};

export const DATA = {
	IMBUEMENTDATA: `modules/${ID}/data/imbuements.json`,
	REFINEMENTLEVELDATA: `modules/${ID}/data/refinementLevels.json`,
	IMBUEMENTLEVELDATA: `modules/${ID}/data/imbuementLevels.json`,
	SKILLDATA: `modules/${ID}/data/skills.json`,
	RULES: `modules/${ID}/data/rules`,
};

export const RULES = {
	FLATMODIFIER: `${DATA.RULES}/flatModifier.json`,
	MIGHTDAMAGEDICE: `${DATA.RULES}/mightDamageDice.json`,
	MIGHTFLATMODIFIER: `${DATA.RULES}/mightFlatModifier.json`,
	NOTE: `${DATA.RULES}/note.json`,
	MIGHTPERSISTENTDAMAGE: `${DATA.RULES}/mightPersistentDamage.json`,
	TECHNIQUEPERSISTENTFLATMODIFIER: `${DATA.RULES}/techniquePersistentFlatModifier.json`,
	TECHNIQUEFLATMODIFIER: `${DATA.RULES}/techniqueFlatModifier.json`,
	TECHNIQUEDAMAGEDICE: `${DATA.RULES}/techniqueDamageDice.json`,
	TECHNIQUECRITICALPERSISTENTDAMAGE: `${DATA.RULES}/techniqueCriticalPersistentDamage.json`,
};
