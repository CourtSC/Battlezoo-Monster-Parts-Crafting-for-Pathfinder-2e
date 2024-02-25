class MonsterParts {
	static ID = 'Battlezoo-Monster-Parts-Crafting-for-Pathfinder-2e';

	static FLAGS = {
		IMBUEMENTS: 'imbuements',
		REFINEMENT: 'refinement',
		INIT: 'itemInitialized',
		RULEAPPLIED: 'ruleApplied',
	};

	static TEMPLATES = {
		WeaponImbuedPropertiesSheet: `modules/${this.ID}/templates/weapon-imbued-properties-sheet.hbs`,
		ImbuedPropertiesSheet: `modules/${this.ID}/templates/imbued-properties-sheet.hbs`,
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
		const flags = itemSheet.flags[this.ID];
		const itemSheetTabs = html.find('[class="tabs"]');
		const monsterPartsBody = html.find('[class="sheet-body"]');
		const itemImbuements = await this.getImbuements(itemSheet);
		const imbuementData = await foundry.utils.fetchJsonWithTimeout(
			MonsterParts.DATA.IMBUEMENTDATA
		);

		const skillOptions = await foundry.utils.fetchJsonWithTimeout(
			MonsterParts.DATA.SKILLDATA
		);

		// Set the itemType booleans
		const isWeapon = itemSheet.type === 'weapon';
		const isEquipment = itemSheet.type === 'equipment';
		const isSkillItem =
			MonsterParts.getMonsterPartsFlags(itemSheet)[
				MonsterParts.FLAGS.REFINEMENT
			].refinementProperties.refinementType === 'skillItem';

		// Inject Imbuements tab.
		itemSheetTabs.append(
			`<a class="list-row" data-tab="monster-parts">Monster Parts</a>`
		);

		// Render and inject the sheet Body.
		const renderedTemplate = await renderTemplate(
			MonsterParts.TEMPLATES.MonsterPartsTab,
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

		return monsterPartsBody.append(renderedTemplate);
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

	static initializeItem(itemSheet) {
		const imbuements = this.initializeImbuements(itemSheet);
		this.log(false, 'Item initialized | ', {
			itemSheet,
			imbuements,
		});
		return this.updateItem(
			itemSheet,
			{
				refined: false,
				refinementProperties: {
					refinementType: '',
					refinementName: '',
					refinementSkill: '',
				},
			},
			imbuements,
			{
				flags: {
					[this.FLAGS.INIT]: true,
					[this.FLAGS.RULEAPPLIED]: false,
				},
			}
		);
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

		switch (itemType) {
			case 'weapon':
				return {
					system: {
						runes: { potency: levelData.potency, striking: levelData.striking },
					},
					flags: {},
				};
				break;
			case 'armor':
				return {
					system: {
						runes: {
							potency: levelData.potency,
							resilient: levelData.resilient,
						},
					},
					flags: {},
				};
				break;
			case 'equipment':
				const ruleApplied =
					this.getMonsterPartsFlags(itemSheet)[MonsterParts.FLAGS.RULEAPPLIED];
				if (!ruleApplied) {
					const flatModifier = await this.fetchJsonWithTimeout(
						MonsterParts.RULES.FLATMODIFIER
					);
					// Rules UI stores selectors as arrays
					flatModifier.selector = [
						itemSheet.flags[this.ID][this.FLAGS.REFINEMENT].refinementProperties
							.refinementSkill,
					];

					this.log(false, 'Equipment Item Properties | ', {
						flatModifier,
					});

					return {
						// rules need to be packed in an array for the update call
						system: {
							rules: [flatModifier],
							usage: { type: 'worn', value: 'worn' },
						},
						flags: { [this.FLAGS.RULEAPPLIED]: true },
					};
				}

				break;
			case 'shield':
				if (itemLevel < 3) {
					const shieldProperties = this.shieldProperties(itemSheet, levelData);
					return {
						system: {
							hardness: shieldProperties.hardness,
							hp: {
								max: shieldProperties.hp,
								brokenThreshold: shieldProperties.brokenThreshold,
							},
						},
						flags: {},
					};
				} else {
					return {
						system: {
							hardness: levelData.hardness,
							hp: {
								max: levelData.hp,
								brokenThreshold: levelData.brokenThreshold,
							},
						},
						flags: {},
					};
				}
				break;
		}
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
		const system = {};

		// handle additional flags data
		if (updateData.flags) {
			flags[this.ID][this.FLAGS.INIT] = updateData.flags[this.FLAGS.INIT];
			flags[this.ID][this.FLAGS.RULEAPPLIED] =
				updateData.flags[this.FLAGS.RULEAPPLIED];
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

			// handle system updates passed from updateData
			for (let key in updateData.system) {
				system[key] = updateData.system[key];
			}

			// handle flag updates passed from itemProperties
			for (let key in itemProperties.flags) {
				flags[key] = itemProperties.flags[key];
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
		if (refinementData.refinementProperties) {
			flags[this.ID][this.FLAGS.REFINEMENT].refinementProperties =
				refinementData.refinementProperties;
		}

		this.log(false, 'Updating Item | ', {
			flags,
			system,
			updateData,
			refinementData,
			imbuementData,
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
					{ actorLevelChanged: true }
				);
			}
		}
	}
});

Hooks.on('renderItemSheet', async (itemSheet, html) => {
	const initItemSheet = await MonsterParts.checkForInit(itemSheet.object);
	const itemType = initItemSheet.type;
	const itemID = initItemSheet._id;
	const actorID = initItemSheet.parent._id;
	const imbuements = MonsterParts.getImbuements(initItemSheet);

	await MonsterParts.renderMonsterPartsTab(html, initItemSheet);

	// Bind the current tab.
	function customCallback(event, tabs, active) {
		this._onChangeTab(event, tabs, active);
		tabs._activeCustom = active;
	}

	if (itemSheet._tabs[0].callback !== itemSheet._tabs[0]._customCallback) {
		// Bind `customCallback` with `this` being the app instance.
		const newCallback = await customCallback.bind(itemSheet);
		itemSheet._tabs[0].callback = newCallback;
		itemSheet._tabs[0]._customCallback = newCallback;
	}

	// Set active tab to Monster Parts
	itemSheet._tabs[0].activate(itemSheet._tabs[0]._activeCustom);

	MonsterParts.log(false, 'renderItemSheet', ' | ', {
		itemSheet,
		html,
		itemType,
		itemID,
		actorID,
	});

	// Change the Refinement Path for an Equipment item
	html.on('change', '.monster-parts-refinement-property', async (event) => {
		const selectedOption =
			event.currentTarget.selectedOptions[0].attributes[0].value;
		const updatePackage = {};

		if (selectedOption === 'skill') {
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
				updatePackage.imbuements = imbuements;
			}
			MonsterParts.updateItem(
				initItemSheet,
				updatePackage.refinement,
				updatePackage.imbuements,
				{}
			);
			event.stopPropagation();
		} else {
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
				imbuements[imbuementID].imbuedProperty = 'sensory';
				imbuements[imbuementID].name = 'Sensory';
			}
			updatePackage.imbuements = imbuements;

			MonsterParts.updateItem(
				initItemSheet,
				updatePackage.refinement,
				updatePackage.imbuements,
				{}
			);

			MonsterParts.log(false, 'Perception Item updated | ', {
				imbuements,
			});
			event.stopPropagation();
		}

		MonsterParts.log(false, '.monster-parts-refinement-property changed | ', {
			itemSheet,
			selectedOption,
		});
		event.stopPropagation();
	});

	// Change the skill on a skill item.
	html.on('change', '.monster-parts-skill', async (event) => {
		const skill = event.currentTarget.selectedOptions[0].attributes[0].value;

		for (let imbuementID in imbuements) {
			imbuements[imbuementID].name = 'New Imbuement';
			imbuements[(imbuementID.imbuedProperty = '')];
		}

		MonsterParts.updateItem(
			initItemSheet,
			{
				refinementProperties: {
					refinementType: 'skillItem',
					refinementName: 'skill',
					refinementSkill: skill,
				},
			},
			imbuements,
			{}
		);

		MonsterParts.log(false, '.monster-parts-skill changed | ', {
			skill,
		});

		event.stopPropagation();
	});

	// Change the Imbuement Property
	html.on('change', '.monster-parts-property', async (event) => {
		const currentTarget = event.currentTarget;
		const selectedOption = currentTarget.selectedOptions[0].attributes[0].value;
		const imbuementID = currentTarget.getAttribute('data-imbuement-id');
		imbuements[
			imbuementID
		].name = `${selectedOption} ${imbuements[imbuementID].imbuedPath}`;
		imbuements[imbuementID].imbuedProperty = selectedOption;

		MonsterParts.updateItem(initItemSheet, {}, imbuements, {});

		MonsterParts.log(false, '.monster-parts-property changed | ', {
			event,
			currentTarget,
			selectedOption,
			imbuementID,
			imbuements,
		});
	});

	// Change the Imbuement Path
	html.on('change', '.monster-parts-path', async (event) => {
		const currentTarget = event.currentTarget;
		const selectedOption = currentTarget.selectedOptions[0].attributes[0].value;
		const imbuementID = currentTarget.getAttribute('data-imbuement-id');
		imbuements[
			imbuementID
		].name = `${imbuements[imbuementID].imbuedProperty} ${selectedOption}`;
		imbuements[imbuementID].imbuedPath = selectedOption;

		MonsterParts.updateItem(initItemSheet, {}, imbuements, {});

		MonsterParts.log(false, '.monster-parts-property changed | ', {
			event,
			currentTarget,
			selectedOption,
			imbuementID,
			imbuements,
		});
	});

	// Click on + button
	html.on('click', '.add-gold-button', (event) => {
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
					const currValue = initItemSheet.system.price.value.gp;
					const itemValue = currValue + changeValue;
					// Update the item.
					MonsterParts.updateItem(
						initItemSheet,
						{ itemValue, refined: true },
						{},
						{ system: { specific: { material: {}, runes: {} } } }
					);
					event.stopPropagation();
					break;

				case 'imbue-add-gold':
					const imbuementID = clickedElement.getAttribute('data-imbuement-id');
					imbuements[imbuementID].imbuedValue =
						imbuements[imbuementID].imbuedValue + changeValue;
					MonsterParts.updateItem(initItemSheet, {}, imbuements, {});
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
	});

	// Click on - button
	html.on('click', '.subtract-gold-button', (event) => {
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
					const currValue = initItemSheet.system.price.value.gp;
					const itemValue = currValue - changeValue;
					// Update the item's value.
					if (itemValue > 0) {
						MonsterParts.updateItem(initItemSheet, { itemValue }, {}, {});
						event.stopPropagation();
						break;
					} else {
						MonsterParts.updateItem(initItemSheet, { itemValue: 0 }, {}, {});
						event.stopPropagation();
						break;
					}

				case 'imbue-subtract-gold':
					const imbuementID = clickedElement.getAttribute('data-imbuement-id');
					imbuements[imbuementID].imbuedValue =
						imbuements[imbuementID].imbuedValue - changeValue;
					if (imbuements[imbuementID].imbuedValue - changeValue > 0) {
						MonsterParts.updateItem(initItemSheet, {}, imbuements, {});
						event.stopPropagation();
						break;
					} else {
						imbuements[imbuementID].imbuedValue = 0;
						MonsterParts.updateItem(initItemSheet, {}, imbuements, {});
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
	});
});
