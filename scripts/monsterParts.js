class MonsterParts {
	static ID = 'Battlezoo-Monster-Parts-Crafting-for-Pathfinder-2e';

	static FLAGS = {
		IMBUEMENTS: 'imbuements',
		REFINEMENT: 'refinement',
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

	static initialize() {}

	static async getMonsterPartsFlag(itemSheet, scope, flag, key) {
		// Check for flags and initialize if they don't exist
		const flags = itemSheet.flags;
		this.log(false, 'getMonsterPartsFlag | ', {
			scopeExists: flags.hasOwnProperty(scope),
			flags,
			scope,
			flag,
			key,
		});
		if (
			flags.hasOwnProperty(scope) &&
			flags[scope].hasOwnProperty(flag) &&
			flags[scope][flag].hasOwnProperty(key)
		) {
			// property exists
			return flags[scope][flag][key];
		} else {
			// property does not exist
			flags[scope][flag] = { [key]: '' };
			return flags[scope][flag][key];
		}
	}

	static async renderMonsterPartsTab(html, itemID, actorID, itemSheet) {
		const flags = itemSheet.object.flags[this.ID];
		const itemSheetTabs = html.find('[class="tabs"]');
		const monsterPartsBody = html.find('[class="sheet-body"]');
		const itemImbuements = await ImbuementsSheetData.getImbuementsForItem(
			actorID,
			itemID
		);
		const imbuementData = await foundry.utils.fetchJsonWithTimeout(
			MonsterParts.DATA.IMBUEMENTDATA
		);
		const refinementType = await this.getMonsterPartsFlag(
			itemSheet.object,
			MonsterParts.ID,
			MonsterParts.FLAGS.REFINEMENT,
			'refinementType'
		);
		const skillOptions = await foundry.utils.fetchJsonWithTimeout(
			MonsterParts.DATA.SKILLDATA
		);

		// Set the itemType booleans
		const isWeapon = itemSheet.object.type === 'weapon' ? true : false;
		const isEquipment = itemSheet.object.type === 'equipment' ? true : false;
		const isSkillItem = refinementType === 'skill' ? true : false;

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
}

class RefinementSheetData {
	// Get item from actor's inventory
	static getItemFromActorInventory(actorID, itemID) {
		return game.actors.get(actorID).items.get(itemID);
	}

	// Add or remove imbuements based on potency.
	static updateImbuementCount(
		numImbuements,
		potency,
		actorID,
		itemID,
		imbuements
	) {
		if (numImbuements < potency) {
			for (let i = numImbuements; i < potency; i++) {
				ImbuementsSheetData.createImbuement(actorID, itemID, {
					property: i + 1,
				});
			}
		} else if (numImbuements > potency) {
			for (let i = numImbuements; i > potency; i--) {
				for (let imbuement in imbuements) {
					if (imbuements[imbuement].property === i) {
						MonsterParts.log(false, 'deleteImbuement on Refinement update | ', {
							imbuement: imbuements[imbuement],
							i,
						});
						ImbuementsSheetData.deleteImbuement(
							actorID,
							imbuements[imbuement].id
						);
						break;
					}
				}
			}
		}
	}

	// Update the item's refinement data
	static async updateRefinement(itemSheet, updateData) {
		const itemType = itemSheet.type;
		const actorID = itemSheet.parent._id;
		const levelData = await this.getLevelData(
			updateData.itemValue,
			itemType,
			actorID
		);
		const itemLevel = levelData.itemLevel;
		const itemID = itemSheet._id;
		const imbuements = await ImbuementsSheetData.getImbuementsForItem(
			actorID,
			itemID
		);

		const traits = [...itemSheet.system.traits.value];

		const numImbuements =
			typeof imbuements === 'undefined' ? 0 : Object.keys(imbuements).length;

		MonsterParts.log(false, 'updateRefinement | ', {
			itemSheet,
			updateData,
			levelData,
			itemLevel,
			numImbuements,
		});

		switch (itemType) {
			case 'weapon':
				const weaponPotency = levelData.levels[`${itemLevel}`].potency;
				const striking = levelData.levels[`${itemLevel}`].striking;

				this.updateImbuementCount(
					numImbuements,
					weaponPotency,
					actorID,
					itemID,
					imbuements
				);

				await itemSheet.update({
					system: {
						specific: { material: {}, runes: {} },
						price: { value: { gp: updateData.itemValue } },
						level: { value: itemLevel },
						runes: { potency: weaponPotency, striking },
					},
				});
				MonsterParts.log(false, 'Weapon Sheet updated | ', { updateData });
				break;

			case 'armor':
				const armorPotency = levelData.levels[`${itemLevel}`].potency;
				const resilient = levelData.levels[`${itemLevel}`].resilient;

				this.updateImbuementCount(
					numImbuements,
					armorPotency,
					actorID,
					itemID,
					imbuements
				);

				await itemSheet.update({
					system: {
						specific: { material: {}, runes: {} },
						price: { value: { gp: updateData.itemValue } },
						level: { value: itemLevel },
						runes: { potency: armorPotency, resilient },
					},
				});
				MonsterParts.log(false, 'Armor Sheet updated | ', { updateData });
				break;

			case 'equipment':
				const imbuementCount = levelData.levels[itemLevel].imbuements;
				MonsterParts.log(false, 'Equipment Sheet updated | ', {
					updateData,
					imbuementCount,
				});

				await this.updateImbuementCount(
					numImbuements,
					imbuementCount,
					actorID,
					itemID,
					imbuements
				);

				if (!traits.includes('invested')) {
					traits.push('invested');
				}

				if (!traits.includes('magical')) {
					traits.push('magical');
				}

				await itemSheet.update({
					flags: {
						[MonsterParts.ID]: {
							[MonsterParts.FLAGS.REFINEMENT]: updateData,
						},
					},
					system: {
						specific: { material: {}, runes: {} },
						price: { value: { gp: updateData.itemValue } },
						level: { value: itemLevel },
						rules: updateData.rules,
						traits: {
							value: traits,
						},
						usage: { type: 'worn', value: 'worn' },
					},
				});

				break;

			case 'shield':
				const sourceID = itemSheet.flags.core.sourceId;
				const sourceFields = sourceID.split('.');
				const compendiumName = `${sourceFields[1]}.${sourceFields[2]}`;
				const compendiumItemID = sourceFields.at(-1);
				const compendiumPack = game.packs.get(compendiumName);
				const compendiumItem = await compendiumPack.getDocument(
					compendiumItemID
				);

				const hardness = levelData.levels[`${itemLevel}`].hardness
					? levelData.levels[`${itemLevel}`].hardness
					: compendiumItem.system.hardness;
				const hitPoints = levelData.levels[`${itemLevel}`].hp
					? levelData.levels[`${itemLevel}`].hp
					: compendiumItem.system.hp.max;
				const brokenThreshold = levelData.levels[`${itemLevel}`].brokenThreshold
					? levelData.levels[`${itemLevel}`].brokenThreshold
					: compendiumItem.system.hp.brokenThreshold;

				this.updateImbuementCount(
					numImbuements,
					0,
					actorID,
					itemID,
					imbuements
				);

				await itemSheet.update({
					system: {
						specific: { material: {}, runes: {} },
						price: { value: { gp: updateData.itemValue } },
						level: { value: itemLevel },
						hardness,
						hp: {
							max: hitPoints,
							brokenThreshold,
						},
					},
				});

				MonsterParts.log(false, 'shield refinement update | ', {
					hardness,
					hitPoints,
					brokenThreshold,
					sourceFields,
					compendiumItem,
					compendiumName,
					compendiumPack,
					compendiumItemID,
				});
				break;
		}
	}

	static async getLevelData(itemValue, itemType, actorID) {
		const levelData = await foundry.utils.fetchJsonWithTimeout(
			MonsterParts.DATA.REFINEMENTLEVELDATA
		);
		const itemLevel = Number(
			Object.keys(levelData[itemType]).find(
				(key) => levelData[itemType][key].threshold > itemValue
			) - 1
		);
		const actorLevel = game.actors.get(actorID).level;

		MonsterParts.log(false, 'getLevelData | ', {
			levelData,
			itemLevelData: levelData[itemType],
			itemLevel,
			itemType,
			itemValue,
			actorLevel,
		});

		const lowerLevel =
			itemLevel || itemLevel === 0
				? Math.min(actorLevel, itemLevel)
				: actorLevel;

		return { itemLevel: lowerLevel, levels: levelData[itemType] };
	}
}

class ImbuementsSheetData {
	// Get item from actor's inventory
	static getItemFromActorInventory(actorID, itemID) {
		return game.actors.get(actorID).items.get(itemID);
	}

	// get all of the imbued properties on an item
	static getImbuementsForItem(actorID, itemID) {
		return this.getItemFromActorInventory(actorID, itemID)?.getFlag(
			MonsterParts.ID,
			MonsterParts.FLAGS.IMBUEMENTS
		);
	}

	// create a new imbuement
	static createImbuement(actorID, itemID, imbuementData) {
		const newImbuement = {
			...imbuementData,
			id: foundry.utils.randomID(16),
			name: 'New Imbuement',
			imbuedProperty: '',
			imbuedPath: '',
			itemID,
			actorID,
			imbuedValue: 0,
		};

		// construct the update to insert the new imbuement
		const newImbuements = {
			[newImbuement.id]: newImbuement,
		};

		MonsterParts.log(false, 'Imbuement created' | { newImbuements });

		return this.getItemFromActorInventory(actorID, itemID)?.setFlag(
			MonsterParts.ID,
			MonsterParts.FLAGS.IMBUEMENTS,
			newImbuements
		);
	}

	// get all imbuements.
	static get allImbuements() {
		const allImbuements = game.actors.reduce((accumulator, actor) => {
			const currentActorImbuements = actor.inventory.contents.reduce(
				(accumulator, item) => {
					const itemImbuements = this.getImbuementsForItem(actor._id, item._id);
					return {
						...accumulator,
						...itemImbuements,
					};
				},
				{}
			);
			return {
				...accumulator,
				...currentActorImbuements,
			};
		}, {});
		return allImbuements;
	}

	static updateImbuement(actorID, imbuementID, updateData) {
		const relevantImbuement = this.allImbuements[imbuementID];
		// construct the update to send
		const update = {
			[imbuementID]: updateData,
		};

		MonsterParts.log(false, 'Updating imbuement', ' | ', {
			relevantImbuement,
			update,
			actorID,
			imbuementID,
		});

		return this.getItemFromActorInventory(
			actorID,
			relevantImbuement.itemID
		)?.setFlag(MonsterParts.ID, MonsterParts.FLAGS.IMBUEMENTS, update);
	}

	static deleteImbuement(actorID, imbuementID) {
		const relevantImbuement = this.allImbuements[imbuementID];

		const keyDeletion = {
			[`-=${imbuementID}`]: null,
		};

		return this.getItemFromActorInventory(
			actorID,
			relevantImbuement.itemID
		)?.setFlag(MonsterParts.ID, MonsterParts.FLAGS.IMBUEMENTS, keyDeletion);
	}
}

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
	registerPackageDebugFlag(MonsterParts.ID);
});

