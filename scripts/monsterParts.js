class ImbuementsSheet {
	static ID = 'Battlezoo-Monster-Parts-Crafting-for-Pathfinder-2e';

	static FLAGS = {
		IMBUEMENTS: 'imbuements',
	};

	static TEMPLATES = {
		WeaponImbuedPropertiesSheet: `modules/${this.ID}/templates/weapon-imbued-properties-sheet.hbs`,
	};

	static log(force, ...args) {
		const shouldLog =
			force ||
			game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

		if (shouldLog) {
			console.log(this.ID, '|', ...args);
		}
	}

	static initializeWeaponConfig() {
		this.WeaponImbuementsSheetConfig = new WeaponImbuementsSheetConfig();
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
			imbuedValue: {
				pp: 0,
				gp: 0,
				sp: 0,
				cp: 0,
			},
			formDataProperty: '',
			formDataPath: '',
		};

		// construct the update to insert the new imbuement
		const newImbuements = {
			[newImbuement.id]: newImbuement,
		};

		console.log(newImbuements);

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

class WeaponImbuementsSheetConfig extends FormApplication {
	static get defaultOptions() {
		const defaults = super.defaultOptions;

		const overrides = {
			id: 'weapon-imbuements-sheet',
			template: ImbuementsSheet.TEMPLATES.WeaponImbuedPropertiesSheet,
			title: 'Configure Imbuement',
			closeOnSubmit: false,
			submitOnChange: true,
			actorID: this.actorID,
			imbuementID: this.imbuementID,
			itemID: this.itemID,
		};

		const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

		return mergedOptions;
	}

	async getData(options) {
		const imbuedProperties = await foundry.utils.fetchJsonWithTimeout(
			`modules/${ImbuementsSheet.ID}/data/imbuements.json`
		);
		ImbuementsSheet.log(false, 'getData options', {
			options,
		});
		return {
			weaponProp: imbuedProperties.weapon,
			skillProp: imbuedProperties.skill,
			armorProp: imbuedProperties.armor,
			shieldProp: imbuedProperties.shield,
			perceptionProp: imbuedProperties.perception,
			actorID: options.actorID,
			imbuementID: options.imbuementID,
			itemID: options.itemID,
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

		switch (action) {
			case 'save': {
				const updateData = {
					name: `${imbuement.formDataProperty} ${imbuement.formDataPath}`,
					imbuedProperty: imbuement.formDataProperty,
					imbuedPath: imbuement.formDataPath,
				};

				ImbuementsSheetData.updateImbuement(actorID, imbuementID, updateData);
				ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
					formDataProperty: '',
					formDataPath: '',
				});
				this.close();
				break;
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

		ImbuementsSheet.log(true, 'Button clicked!', {
			this: this,
			action,
			actorID,
			imbuementID,
			itemID,
			event,
		});
	}
}

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
	registerPackageDebugFlag(ImbuementsSheet.ID);
});

Hooks.once('init', () => {
	ImbuementsSheet.initializeWeaponConfig();
});

