class ImbuementsSheet {
	static ID = 'Battlezoo-Monster-Parts-Crafting-for-Pathfinder-2e';

	static FLAGS = {
		IMBUEMENTS: 'imbuements',
	};

	static TEMPLATES = {
		ImbuementsSheet: `modules/${this.ID}/templates/monsterParts.hbs`,
	};
}

class ImbuementsSheetData {
	// get all of the imbued properties on an item
	static getImbuementsForItem(itemID) {
		return game.items
			.get(itemID)
			?.getFlag(ImbuementsSheet.ID, ImbuementsSheet.FLAGS.IMBUEMENTS);
	}

	// create a new imbuement
	static createImbuement(itemID, imbuementData) {
		const newImbuement = {
			...imbuementData,
			id: foundry.utils.randomID(16),
			name: 'New Imbuement',
			itemID,
			imbuedValue: {
				pp: 0,
				gp: 0,
				sp: 0,
				cp: 0,
			},
		};

		// construct the update to insert the new imbuement
		const newImbuements = {
			[newImbuement.id]: newImbuement,
		};

		console.log(newImbuements);

		return game.items
			.get(itemID)
			?.setFlag(
				ImbuementsSheet.ID,
				ImbuementsSheet.FLAGS.IMBUEMENTS,
				newImbuements
			);
	}

	// get all imbuements.
	static get allImbuements() {
		const allImbuements = game.items.reduce((accumulator, item) => {
			const itemImbuements = this.getImbuementsForItem(item._id);

			return {
				...accumulator,
				...itemImbuements,
			};
		}, {});

		return allImbuements;
	}

	static updateImbuement(imbuementID, updateData) {
		const relevantImbuement = this.allImbuements[imbuementID];

		// construct the update to send
		const update = {
			[imbuementID]: updateData,
		};

		return game.items
			.get(relevantImbuement.itemID)
			?.setFlag(ImbuementsSheet.ID, ImbuementsSheet.FLAGS.IMBUEMENTS, update);
	}

	static deleteImbuement(imbuementID) {
		const relevantImbuement = this.allImbuements[imbuementID];

		const keyDeletion = {
			[`-=${imbuementID}`]: null,
		};

		return game.items
			.get(relevantImbuement.itemID)
			?.setFlag(
				ImbuementsSheet.ID,
				ImbuementsSheet.FLAGS.IMBUEMENTS,
				keyDeletion
			);
	}
}

Hooks.on('renderItemSheet', (itemSheet, html) => {
	const itemSheetTabs = html.find('[class="tabs"]');
	const ImbuementsSheetBody = html.find('[class="sheet-body"]');
	const itemID = itemSheet.object._id;

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
	for (let imbuementID in ImbuementsSheetData.getImbuementsForItem(itemID)) {
		const imbuement =
			ImbuementsSheetData.getImbuementsForItem(itemID)[imbuementID];
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
						<a class="edit-imbuement" data-tooltip="Edit Imbuement" data-imbuement-id="${imbuementID}">
							<i class="fa-solid fa-fw fa-edit"></i>
						<a class="delete-imbuement" data-tooltip="Remove Imbuement" data-imbuement-id="${imbuementID}">
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
		ImbuementsSheetData.createImbuement(itemID, {
			label: foundry.utils.randomID(16),
		});
		event.stopPropagation();
		return false;
	});

	// click on Remove Imbuement button
	html.on('click', '.delete-imbuement', (event) => {
		console.log('Imbuement deleted.');
		const imbuementID = event.currentTarget.getAttribute('data-imbuement-id');
		ImbuementsSheetData.deleteImbuement(imbuementID);
		event.stopPropagation();
		return false;
	});

	itemSheet._tabs[0].activate(itemSheet._tabs[0]._activeCustom);

	// Click on Edit Imbuement Button
	html.on('click', '.edit-imbuement', (event) => {
		const imbuementID = event.currentTarget.getAttribute('data-imbuement-id');
		const imbuement =
			ImbuementsSheetData.getImbuementsForItem(itemID)[imbuementID];
		const editImbuementDialog = `
			<form autocomplete="off">
				<div class="form-group">
					<label>Name:</label>
					<input id="${imbuementID}-name" type="text" value="${imbuement.name}" placeholder="${imbuement.name}"></input>
				</div>
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
						// console.log(html.find('input').val());
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
						const imbuementName = html.find(`#${imbuementID}-name`).val();

						ImbuementsSheetData.updateImbuement(imbuementID, {
							name: imbuementName,
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
