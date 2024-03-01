export class MonsterParts {
	static ID = 'monster-parts-crafting';

	static FLAGS = {
		IMBUEMENTS: 'imbuements',
		REFINEMENT: 'refinement',
		INIT: 'itemInitialized',
		RULEAPPLIED: 'ruleApplied',
		REFINED: 'refined',
	};

	static TEMPLATES = {
		WeaponImbuedPropertiesSheet: `modules/${this.ID}/templates/weapon-imbued-properties-sheet.hbs`,
		ImbuedPropertiesSheet: `modules/${this.ID}/templates/imbued-properties-sheet.hbs`,
		MonsterPartsBody: `modules/${this.ID}/templates/monster-parts-body.hbs`,
		MonsterPartsTab: `modules/${this.ID}/templates/monster-parts-tab.hbs`,
	};

	static DATA = {
		IMBUEMENTDATA: `modules/${this.ID}/data/imbuements.json`,
		REFINEMENTLEVELDATA: `modules/${this.ID}/data/refinementLevels.json`,
		SKILLDATA: `modules/${this.ID}/data/skills.json`,
		RULES: `modules/${this.ID}/data/rules`,
	};

	static RULES = {
		FLATMODIFIER: `${this.DATA.RULES}/flatModifier.json`,
		MIGHTDAMAGEDICE: `${this.DATA.RULES}/mightDamageDice.json`,
		MIGHTFLATMODIFIER: `${this.DATA.RULES}/mightFlatModifier.json`,
		MIGHTNOTE: `${this.DATA.RULES}/mightNote.json`,
		MIGHTPERSISTENT: `${this.DATA.RULES}/mightPersistentDamage.json`,
	};

	static log(force, ...args) {
		const shouldLog =
			force ||
			game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

		if (shouldLog) {
			console.log(this.ID, '|', ...args);
		}
	}

	static async renderMonsterPartsTab(html, itemSheet) {
		const flags = itemSheet.object.flags[this.ID];
		const itemSheetTabs = html.find('[class="tabs"]');
		const monsterPartsBody = html.find('[class="sheet-body"]');
		const itemImbuements = await Imbuements.getImbuements(itemSheet.object);
		const imbuementData = await foundry.utils.fetchJsonWithTimeout(
			this.DATA.IMBUEMENTDATA
		);

		const skillOptions = await foundry.utils.fetchJsonWithTimeout(
			this.DATA.SKILLDATA
		);

		// Set the itemType booleans
		const isWeapon = itemSheet.object.type === 'weapon';
		const isEquipment = itemSheet.object.type === 'equipment';
		const isSkillItem =
			this.getMonsterPartsFlags(itemSheet.object)[this.FLAGS.REFINEMENT]
				.refinementProperties.refinementType === 'skillItem';
		const monsterPartsTab = await renderTemplate(
			this.TEMPLATES.MonsterPartsTab,
			{}
		);

		// Inject Imbuements tab.
		itemSheetTabs.append(monsterPartsTab);

		// Render and inject the sheet Body.
		const renderedTemplate = await renderTemplate(
			this.TEMPLATES.MonsterPartsBody,
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

		this.log(false, 'renderMonsterPartsTab', ' | ', {
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

	static async fetchJsonWithTimeout(path) {
		return await foundry.utils.fetchJsonWithTimeout(path);
	}

	static getMonsterPartsFlags(itemSheet) {
		return itemSheet.flags[this.ID];
	}

	static checkForInit(itemSheet) {
		// Check for itemInitialized key and init item if key doesn't exist or value is false
		if (!itemSheet.flags.hasOwnProperty(this.ID)) {
			// scope does not exist
			return this.initializeItem(itemSheet);
		} else if (
			!this.getMonsterPartsFlags(itemSheet).hasOwnProperty(this.FLAGS.INIT) ||
			!this.getMonsterPartsFlags(itemSheet)[this.FLAGS.INIT]
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
				[this.FLAGS.INIT]: true,
				[this.FLAGS.RULEAPPLIED]: false,
				[this.FLAGS.REFINED]: false,
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
			const flatModifier = await this.fetchJsonWithTimeout(
				this.RULES.FLATMODIFIER
			);
			flatModifier.selector = `{item|flags.${this.ID}.${this.FLAGS.REFINEMENT}.refinementProperties.refinementSkill}`;

			updateData.system.rules = [flatModifier];
			updateData.flags[this.FLAGS.RULEAPPLIED] = true;
		}
		this.log(false, 'Item initialized | ', {
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
		const levelData = await this.fetchJsonWithTimeout(
			this.DATA.REFINEMENTLEVELDATA
		);
		const itemType = itemSheet.type;
		const actorID = itemSheet.parent._id;
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

		const actorLevel = game.actors.get(actorID).level;

		this.log(false, 'updateItemLevel | ', {
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
					this.getMonsterPartsFlags(itemSheet)[this.FLAGS.RULEAPPLIED];
				const refined =
					this.getMonsterPartsFlags(itemSheet)[this.FLAGS.REFINED];

				if (!refined) {
					updatePackage.flags[this.FLAGS.REFINED] = true;
					updatePackage.system.traits = { value: ['magical', 'invested'] };
				}

				if (!ruleApplied) {
					const flatModifier = await this.fetchJsonWithTimeout(
						this.RULES.FLATMODIFIER
					);
					// Rules UI stores selectors as arrays
					flatModifier.selector = `{item|flags.${this.ID}[${this.FLAGS.REFINEMENT}].refinementProperties.refinementSkill}`;

					updatePackage.system.rules = [flatModifier];
					updatePackage.system.usage = { type: 'worn', value: 'worn' };
					updatePackage.flags[this.FLAGS.RULEAPPLIED] = true;
				}
				this.log(false, 'Equipment Item Properties | ', {
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
			[this.ID]: {
				[this.FLAGS.REFINEMENT]: refinementData,
				[this.FLAGS.IMBUEMENTS]: imbuementData,
			},
		};
		const system = updateData.system;

		// handle additional flags data
		if (updateData.flags) {
			for (let key in updateData.flags) {
				flags[this.ID][key] = updateData.flags[key];
				this.log(false, 'Flag updated | ', {
					[key]: flags[this.ID][key],
				});
			}
		}

		// handle itemValue or actorLevel change
		const itemValueChanged = refinementData.hasOwnProperty('itemValue');
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

			// reset the render property of imbuements for cases where the item's level is reduced after an update
			const imbuements = Imbuements.getImbuements(itemSheet);
			for (let imbuementID in imbuements) {
				imbuements[imbuementID].render = false;
			}

			// update render property of imbuements
			const imbuementIDs = Object.keys(imbuements);
			for (let i = 0; i < numImbuements; i++) {
				imbuements[imbuementIDs[i]].render = true;
			}
			// package updated imbuements
			flags[this.ID][this.FLAGS.IMBUEMENTS] = imbuements;

			// Handle system updates passed from itemProperties
			for (let key in itemProperties.system) {
				system[key] = itemProperties.system[key];
			}

			// handle flag updates passed from itemProperties
			for (let key in itemProperties.flags) {
				flags[this.ID][key] = itemProperties.flags[key];
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
				flags[this.ID][this.FLAGS.REFINEMENT][key] =
					levelData.levels[lowerLevel][key];
			}
		}

		// Handle refinementProperties change
		const refinementPropertiesChange = refinementData.hasOwnProperty(
			'refinementProperties'
		);
		if (refinementData.refinementProperties) {
			flags[this.ID][this.FLAGS.REFINEMENT].refinementProperties =
				refinementData.refinementProperties;

			if (updateData.system.rules) {
				system.rules = updateData.system.rules;
			}
			if (updateData.system.usage) {
				system.usage = updateData.system.usage;
			}
		}

		this.log(false, 'Updating Item | ', {
			flags,
			system,
			updateData,
			refinementData,
			imbuementData,
			itemSheet,
			refinementPropertiesChange,
			itemValueChanged,
		});

		// update the item sheet
		return await itemSheet.update({
			flags,
			system,
		});
	}
}
