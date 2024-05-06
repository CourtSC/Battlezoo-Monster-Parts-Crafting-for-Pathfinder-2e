import { Imbuements } from './Imbuements.js';
import * as CONSTANTS from './constants.js';
import { logger } from './logger.js';
import * as helpers from './helpers.js';

export class MonsterParts {
	static async renderMonsterPartsTab(html, itemSheet) {
		const flags = itemSheet.object.flags[CONSTANTS.ID];
		const itemSheetTabs = html.find('[class="tabs"]');
		const monsterPartsBody = html.find('[class="sheet-body"]');
		const itemImbuements = await helpers.getImbuements(itemSheet.object);
		const imbuementData = await helpers.fetchJsonWithTimeout(
			CONSTANTS.DATA.IMBUEMENTDATA
		);

		const skillOptions = await helpers.fetchJsonWithTimeout(
			CONSTANTS.DATA.SKILLDATA
		);

		// Set the itemType booleans
		const isWeapon = itemSheet.object.type === 'weapon';
		const isEquipment = itemSheet.object.type === 'equipment';
		const isSkillItem =
			helpers.getRefinement(itemSheet.object).refinementProperties
				.refinementType === 'skillItem';

		// Render and inject the Monster Parts tab.
		const monsterPartsTab = await renderTemplate(
			CONSTANTS.TEMPLATES.MonsterPartsTab,
			{}
		);
		itemSheetTabs.append(monsterPartsTab);

		// Render and inject the sheet Body.
		const renderedTemplate = await renderTemplate(
			CONSTANTS.TEMPLATES.MonsterPartsBody,
			{
				imbuements: itemImbuements,
				itemSheet,
				imbuementData,
				isWeapon,
				isEquipment,
				isSkillItem,
				flags,
				skillOptions,
			}
		);

		logger(false, 'renderMonsterPartsTab', ' | ', {
			itemImbuements,
			itemSheetTabs,
			monsterPartsBody,
			renderedTemplate,
			itemSheet,
			flags,
			skillOptions,
		});

		monsterPartsBody.append(renderedTemplate);

		// Bind the current tab.
		function customCallback(event, tabs, active) {
			this._onChangeTab(event, tabs, active);
			tabs._activeCustom = active;
		}

		if (itemSheet._tabs[0].callback !== itemSheet._tabs[0]._customCallback) {
			// Bind `customCallback` with `this` being the app instance.
			const newCallback = customCallback.bind(itemSheet);
			itemSheet._tabs[0].callback = newCallback;
			itemSheet._tabs[0]._customCallback = newCallback;
		}

		// Set active tab to Monster Parts
		itemSheet._tabs[0].activate(itemSheet._tabs[0]._activeCustom);
	}

	static checkForInit(itemSheet) {
		// Check for itemInitialized key and init item if key doesn't exist or value is false
		if (!itemSheet.flags.hasOwnProperty(CONSTANTS.ID)) {
			// scope does not exist
			return this.initializeItem(itemSheet);
		} else if (
			!helpers
				.getMonsterPartsFlags(itemSheet)
				.hasOwnProperty(CONSTANTS.FLAGS.INIT) ||
			!helpers.getMonsterPartsFlags(itemSheet)[CONSTANTS.FLAGS.INIT]
		) {
			// property does not exist or item has not been initialized
			return this.initializeItem(itemSheet);
		} else {
			return itemSheet;
		}
	}

	static async initializeItem(itemSheet) {
		const imbuements = Imbuements.initializeImbuements(itemSheet);
		const updateData = {
			system: {},
			flags: {
				[CONSTANTS.FLAGS.INIT]: true,
				[CONSTANTS.FLAGS.RULEAPPLIED]: false,
				[CONSTANTS.FLAGS.REFINED]: false,
			},
		};
		const refinementData = {
			refinementProperties: {
				refinementType: '',
				refinementName: '',
				refinementSkill: '',
			},
		};

		if (itemSheet.type === 'equipment') {
			const flatModifier = await helpers.fetchJsonWithTimeout(
				CONSTANTS.RULES.FLATMODIFIER
			);
			flatModifier.selector = `{item|flags.${CONSTANTS.ID}.${CONSTANTS.FLAGS.REFINEMENT}.refinementProperties.refinementSkill}`;

			updateData.system.rules = [flatModifier];
			updateData.flags[CONSTANTS.FLAGS.RULEAPPLIED] = true;
		}
		logger(false, 'Item initialized | ', {
			itemSheet,
			imbuements,
			refinementData,
			updateData,
		});
		return this.updateItem(itemSheet, refinementData, imbuements, {
			system: updateData.system,
			flags: updateData.flags,
		});
	}

