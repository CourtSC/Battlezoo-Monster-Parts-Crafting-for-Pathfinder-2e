class MonsterParts {
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
		IMBUEMENTDATA: `modules/${MonsterParts.ID}/data/imbuements.json`,
		REFINEMENTLEVELDATA: `modules/${MonsterParts.ID}/data/refinementLevels.json`,
		SKILLDATA: `modules/${MonsterParts.ID}/data/skills.json`,
		RULES: `modules/${MonsterParts.ID}/data/rules`,
	};

	static RULES = {
		FLATMODIFIER: `${MonsterParts.DATA.RULES}/flatModifier.json`,
		MIGHTDAMAGEDICE: `${MonsterParts.DATA.RULES}/mightDamageDice.json`,
		MIGHTFLATMODIFIER: `${MonsterParts.DATA.RULES}/mightFlatModifier.json`,
		MIGHTNOTE: `${MonsterParts.DATA.RULES}/mightResistanceNote.json`,
		MIGHTPERSISTENT: `${MonsterParts.DATA.RULES}/mightPersistentDamage.json`,
		MIGHTWEAKNESSNOTE: `${MonsterParts.DATA.RULES}/mightWeaknessNote.json`,
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
		const itemImbuements = await this.getImbuements(itemSheet.object);
		const imbuementData = await foundry.utils.fetchJsonWithTimeout(
			MonsterParts.DATA.IMBUEMENTDATA
		);

		const skillOptions = await foundry.utils.fetchJsonWithTimeout(
			MonsterParts.DATA.SKILLDATA
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
			MonsterParts.TEMPLATES.MonsterPartsBody,
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

		MonsterParts.log(false, 'renderMonsterPartsTab', ' | ', {
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
		if (!itemSheet.flags.hasOwnProperty(MonsterParts.ID)) {
			// scope does not exist
			return MonsterParts.initializeItem(itemSheet);
		} else if (
			!MonsterParts.getMonsterPartsFlags(itemSheet).hasOwnProperty(
				MonsterParts.FLAGS.INIT
			) ||
			!MonsterParts.getMonsterPartsFlags(itemSheet)[MonsterParts.FLAGS.INIT]
		) {
			// property does not exist or item has not been initialized
			return MonsterParts.initializeItem(itemSheet);
		} else {
			return itemSheet;
		}
	}

	static async initializeItem(itemSheet) {
		const imbuements = this.initializeImbuements(itemSheet);
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

	static initializeImbuements(itemSheet) {
		const itemType = itemSheet.type;
		const itemID = itemSheet._id;
		const actorID = itemSheet.parent._id;
		switch (itemType) {
			case 'weapon':
			case 'armor':
				const imbuements = {};
				for (let i = 0; i < 3; i++) {
					const imbuementID = foundry.utils.randomID(16);
					imbuements[imbuementID] = {
						id: imbuementID,
						name: 'New Imbuement',
						imbuedProperty: '',
						imbuedPath: '',
						itemID,
						actorID,
						imbuedValue: 0,
						render: false,
						diceNumber: 0,
						dieSize: '',
						imbuementLevel: 0,
					};
				}
				this.log(false, 'Weapon/Armor Imbuements Initialized | ', {
					imbuements,
					itemSheet,
				});
				return imbuements;
				break; // Don't want to forget to add break if I change how this function returns.
			case 'equipment':
				const imbuementID = foundry.utils.randomID(16);
				const imbuement = {
					[imbuementID]: {
						id: imbuementID,
						name: 'New Imbuement',
						imbuedProperty: '',
						imbuedPath: '',
						itemID,
						actorID,
						imbuedValue: 0,
						render: false,
						imbuementLevel: 0,
					},
				};

				this.log(false, 'Equipment Imbuements Initialized | ', {
					imbuement,
					itemSheet,
				});

				return imbuement;
				break; // Don't want to forget to add break if I change how this function returns.
		}
	}

	static getImbuements(itemSheet) {
		return itemSheet.flags[this.ID]?.[this.FLAGS.IMBUEMENTS];
	}

	static async updateItemLevel(itemSheet, itemValue) {
		const levelData = await this.fetchJsonWithTimeout(
			MonsterParts.DATA.REFINEMENTLEVELDATA
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

		MonsterParts.log(false, 'updateItemLevel | ', {
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
						MonsterParts.RULES.FLATMODIFIER
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
			const imbuements = this.getImbuements(itemSheet);
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

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
	registerPackageDebugFlag(MonsterParts.ID);
});

Hooks.on('createItem', async (itemSheet) => {
	MonsterParts.initializeItem(itemSheet);
});

Hooks.on('updateActor', (characterSheet) => {
	const actorID = characterSheet._id;

	for (let idx in characterSheet.items._source) {
		const item = characterSheet.items._source[idx];
		const itemType = item.type;
		console.log(item);

		if (item.flags.hasOwnProperty(MonsterParts.ID)) {
			if (item.flags[MonsterParts.ID][MonsterParts.FLAGS.REFINEMENT].refined) {
				MonsterParts.log(false, 'updateActor | ', {
					characterSheet,
					inventory: characterSheet.items._source,
					actorID,
					item,
					itemType,
				});

				const itemSheet = game.actors.get(actorID).items.get(item._id);

				MonsterParts.updateItem(
					itemSheet,
					{ itemValue: itemSheet.system.price.value.gp },
					{},
					{ actorLevelChanged: true, system: {}, flags: {} }
				);
			}
		}
	}
});

Hooks.on('renderItemSheet', async (itemSheet, html) => {
	await MonsterParts.checkForInit(itemSheet.object);
	const itemType = itemSheet.object.type;
	const itemID = itemSheet.object._id;
	const actorID = itemSheet.object.parent._id;
	await MonsterParts.renderMonsterPartsTab(html, itemSheet);

	MonsterParts.log(false, 'renderItemSheet', ' | ', {
		itemSheet,
		html,
		itemType,
		itemID,
		actorID,
	});

	// Change the Refinement Path for an Equipment item
	html.on('change', '.monster-parts-refinement-property', async (event) => {
		const imbuements = MonsterParts.getImbuements(itemSheet.object);
		const selectedOption =
			event.currentTarget.selectedOptions[0].attributes[0].value;
		const updatePackage = {
			system: { usage: { type: 'worn', value: 'worn' } },
			flags: {},
		};

		if (selectedOption === 'skill') {
			MonsterParts.log(false, 'Selected Option | ', { selectedOption });
			updatePackage.refinement = {
				refinementProperties: {
					refinementType: 'skillItem',
					refinementName: 'skill',
					refinementSkill: '',
				},
			};
			for (let imbuementID in imbuements) {
				imbuements[imbuementID].name = 'New Imbuement';
				imbuements[imbuementID].imbuedProperty = '';
			}
			updatePackage.imbuements = imbuements;

			MonsterParts.log(false, 'Skill Item updated | ', {
				imbuements,
				updatePackage,
				itemSheet,
				selectedOption,
			});

			await MonsterParts.updateItem(
				itemSheet.object,
				updatePackage.refinement,
				updatePackage.imbuements,
				{ system: updatePackage.system, flags: updatePackage.flags }
			);
		} else {
			MonsterParts.log(false, 'Selected Option | ', { selectedOption });
			updatePackage.refinement = {
				refinementProperties: {
					refinementType: 'perceptionItem',
					refinementName: 'perception',
					refinementSkill: 'perception',
				},
			};

			// There should only ever be 1 imbuement on an equipment item
			for (let imbuementID in imbuements) {
				// Sensory is the only Perception Item imbuement option
				imbuements[imbuementID].imbuedProperty = 'Sensory';
				imbuements[imbuementID].name = 'Sensory';
			}
			updatePackage.imbuements = imbuements;

			MonsterParts.log(false, 'Perception Item updated | ', {
				imbuements,
				updatePackage,
				itemSheet,
				selectedOption,
			});

			await MonsterParts.updateItem(
				itemSheet.object,
				updatePackage.refinement,
				updatePackage.imbuements,
				{ system: updatePackage.system, flags: updatePackage.flags }
			);
		}
		event.stopPropagation();
	});

	// Change the skill on a skill item.
	html.on('change', '.monster-parts-skill', async (event) => {
		const imbuements = MonsterParts.getImbuements(itemSheet.object);
		const skill = event.currentTarget.selectedOptions[0].attributes[0].value;

		for (let imbuementID in imbuements) {
			imbuements[imbuementID].name = 'New Imbuement';
			imbuements[imbuementID].imbuedProperty = '';
		}

		MonsterParts.updateItem(
			itemSheet.object,
			{
				refinementProperties: {
					refinementType: 'skillItem',
					refinementName: 'skill',
					refinementSkill: skill,
				},
			},
			imbuements,
			{ system: {}, flags: {} }
		);

		MonsterParts.log(false, '.monster-parts-skill changed | ', {
			skill,
		});

		event.stopPropagation();
	});

	// Change the Imbuement Property
	html.on('change', '.monster-parts-property', async (event) => {
		const imbuements = MonsterParts.getImbuements(itemSheet.object);
		const currentTarget = event.currentTarget;
		const selectedOption = currentTarget.selectedOptions[0].attributes[0].value;
		const imbuementID = currentTarget.getAttribute('data-imbuement-id');
		imbuements[
			imbuementID
		].name = `${selectedOption} ${imbuements[imbuementID].imbuedPath}`;
		imbuements[imbuementID].imbuedProperty = selectedOption;

		MonsterParts.updateItem(itemSheet.object, {}, imbuements, {
			system: {},
			flags: {},
		});

		MonsterParts.log(false, '.monster-parts-property changed | ', {
			event,
			currentTarget,
			selectedOption,
			imbuementID,
			imbuements,
		});
		event.stopPropagation();
	});

	// Change the Imbuement Path
	html.on('change', '.monster-parts-path', async (event) => {
		const updatePackage = {
			refinementData: {},
			system: {},
			flags: {},
		};
		const imbuements = MonsterParts.getImbuements(itemSheet.object);
		const currentTarget = event.currentTarget;
		const selectedOption = currentTarget.selectedOptions[0].attributes[0].value;
		const imbuementID = currentTarget.getAttribute('data-imbuement-id');
		imbuements[
			imbuementID
		].name = `${imbuements[imbuementID].imbuedProperty} ${selectedOption}`;
		imbuements[imbuementID].imbuedPath = selectedOption;

		switch (selectedOption) {
			case 'Might':
				const damageDice = await MonsterParts.fetchJsonWithTimeout(
					MonsterParts.RULES.MIGHTDAMAGEDICE
				);
				damageDice.label = `{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.name}`;
				damageDice.damageType =
					`{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.imbuedProperty}`.toLowerCase();
				damageDice.value.field = `item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.imbuementLevel`;
				damageDice.predicate = [
					{
						gte: [
							`{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.imbuementLevel}`,
							6,
						],
					},
				];

				const flatModifier = await MonsterParts.fetchJsonWithTimeout(
					MonsterParts.RULES.MIGHTFLATMODIFIER
				);
				flatModifier.label = `{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.name}`;
				flatModifier.damageType =
					`{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.imbuedProperty}`.toLowerCase();
				flatModifier.value.field = `item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.imbuementLevel`;
				flatModifier.predicate = [
					{
						gte: [
							`{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.imbuementLevel}`,
							4,
						],
					},
					{
						lte: [
							`{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.imbuementLevel}`,
							5,
						],
					},
				];

				const resistanceNote = await MonsterParts.fetchJsonWithTimeout(
					MonsterParts.RULES.MIGHTNOTE
				);
				resistanceNote.title = `{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.name}`;
				resistanceNote.predicate = [
					{
						gte: [
							`{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.imbuementLevel}`,
							12,
						],
					},
				];
				resistanceNote.text = `The ${imbuements[imbuementID].imbuedProperty} damage dealt by this imbued property (including persistent ${imbuements[imbuementID].imbuedProperty} damage) ignores resistances`;

				const persistent = await MonsterParts.fetchJsonWithTimeout(
					MonsterParts.RULES.MIGHTPERSISTENT
				);
				persistent.label = `{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.name} Critical`;
				persistent.damageType =
					`{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.imbuedProperty}`.toLowerCase();
				persistent.value.field = `item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.imbuementLevel`;

				const weaknessNote = await MonsterParts.fetchJsonWithTimeout(
					MonsterParts.RULES.MIGHTNOTE
				);
				weaknessNote.title = `{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.name}`;
				weaknessNote.predicate = [
					{
						gte: [
							`{item|flags.${MonsterParts.ID}.imbuements.${imbuementID}.imbuementLevel}`,
							20,
						],
					},
				];
				weaknessNote.text = `On a successful Strike with this weapon, before applying ${imbuements[imbuementID].imbuedProperty} damage, the target gains weakness 1 to ${imbuements[imbuementID].imbuedProperty} until the beginning of your next turn.`;
		}

		MonsterParts.updateItem(
			itemSheet.object,
			updatePackage.refinementData,
			imbuements,
			{
				system: updatePackage.system,
				flags: updatePackage.flags,
			}
		);

		MonsterParts.log(false, '.monster-parts-property changed | ', {
			event,
			currentTarget,
			selectedOption,
			imbuementID,
			imbuements,
		});
		event.stopPropagation();
	});

	// Click on + button
	html.on('click', '.add-gold-button', (event) => {
		const imbuements = MonsterParts.getImbuements(itemSheet.object);
		const clickedElement = event.currentTarget;
		const action = clickedElement.dataset.action;
		const changeValue = Number(clickedElement.previousElementSibling.value);

		MonsterParts.log(false, 'add-gold-button clicked | ', {
			event,
			actorID,
			itemID,
			changeValue,
			action,
			itemSheet,
		});

		if (Number.isInteger(changeValue) && changeValue > 0) {
			// Valid input.
			switch (action) {
				case 'refine-add-gold':
					const currValue = itemSheet.object.system.price.value.gp;
					const itemValue = currValue + changeValue;
					// Update the item.
					MonsterParts.updateItem(
						itemSheet.object,
						{ itemValue },
						{},
						{
							system: { specific: { material: {}, runes: {} } },
							flags: { [MonsterParts.FLAGS.REFINED]: true },
						}
					);
					event.stopPropagation();
					break;

				case 'imbue-add-gold':
					const imbuementID = clickedElement.getAttribute('data-imbuement-id');
					imbuements[imbuementID].imbuedValue =
						imbuements[imbuementID].imbuedValue + changeValue;
					MonsterParts.updateItem(itemSheet.object, {}, imbuements, {
						system: { specific: { material: {}, runes: {} } },
						flags: {},
					});
					event.stopPropagation();
					break;
			}
		} else if (!Number.isInteger(changeValue)) {
			// Input is not an integer.
			MonsterParts.log(false, 'Add Gold | ', { changeValue });
			ui.notifications.error(
				'Cannot add decimal gold values. Please enter a whole number integer.'
			);
			event.stopPropagation();
			return;
		} else if (changeValue < 0) {
			// Input is less than 0
			ui.notifications.error(
				'Cannot add negative gold values. Please enter a whole number integer.'
			);
			event.stopPropagation();
			return;
		} else if (isNaN(changeValue)) {
			// Input is not a number.
			ui.notifications.error(
				'Cannot add non-number gold values. Please enter a whole number integer.'
			);
			event.stopPropagation();
			return;
		}
		event.stopPropagation();
	});

	// Click on - button
	html.on('click', '.subtract-gold-button', (event) => {
		const imbuements = MonsterParts.getImbuements(itemSheet.object);
		const clickedElement = event.currentTarget;
		const action = clickedElement.dataset.action;
		const changeValue = Number(
			clickedElement.previousElementSibling.previousElementSibling.value
		);

		MonsterParts.log(false, 'Subtract Gold Button Clicked | ', {
			event,
			actorID,
			itemID,
			changeValue,
			action,
		});

		if (Number.isInteger(changeValue) && changeValue > 0) {
			// Valid input.
			switch (action) {
				case 'refine-subtract-gold':
					const currValue = itemSheet.object.system.price.value.gp;
					const itemValue = currValue - changeValue;
					// Update the item's value.
					if (itemValue > 0) {
						MonsterParts.updateItem(
							itemSheet.object,
							{ itemValue },
							{},
							{
								system: { specific: { material: {}, runes: {} } },
								flags: { [MonsterParts.FLAGS.REFINED]: true },
							}
						);
						event.stopPropagation();
						break;
					} else {
						MonsterParts.updateItem(
							itemSheet.object,
							{ itemValue: 0 },
							{},
							{
								system: { specific: {} },
								flags: { [MonsterParts.FLAGS.REFINED]: false },
							}
						);
						event.stopPropagation();
						break;
					}

				case 'imbue-subtract-gold':
					const imbuementID = clickedElement.getAttribute('data-imbuement-id');
					imbuements[imbuementID].imbuedValue =
						imbuements[imbuementID].imbuedValue - changeValue;
					if (imbuements[imbuementID].imbuedValue - changeValue > 0) {
						MonsterParts.updateItem(itemSheet.object, {}, imbuements, {
							system: {},
							flags: {},
						});
						event.stopPropagation();
						break;
					} else {
						imbuements[imbuementID].imbuedValue = 0;
						MonsterParts.updateItem(itemSheet.object, {}, imbuements, {
							system: {},
							flags: {},
						});
						event.stopPropagation();
						break;
					}
			}
		} else if (!Number.isInteger(changeValue)) {
			// Input is not an integer.
			MonsterParts.log(false, 'Subtract Gold | ', { changeValue });
			ui.notifications.error(
				'Cannot subtract decimal gold values. Please enter a whole number integer.'
			);
			event.stopPropagation();
			return;
		} else if (changeValue < 0) {
			// Input is less than 0
			ui.notifications.error(
				'Cannot subtract negative gold values. Please enter a whole number integer.'
			);
			event.stopPropagation();
			return;
		} else if (isNaN(changeValue)) {
			// Input is not a number.
			ui.notifications.error(
				'Cannot subtract non-number gold values. Please enter a whole number integer.'
			);
			event.stopPropagation();
			return;
		}
		event.stopPropagation();
	});
});
