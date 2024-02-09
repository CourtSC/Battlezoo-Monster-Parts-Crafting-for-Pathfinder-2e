class ImbuementsSheet {
	static ID = 'Battlezoo-Monster-Parts-Crafting-for-Pathfinder-2e';

	static FLAGS = {
		IMBUEMENTS: 'imbuements',
	};

	static TEMPLATES = {
		WeaponImbuedPropertiesSheet: `modules/${this.ID}/templates/weapon-imbued-properties-sheet.hbs`,
		ImbuedPropertiesSheet: `modules/${this.ID}/templates/imbued-properties-sheet.hbs`,
		ItemSheetImbuementsTab: `modules/${this.ID}/templates/imbuements-tab.hbs`,
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
		this.ImbuementsTab = new ImbuementsTab();
	}

	static async renderImbuementsTab(html, itemID, actorID) {
		const itemSheetTabs = html.find('[class="tabs"]');
		const ImbuementsSheetBody = html.find('[class="sheet-body"]');
		const itemImbuements = ImbuementsSheetData.getImbuementsForItem(
			actorID,
			itemID
		);

		ImbuementsSheet.log(false, 'itemImbuements', ' | ', itemImbuements);

		// Inject Imbuements tab.
		itemSheetTabs.append(
			`<a class='list-row' data-tab='imbuements'>Imbuements</a>`
		);

		// Render and inject the sheet Body.
		const renderedTemplate = await renderTemplate(
			ImbuementsSheet.TEMPLATES.ItemSheetImbuementsTab,
			{ imbuements: itemImbuements }
		);
		ImbuementsSheetBody.append(renderedTemplate);
	}
}

class ImbuementsSheetData {
	// Get item from actor's inventory
	static getItemFromActorInventory(actorID, itemID) {
		const actorInventory = game.actors.get(actorID).inventory.contents;
		for (let key in actorInventory) {
			if (actorInventory[key]._id === itemID) {
				return actorInventory[key];
			}
		}
	}