Hooks.on('renderItemSheet', async (itemSheet, html) => {
	const itemType = itemSheet.object.type;
	const itemSheetTabs = html.find('[class="tabs"]');
	const ImbuementsSheetBody = html.find('[class="sheet-body"]');
	const itemID = itemSheet.object._id;
	const actorID = itemSheet.actor._id;

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

	itemSheetTabs.append(
		`<a class='list-row' data-tab='imbuements'>Imbuements</a>`
	);

	ImbuementsSheetBody.append(
		`<section class="tab imbuements" data-tab="imbuements">
			<div class="imbuements">
			</div> 
		</section>`
	);

	// Populate the Imbuements sheet with existing imbuements
	const imbuedPropertiesSection = html.find('[class="imbuements"]');
	for (let imbuementID in ImbuementsSheetData.getImbuementsForItem(
		actorID,
		itemID
	)) {
		const imbuement = ImbuementsSheetData.getImbuementsForItem(actorID, itemID)[
			imbuementID
		];
		imbuedPropertiesSection.append(
			`<div class="imbuement-form-group">
				<fieldset>
					<legend>${imbuement.name}</legend>
					<div class="imbuement-values">
						${Number(
							(
								parseInt(imbuement.imbuedValue.pp) * 10 +
								parseInt(imbuement.imbuedValue.gp) +
								parseInt(imbuement.imbuedValue.sp) / 10 +
								parseInt(imbuement.imbuedValue.cp) / 100
							).toFixed(2)
						)} gp
					</div>
					<div class="imbuement-fieldset-controls">
						<a class="configure-imbuement" data-tooltip="Configure Imbuement" data-actor-id="${actorID}" data-imbuement-id="${imbuementID}">
							<i class="fas fa-edit"> </i>
						<a class="edit-imbuement-value" data-tooltip="Edit Imbuement Value" data-actor-id="${actorID}" data-imbuement-id="${imbuementID}">
							<i class="fa-solid fa-coins"> </i>
						<a class="delete-imbuement" data-tooltip="Remove Imbuement" data-actor-id="${actorID}" data-imbuement-id="${imbuementID}">
							<i class="fa-solid fa-fw fa-trash"></i>
						</a>
					</div>
				</fieldset>
			</div>`
		);
	}

	// New Imbuement button
	imbuedPropertiesSection.append(
		`<div class="add-imbuement">
			<a class="new-imbuement">
				<i class="fa-solid fa-plus"></i> New Imbuement
			</a>
		</div>`
	);

	// Click on New Imbuements button
	html.on('click', '.new-imbuement', (event) => {
		console.log('Imbuement created.');
		ImbuementsSheetData.createImbuement(actorID, itemID, {
			label: foundry.utils.randomID(16),
		});
		event.stopPropagation();
		return false;
	});

	// click on Remove Imbuement button
	html.on('click', '.delete-imbuement', (event) => {
		console.log('Imbuement deleted.');
		const imbuementID = event.currentTarget.getAttribute('data-imbuement-id');
		ImbuementsSheetData.deleteImbuement(actorID, imbuementID);
		event.stopPropagation();
		return false;
	});

	itemSheet._tabs[0].activate(itemSheet._tabs[0]._activeCustom);

	// Click on Configure Imbuement Button
	html.on('click', '.configure-imbuement', (event) => {
		const actorID = event.currentTarget.getAttribute('data-actor-id');
		const imbuementID = event.currentTarget.getAttribute('data-imbuement-id');
		const imbuement = ImbuementsSheetData.getImbuementsForItem(actorID, itemID)[
			imbuementID
		];

		ImbuementsSheet.WeaponImbuementsSheetConfig.render(true, {
			actorID,
			imbuementID,
			itemID,
		});
	});

	// Click on Edit Imbuement Value Button
	html.on('click', '.edit-imbuement-value', (event) => {
		const imbuementID = event.currentTarget.getAttribute('data-imbuement-id');
		const actorID = event.currentTarget.getAttribute('data-actor-id');
		const imbuement = ImbuementsSheetData.getImbuementsForItem(actorID, itemID)[
			imbuementID
		];
		const editImbuementDialog = `
				<form autocomplete="off">
					<div class="form-group">
						<label>Platinum:</label>
						<input id="${imbuementID}-pp-value" type="number" value="0" step="1"></input>
					</div>
					<div class="form-group">
						<label>Gold:</label>
						<input id="${imbuementID}-gp-value" type="number" value="0" step="1"></input>
					</div>
					<div class="form-group">
						<label>Silver:</label>
						<input id="${imbuementID}-sp-value" type="number" value="0" step="1"></input>
					</div>
					<div class="form-group">
						<label>Copper:</label>
						<input id="${imbuementID}-cp-value" type="number" value="0" step="1"></input>
					</div>
				</form>
						`;

		const addImbuementValue = (currentVal, addedVal) => {
			if (isNaN(addedVal)) {
				console.log(addedVal);
				return currentVal;
			} else {
				return parseInt(currentVal) + addedVal;
			}
		};

		const editWindowDialog = new Dialog({
			title: imbuement.name,
			content: editImbuementDialog,
			buttons: {
				saveButton: {
					label: 'Add Values',
					callback: (html) => {
						const imbuedValue = {
							pp: addImbuementValue(
								imbuement.imbuedValue.pp,
								parseInt(html.find(`#${imbuementID}-pp-value`).val())
							),
							gp: addImbuementValue(
								imbuement.imbuedValue.gp,
								parseInt(html.find(`#${imbuementID}-gp-value`).val())
							),
							sp: addImbuementValue(
								imbuement.imbuedValue.sp,
								parseInt(html.find(`#${imbuementID}-sp-value`).val())
							),
							cp: addImbuementValue(
								imbuement.imbuedValue.cp,
								parseInt(html.find(`#${imbuementID}-cp-value`).val())
							),
						};

						ImbuementsSheetData.updateImbuement(actorID, imbuementID, {
							imbuedValue: imbuedValue,
						});
					},
					icon: `<i class="fas fa-save"></i>`,
				},
			},
			default: 'saveButton',
			close: (html) => {
				console.log(html);
			},
		});
		editWindowDialog.render(true);
		event.stopPropagation();
		return false;
	});
});