	static async updateItemLevel(itemSheet, itemValue) {
		const levelData = await helpers.fetchJsonWithTimeout(
			CONSTANTS.DATA.REFINEMENTLEVELDATA
		);
		const itemType = itemSheet.type;
		const actorID = itemSheet?.parent?._id;
		const itemLevel =
			Number(
				Object.keys(levelData[itemType]).find(
					(key) => levelData[itemType][key].threshold > itemValue
				) - 1
			) === 0
				? 0
				: Number(
						Object.keys(levelData[itemType]).find(
							(key) => levelData[itemType][key].threshold > itemValue
						) - 1
				  ) || 20;

		const actorLevel = actorID ? game.actors.get(actorID).level : 20;

		logger(false, 'updateItemLevel | ', {
			levelData,
			itemLevelData: levelData[itemType],
			itemLevel,
			itemType,
			itemValue,
			actorLevel,
		});

		return { itemLevel, actorLevel, levels: levelData[itemType] };
	}

	static async shieldProperties(itemSheet, levelData) {
		const sourceID = itemSheet.flags.core.sourceId;
		const sourceFields = sourceID.split('.');
		const compendiumName = `${sourceFields[1]}.${sourceFields[2]}`;
		const compendiumItemID = sourceFields.at(-1);
		const compendiumPack = game.packs.get(compendiumName);
		const compendiumItem = await compendiumPack.getDocument(compendiumItemID);

		const hardness = levelData.hardness || compendiumItem.system.hardness;
		const hp = levelData.hp || compendiumItem.system.hp.max;
		const brokenThreshold =
			levelData.brokenThreshold || compendiumItem.system.hp.brokenThreshold;

		return { hardness, hp, brokenThreshold };
	}

	static async itemProperties(itemSheet, itemLevel, levelData) {
		const itemType = itemSheet.type;
		const updatePackage = { system: {}, flags: {} };

		switch (itemType) {
			case 'weapon':
				updatePackage.system.runes = {
					potency: levelData.potency,
					striking: levelData.striking,
				};
				break;
			case 'armor':
				updatePackage.system.runes = {
					potency: levelData.potency,
					resilient: levelData.resilient,
				};
				break;
			case 'equipment':
				const ruleApplied =
					helpers.getMonsterPartsFlags(itemSheet)[CONSTANTS.FLAGS.RULEAPPLIED];
				const refined =
					helpers.getMonsterPartsFlags(itemSheet)[CONSTANTS.FLAGS.REFINED];

				if (!refined) {
					updatePackage.flags[CONSTANTS.FLAGS.REFINED] = true;
					updatePackage.system.traits = { value: ['magical', 'invested'] };
				}

				if (!ruleApplied) {
					const flatModifier = await helpers.fetchJsonWithTimeout(
						CONSTANTS.RULES.FLATMODIFIER
					);
					// Rules UI stores selectors as arrays
					flatModifier.selector = `{item|flags.${CONSTANTS.ID}[${CONSTANTS.FLAGS.REFINEMENT}].refinementProperties.refinementSkill}`;

					updatePackage.system.rules = [flatModifier];
					updatePackage.system.usage = { type: 'worn', value: 'worn' };
					updatePackage.flags[CONSTANTS.FLAGS.RULEAPPLIED] = true;
				}
				logger(false, 'Equipment Item Properties | ', {
					updatePackage,
				});
				break;
			case 'shield':
				if (itemLevel < 3) {
					const shieldProperties = this.shieldProperties(itemSheet, levelData);
					updatePackage.system = {
						hardness: shieldProperties.hardness,
						hp: {
							max: shieldProperties.hp,
							brokenThreshold: shieldProperties.brokenThreshold,
						},
					};
				} else {
					updatePackage.system = {
						hardness: levelData.hardness,
						hp: {
							max: levelData.hp,
							brokenThreshold: levelData.brokenThreshold,
						},
					};
				}
				break;
		}
		return { system: updatePackage.system, flags: updatePackage.flags };
	}