Hooks.once('init', () => {
	MonsterParts.initialize();
});

Hooks.on('updateActor', (characterSheet) => {
	const actorID = characterSheet._id;

	for (let idx in characterSheet.items._source) {
		const item = characterSheet.items._source[idx];
		const itemType = item.type;

		if (['weapon', 'armor', 'shield', 'equipment'].includes(itemType)) {
			MonsterParts.log(false, 'updateActor | ', {
				characterSheet,
				inventory: characterSheet.items._source,
				actorID,
				item,
				itemType,
			});

			const itemSheet = game.actors.get(actorID).items.get(item._id);

			RefinementSheetData.updateRefinement(itemSheet, {});
		}
	}
});

Hooks.on('updateItem', (event, FormData) => {
	MonsterParts.log(false, '_updateObject Event | ', { event, FormData });
});

Hooks.on('renderItemSheet', async (itemSheet, html) => {
	const itemType = itemSheet.object.type;
	const itemID = itemSheet.object._id;
	const actorID = itemSheet.actor._id;
	const imbuements = await ImbuementsSheetData.getImbuementsForItem(
		actorID,
		itemID
	);

	await MonsterParts.renderMonsterPartsTab(html, itemID, actorID, itemSheet);

	MonsterParts.log(false, 'renderItemSheet', ' | ', {
		itemSheet,
		html,
		itemType,
		itemID,
		actorID,
	});

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

	// Change the Refinement Path for an Equipment item
	html.on('change', '.monster-parts-refinement-property', async (event) => {
		const selectedOption =
			event.currentTarget.selectedOptions[0].attributes[0].value;

		if (selectedOption === 'skill') {
			await RefinementSheetData.updateRefinement(itemSheet.object, {
				refinementType: selectedOption,
				skill: '',
			});
			for (let imbuementID in imbuements) {
				await ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
					name: 'New Imbuement',
					imbuedProperty: '',
				});
			}
			event.stopPropagation();
		} else {
			// Get the Flat Modifier rule data, set the selector, and add it to the rules array.
			const flatModifier = await foundry.utils.fetchJsonWithTimeout(
				MonsterParts.RULES.FLATMODIFIER
			);
			// rules created in the UI assign the selector as an array with a single item.
			flatModifier.selector = [selectedOption];
			const rules = [...itemSheet.object.system.rules, flatModifier];

			// There should only ever be 1 imbuement on an equipment item
			for (let imbuement in imbuements) {
				// Sensory is the only Perception Item imbuement option
				await ImbuementsSheetData.updateImbuement(actorID, imbuement, {
					imbuedProperty: 'sensory',
					name: 'Sensory',
				});
			}

			await RefinementSheetData.updateRefinement(itemSheet.object, {
				refinementType: selectedOption,
				rules,
			});

			MonsterParts.log(false, 'Perception Item updated | ', {
				rules,
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
		const currentSkill = await MonsterParts.getMonsterPartsFlag(
			itemSheet.object,
			MonsterParts.ID,
			MonsterParts.FLAGS.REFINEMENT,
			'skill'
		);

		MonsterParts.log(false, '.monster-parts-skill changed | ', {
			skill,
			currentSkill,
		});

		if (skill !== currentSkill) {
			const flatModifier = await foundry.utils.fetchJsonWithTimeout(
				MonsterParts.RULES.FLATMODIFIER
			);
			flatModifier.selector = [skill];
			const rules = [...itemSheet.object.system.rules, flatModifier];

			for (let imbuementID in imbuements) {
				ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
					name: 'New Imbuement',
					imbuedProperty: '',
				});
			}

			await RefinementSheetData.updateRefinement(itemSheet.object, {
				skill,
				rules,
			});
			event.stopPropagation();
		}
	});

	// Change the Imbuement Property
	html.on('change', '.monster-parts-property', async (event) => {
		const currentTarget = event.currentTarget;
		const selectedOption = currentTarget.selectedOptions[0].attributes[0].value;
		const imbuementID = currentTarget.getAttribute('data-imbuement-id');
		const relevantImbuement = await ImbuementsSheetData.getImbuementsForItem(
			actorID,
			itemID
		)[imbuementID];

		ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
			name: `${selectedOption} ${relevantImbuement.imbuedPath}`,
			imbuedProperty: selectedOption,
		});

		MonsterParts.log(false, '.monster-parts-property changed | ', {
			event,
			currentTarget,
			selectedOption,
			imbuementID,
			relevantImbuement,
		});
	});

	// Change the Imbuement Path
	html.on('change', '.monster-parts-path', async (event) => {
		const currentTarget = event.currentTarget;
		const selectedOption = currentTarget.selectedOptions[0].attributes[0].value;
		const imbuementID = currentTarget.getAttribute('data-imbuement-id');
		const relevantImbuement = await ImbuementsSheetData.getImbuementsForItem(
			actorID,
			itemID
		)[imbuementID];

		ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
			name: `${relevantImbuement.imbuedProperty} ${selectedOption}`,
			imbuedPath: selectedOption,
		});

		MonsterParts.log(false, '.monster-parts-property changed | ', {
			event,
			currentTarget,
			selectedOption,
			imbuementID,
			relevantImbuement,
		});
	});

	html.on('change', '.gold-value-input', (event) => {
		MonsterParts.log(false, '.gold-value-input Changed | ', {
			event,
		});
		event.preventDefault();
		event.stopPropagation();
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
					const currValue = itemSheet.object.system.price.value.gp;
					const itemValue = currValue + changeValue;
					// Update the item.
					RefinementSheetData.updateRefinement(itemSheet.object, { itemValue });
					event.stopPropagation();
					break;

				case 'imbue-add-gold':
					const imbuementID = clickedElement.getAttribute('data-imbuement-id');
					const imbuement = ImbuementsSheetData.getImbuementsForItem(
						actorID,
						itemID
					)[imbuementID];
					ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
						imbuedValue: imbuement.imbuedValue + changeValue,
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
			ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
			event.stopPropagation();
			return;
		} else if (changeValue < 0) {
			// Input is less than 0
			ui.notifications.error(
				'Cannot add negative gold values. Please enter a whole number integer.'
			);
			ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
			event.stopPropagation();
			return;
		} else if (isNaN(changeValue)) {
			// Input is not a number.
			ui.notifications.error(
				'Cannot add non-number gold values. Please enter a whole number integer.'
			);
			ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
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
					const currValue = itemSheet.object.system.price.value.gp;
					const itemValue = currValue - changeValue;
					// Update the item's value.
					if (itemValue > 0) {
						RefinementSheetData.updateRefinement(itemSheet.object, {
							itemValue,
						});
						event.stopPropagation();
						break;
					} else {
						RefinementSheetData.updateRefinement(itemSheet.object, {
							itemValue: 0,
						});
						event.stopPropagation();
						break;
					}

				case 'imbue-subtract-gold':
					const imbuementID = clickedElement.getAttribute('data-imbuement-id');
					const imbuement = ImbuementsSheetData.getImbuementsForItem(
						actorID,
						itemID
					)[imbuementID];
					if (imbuement.imbuedValue - changeValue > 0) {
						ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
							imbuedValue: imbuement.imbuedValue - changeValue,
						});
						event.stopPropagation();
						break;
					} else {
						ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
							imbuedValue: 0,
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
			ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
			event.stopPropagation();
			return;
		} else if (changeValue < 0) {
			// Input is less than 0
			ui.notifications.error(
				'Cannot subtract negative gold values. Please enter a whole number integer.'
			);
			ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
			event.stopPropagation();
			return;
		} else if (isNaN(changeValue)) {
			// Input is not a number.
			ui.notifications.error(
				'Cannot subtract non-number gold values. Please enter a whole number integer.'
			);
			ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
			event.stopPropagation();
			return;
		}
	});
});