	// get all of the imbued properties on an item
	static getImbuementsForItem(actorID, itemID) {
		return this.getItemFromActorInventory(actorID, itemID)?.getFlag(
			ImbuementsSheet.ID,
			ImbuementsSheet.FLAGS.IMBUEMENTS
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

		ImbuementsSheet.log(false, 'Imbuement created' | { newImbuements });

		return this.getItemFromActorInventory(actorID, itemID)?.setFlag(
			ImbuementsSheet.ID,
			ImbuementsSheet.FLAGS.IMBUEMENTS,
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

		ImbuementsSheet.log(false, 'Updating imbuement', ' | ', {
			relevantImbuement,
			update,
			actorID,
			imbuementID,
		});

		return this.getItemFromActorInventory(
			actorID,
			relevantImbuement.itemID
		)?.setFlag(ImbuementsSheet.ID, ImbuementsSheet.FLAGS.IMBUEMENTS, update);
	}

	static deleteImbuement(actorID, imbuementID) {
		const relevantImbuement = this.allImbuements[imbuementID];

		const keyDeletion = {
			[`-=${imbuementID}`]: null,
		};

		return this.getItemFromActorInventory(
			actorID,
			relevantImbuement.itemID
		)?.setFlag(
			ImbuementsSheet.ID,
			ImbuementsSheet.FLAGS.IMBUEMENTS,
			keyDeletion
		);
	}
}

class ImbuementsConfigSheet extends FormApplication {
	async getItemType(options) {
		const imbuedProperties = await foundry.utils.fetchJsonWithTimeout(
			`modules/${ImbuementsSheet.ID}/data/imbuements.json`
		);

		switch (options.itemType) {
			case 'weapon':
				return {
					template: ImbuementsSheet.TEMPLATES.WeaponImbuedPropertiesSheet,
					imbuements: imbuedProperties.weapon,
				};

			case 'equipment':
				return {
					template: ImbuementsSheet.TEMPLATES.ImbuedPropertiesSheet,
					imbuements: imbuedProperties.skill,
				};

			case 'armor':
				return {
					template: ImbuementsSheet.TEMPLATES.ImbuedPropertiesSheet,
					imbuements: imbuedProperties.armor,
				};

			case 'shield':
				return {
					template: ImbuementsSheet.TEMPLATES.ImbuedPropertiesSheet,
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

		ImbuementsSheet.log(false, 'getData options', {
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

		ImbuementsSheet.log(false, 'saving', {
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

		ImbuementsSheet.log(false, 'Button clicked!', {
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
	registerPackageDebugFlag(ImbuementsSheet.ID);
});

Hooks.once('init', () => {
	ImbuementsSheet.initialize();
});

Hooks.on('renderItemSheet', async (itemSheet, html) => {
	ImbuementsSheet.log(false, 'renderItemSheet', ' | ', {
		itemSheet,
		html,
	});

	const itemType = itemSheet.object.type;
	const itemID = itemSheet.object._id;
	const actorID = itemSheet.actor._id;

	// Bind the current tab.
	// This is the callback function.
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

	await ImbuementsSheet.renderImbuementsTab(html, itemID, actorID);

	// Click on New Imbuements button
	html.on('click', '.new-imbuement', (event) => {
		ImbuementsSheetData.createImbuement(actorID, itemID, {});
		event.stopPropagation();
		return false;
	});

	// click on Remove Imbuement button
	html.on('click', '.delete-imbuement', (event) => {
		const imbuementID = event.currentTarget.getAttribute('data-imbuement-id');
		ImbuementsSheet.log(
			false,
			'Imbuement deleted',
			' | ',
			ImbuementsSheetData.getImbuementsForItem(actorID, itemID)[imbuementID]
		);
		ImbuementsSheetData.deleteImbuement(actorID, imbuementID);
		event.stopPropagation();
		return false;
	});

	itemSheet._tabs[0].activate(itemSheet._tabs[0]._activeCustom);

	// Click on Configure Imbuement Button
	html.on('click', '.configure-imbuement', (event) => {
		const imbuementID = event.currentTarget.getAttribute('data-imbuement-id');

		ImbuementsSheet.log(false, {
			actorID,
			imbuementID,
			itemID,
			itemType,
		});

		ImbuementsSheet.ImbuementsConfigSheet.render(true, {
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
		const imbuementID = clickedElement.getAttribute('data-imbuement-id');
		const imbuement = ImbuementsSheetData.getImbuementsForItem(actorID, itemID)[
			imbuementID
		];
		const changeValue = Number(clickedElement.previousElementSibling.value);

		switch (true) {
			case Number.isInteger(changeValue) && changeValue > 0:
				// Valid input.
				ImbuementsSheet.log(false, 'add-gold-button clicked | ', {
					event,
					imbuementID,
					actorID,
					itemID,
					changeValue,
					imbuement,
				});

				ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
					imbuedValue: imbuement.imbuedValue + changeValue,
				});
				event.stopPropagation();
				break;

			case !Number.isInteger(changeValue):
				// Input is not an integer.
				ImbuementsSheet.log(true, 'Add Gold | ', { changeValue });
				ui.notifications.error(
					'Cannot add decimal gold values. Please enter a whole number integer.'
				);
				ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
				event.stopPropagation();
				break;

			case changeValue < 0:
				// Input is less than 0
				ui.notifications.error(
					'Cannot add negative gold values. Please enter a whole number integer.'
				);
				ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
				event.stopPropagation();
				break;

			case isNaN(changeValue):
				// Input is not a number.
				ui.notifications.error(
					'Cannot add non-number gold values. Please enter a whole number integer.'
				);
				ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
				event.stopPropagation();
				break;
		}
	});

	// Click on - button
	html.on('click', '.subtract-gold-button', (event) => {
		const clickedElement = event.currentTarget;
		const imbuementID = clickedElement.getAttribute('data-imbuement-id');
		const imbuement = ImbuementsSheetData.getImbuementsForItem(actorID, itemID)[
			imbuementID
		];
		const changeValue = Number(
			clickedElement.previousElementSibling.previousElementSibling.value
		);

		ImbuementsSheet.log(false, 'Subtract Gold Button Clicked | ', {
			event,
			imbuementID,
			actorID,
			itemID,
			changeValue,
			imbuement,
		});

		switch (true) {
			case Number.isInteger(changeValue) && changeValue > 0:
				// Valid input.
				ImbuementsSheet.log(false, 'subtract-gold-button clicked | ', {
					event,
					imbuementID,
					actorID,
					itemID,
					changeValue,
					imbuement,
				});

				ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
					imbuedValue: imbuement.imbuedValue - changeValue,
				});
				event.stopPropagation();
				break;

			case !Number.isInteger(changeValue):
				// Input is not an integer.
				ImbuementsSheet.log(true, 'Subtract Gold | ', { changeValue });
				ui.notifications.error(
					'Cannot add decimal gold values. Please enter a whole number integer.'
				);
				ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
				event.stopPropagation();
				break;

			case changeValue < 0:
				// Input is less than 0
				ui.notifications.error(
					'Cannot add negative gold values. Please enter a whole number integer.'
				);
				ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
				event.stopPropagation();
				break;

			case isNaN(changeValue):
				// Input is not a number.
				ui.notifications.error(
					'Cannot add non-number gold values. Please enter a whole number integer.'
				);
				ImbuementsSheetData.updateImbuement(actorID, imbuementID, {});
				event.stopPropagation();
				break;
		}
	});
});