	static async updateItem(
		itemSheet,
		refinementData,
		imbuementData,
		updateData
	) {
		// init the update packages
		const flags = {
			[CONSTANTS.ID]: {
				[CONSTANTS.FLAGS.REFINEMENT]: refinementData,
				[CONSTANTS.FLAGS.IMBUEMENTS]: imbuementData,
			},
		};
		const system = updateData.system;

		// handle additional flags data
		if (updateData.flags) {
			for (let key in updateData.flags) {
				flags[CONSTANTS.ID][key] = updateData.flags[key];
				logger(false, 'Flag updated | ', {
					[key]: flags[CONSTANTS.ID][key],
				});
			}
		}

		// handle itemValue or actorLevel change
		if (refinementData.itemValue) {
			// calculate item level
			const levelData = await this.updateItemLevel(
				itemSheet,
				refinementData.itemValue
			);
			const itemLevel = levelData.itemLevel;
			const actorLevel = levelData.actorLevel;
			const lowerLevel = Math.min(itemLevel, actorLevel);
			const numImbuements = levelData.levels[lowerLevel].numImbuements;
			const itemProperties = await this.itemProperties(
				itemSheet,
				lowerLevel,
				levelData.levels[lowerLevel]
			);

			// Package the XP value for the next level with the flags.
			const nextLevelThreshold =
				lowerLevel + 1 <= 20 ? levelData.levels[lowerLevel + 1].threshold : 0;
			flags[CONSTANTS.ID][CONSTANTS.FLAGS.REFINEMENT].nextLevel =
				nextLevelThreshold;

			// reset the render property of imbuements for cases where the item's level is reduced after an update
			const imbuements = helpers.getImbuements(itemSheet);
			for (let imbuementID in imbuements) {
				imbuements[imbuementID].render = false;
			}

			// update render property of imbuements
			const imbuementIDs = Object.keys(imbuements);
			for (let i = 0; i < numImbuements; i++) {
				imbuements[imbuementIDs[i]].render = true;
			}
			// package updated imbuements
			flags[CONSTANTS.ID][CONSTANTS.FLAGS.IMBUEMENTS] = imbuements;

			// Handle system updates passed from itemProperties
			for (let key in itemProperties.system) {
				system[key] = itemProperties.system[key];
			}

			// handle flag updates passed from itemProperties
			for (let key in itemProperties.flags) {
				flags[CONSTANTS.ID][key] = itemProperties.flags[key];
			}

			// handle system updates passed from updateData
			for (let key in updateData.system) {
				system[key] = updateData.system[key];
			}

			// package the system update
			system.price = { value: { gp: refinementData.itemValue } };
			system.level = { value: lowerLevel };
			// package the flags update
			for (let key in levelData.levels[lowerLevel]) {
				flags[CONSTANTS.ID][CONSTANTS.FLAGS.REFINEMENT][key] =
					levelData.levels[lowerLevel][key];
			}
		}

		// Handle refinementProperties change
		if (refinementData.refinementProperties) {
			flags[CONSTANTS.ID][CONSTANTS.FLAGS.REFINEMENT].refinementProperties =
				refinementData.refinementProperties;

			if (updateData.system.rules) {
				system.rules = updateData.system.rules;
			}
			if (updateData.system.usage) {
				system.usage = updateData.system.usage;
			}
		}

		logger(false, 'Updating Item | ', {
			flags,
			system,
			updateData,
			refinementData,
			imbuementData,
			itemSheet,
		});

		// update the item sheet
		return await itemSheet.update({
			flags,
			system,
		});
	}
}
