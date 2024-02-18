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
	};

	static log(force, ...args) {
		const shouldLog =
			force ||
			game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

		if (shouldLog) {
			console.log(this.ID, '|', ...args);
		}
	}

	static initialize() {
		this.ImbuementsConfigSheet = new ImbuementsConfigSheet();
		this.MonsterPartsTab = new MonsterPartsTab();
	}

	static async renderMonsterPartsTab(html, itemID, actorID, itemSheet) {
		const itemSheetTabs = html.find('[class="tabs"]');
		const imbuementsSheetBody = html.find('[class="sheet-body"]');
		const itemImbuements = ImbuementsSheetData.getImbuementsForItem(
			actorID,
			itemID
		);
		const imbuementData = await foundry.utils.fetchJsonWithTimeout(
			MonsterParts.DATA.IMBUEMENTDATA
		);

		const isWeapon = itemSheet.object.type === 'weapon' ? true : false;

		// Inject Imbuements tab.
		itemSheetTabs.append(
			`<a class='list-row' data-tab='monster-parts'>Monster Parts</a>`
		);

		// Render and inject the sheet Body.
		const renderedTemplate = await renderTemplate(
			MonsterParts.TEMPLATES.MonsterPartsTab,
			{
				imbuements: itemImbuements,
				itemSheet,
				imbuementData,
				isWeapon,
			}
		);

		MonsterParts.log(false, 'renderMonsterPartsTab', ' | ', {
			itemImbuements,
			itemSheetTabs,
			imbuementsSheetBody,
			renderedTemplate,
			itemSheet,
		});

		imbuementsSheetBody.append(renderedTemplate);
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
					MonsterParts.log(false, 'deleteImbuement on Refinement update | ', {
						imbuement: imbuements[imbuement],
						i,
					});
					if (imbuements[imbuement].property === i) {
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
	static async updateRefinement(itemSheet, itemValue, updateData) {
		const itemType = itemSheet.type;
		const actorID = itemSheet.parent._id;
		const levelData = await this.getLevelData(itemValue, itemType, actorID);
		const itemLevel = levelData.itemLevel;
		const itemID = itemSheet._id;
		const imbuements = ImbuementsSheetData.getImbuementsForItem(
			actorID,
			itemID
		);

		const numImbuements =
			typeof imbuements === 'undefined' ? 0 : Object.keys(imbuements).length;

		MonsterParts.log(false, 'updateRefinement | ', {
			itemSheet,
			updateData,
			levelData,
			itemLevel,
			numImbuements,
		});

		// TODO: Update item name when refinement data is updated.

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
						price: { value: { gp: itemValue } },
						level: { value: itemLevel },
						runes: { potency: weaponPotency, striking },
					},
				});
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
						price: { value: { gp: itemValue } },
						level: { value: itemLevel },
						runes: { potency: armorPotency, resilient },
					},
				});
				break;

			case 'equipment':
				const imbuementCount = levelData.levels[`${itemLevel}`].imbuements;

				this.updateImbuementCount(
					numImbuements,
					imbuementCount,
					actorID,
					itemID,
					imbuements
				);

				await itemSheet.update({
					system: {
						price: { value: { gp: itemValue } },
						level: { value: itemLevel },
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
						price: { value: { gp: itemValue } },
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
			formDataProperty: '',
			formDataPath: '',
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

class ImbuementsConfigSheet extends FormApplication {
	async getItemType(options) {
		const imbuedProperties = await foundry.utils.fetchJsonWithTimeout(
			MonsterParts.DATA.IMBUEMENTDATA
		);

		switch (options.itemType) {
			case 'weapon':
				return {
					template: MonsterParts.TEMPLATES.WeaponImbuedPropertiesSheet,
					imbuements: imbuedProperties.weapon,
				};

			case 'equipment':
				return {
					template: MonsterParts.TEMPLATES.ImbuedPropertiesSheet,
					imbuements: imbuedProperties.skill,
				};

			case 'armor':
				return {
					template: MonsterParts.TEMPLATES.ImbuedPropertiesSheet,
					imbuements: imbuedProperties.armor,
				};

			case 'shield':
				return {
					template: MonsterParts.TEMPLATES.ImbuedPropertiesSheet,
					imbuements: imbuedProperties.shield,
				};
		}
	}
	static get defaultOptions() {
		const defaults = super.defaultOptions;

		const overrides = {
			id: `${this.itemType}-imbuement-config-sheet`,
			title: 'Configure Imbuement',
			closeOnSubmit: false,
			submitOnChange: true,
			actorID: this.actorID,
			imbuementID: this.imbuementID,
			itemID: this.itemID,
			itemType: this.itemType,
		};

		const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

		return mergedOptions;
	}

	async getData(options) {
		const itemData = await this.getItemType(options);
		options.template = itemData.template;

		MonsterParts.log(false, 'getData options', {
			options,
			itemData,
		});

		return {
			imbuements: itemData.imbuements,
			actorID: options.actorID,
			imbuementID: options.imbuementID,
			itemID: options.itemID,
			itemType: options.itemType,
		};
	}

	async _updateObject(event, formData) {
		const expandedData = foundry.utils.expandObject(formData);
		const actorID = $(event.currentTarget)
			.parents('[data-actor-id]')
			?.data()?.actorId;
		const imbuementID = $(event.currentTarget)
			.parents('[data-imbuement-id]')
			?.data()?.imbuementId;
		const itemID = $(event.currentTarget)
			.parents('[data-imbuement-id]')
			.data()?.itemId;

		MonsterParts.log(false, 'saving', {
			actorID,
			imbuementID,
			itemID,
			formData,
			expandedData,
			event,
		});
		const updateData = {
			// name: `${formData['imbued-property']} ${formData['imbuement-path']}`,
			formDataProperty: formData['imbued-property'],
			formDataPath: formData['imbuement-path'],
		};

		ImbuementsSheetData.updateImbuement(actorID, imbuementID, updateData);
	}

	activateListeners(html) {
		super.activateListeners(html);
		html.on('click', '[data-action]', this._handleButtonClick.bind(this));
	}

	async _handleButtonClick(event) {
		const clickedElement = $(event.currentTarget);
		const action = clickedElement.data().action;
		const itemType = clickedElement.data().itemType;
		const actorID = clickedElement
			.parents('[data-imbuement-id]')
			.data()?.actorId;
		const imbuementID = clickedElement
			.parents('[data-imbuement-id]')
			.data()?.imbuementId;
		const itemID = clickedElement.parents('[data-imbuement-id]').data()?.itemId;
		const imbuement = ImbuementsSheetData.getImbuementsForItem(actorID, itemID)[
			imbuementID
		];

		if (itemType === 'weapon') {
			switch (action) {
				case 'save': {
					if (
						imbuement.formDataProperty === '' ||
						imbuement.formDataPath === ''
					) {
						ui.notifications.error('Cannot save blank fields.');
						break;
					} else {
						const updateData = {
							name: `${imbuement.formDataProperty} ${imbuement.formDataPath}`,
							imbuedProperty: imbuement.formDataProperty,
							imbuedPath: imbuement.formDataPath,
						};

						ImbuementsSheetData.updateImbuement(
							actorID,
							imbuementID,
							updateData
						);
						ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
							formDataProperty: '',
							formDataPath: '',
						});
						this.close();
						break;
					}
				}

				case 'cancel': {
					const updateData = {
						formDataProperty: '',
						formDataPath: '',
					};
					ImbuementsSheetData.updateImbuement(actorID, imbuementID, updateData);
					this.close();
					break;
				}
			}
		} else {
			switch (action) {
				case 'save': {
					if (imbuement.formDataProperty === '') {
						ui.notifications.error('Cannot save blank fields.');
						break;
					} else {
						const updateData = {
							name: imbuement.formDataProperty,
							imbuedProperty: imbuement.formDataProperty,
						};

						ImbuementsSheetData.updateImbuement(
							actorID,
							imbuementID,
							updateData
						);
						ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
							formDataProperty: '',
							formDataPath: '',
						});
						this.close();
						break;
					}
				}

				case 'cancel': {
					const updateData = {
						formDataProperty: '',
						formDataPath: '',
					};
					ImbuementsSheetData.updateImbuement(actorID, imbuementID, updateData);
					this.close();
					break;
				}
			}
		}

		MonsterParts.log(false, 'Button clicked!', {
			this: this,
			action,
			actorID,
			imbuementID,
			itemID,
			event,
			itemType,
			clickedElement: clickedElement.data(),
		});
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

			RefinementSheetData.updateRefinement(
				itemSheet,
				item.system.price.value.gp,
				{}
			);
		}
	}
});

Hooks.on('renderItemSheet', async (itemSheet, html) => {
	const itemType = itemSheet.object.type;
	const itemID = itemSheet.object._id;
	const actorID = itemSheet.actor._id;

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

	// Click on Configure Imbuement Button
	html.on('click', '.configure-imbuement', (event) => {
		const imbuementID = event.currentTarget.getAttribute('data-imbuement-id');

		MonsterParts.log(false, {
			actorID,
			imbuementID,
			itemID,
			itemType,
		});

		MonsterParts.ImbuementsConfigSheet.render(true, {
			actorID,
			imbuementID,
			itemID,
			itemType,
		});
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
					const newValue = currValue + changeValue;
					// Update the item.
					RefinementSheetData.updateRefinement(itemSheet.object, newValue, {});
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
					const newValue = currValue - changeValue;
					// Update the item's value.
					if (newValue > 0) {
						RefinementSheetData.updateRefinement(
							itemSheet.object,
							newValue,
							{}
						);
						event.stopPropagation();
						break;
					} else {
						RefinementSheetData.updateRefinement(itemSheet.object, 0, {});
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
