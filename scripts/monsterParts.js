class imbuementsSheet {
	static ID = 'Battlezoo-Monster-Parts-Crafting-for-Pathfinder-2e';

	static FLAGS = {
		IMBUEMENTS: 'imbuements',
	};

	static TEMPLATES = {
		IMBUEMENTSSHEET: `modules/${this.ID}/templates/monsterParts.hbs`,
	};
}

class imbuementsSheetData {
	// get all of the imbued properties on an item
	static getImbuementsForItem(itemID) {
		return game.items
			.get(itemID)
			?.getFlag(imbuementsSheet.ID, imbuementsSheet.FLAGS.IMBUEMENTS);
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
				imbuementsSheet.ID,
				imbuementsSheet.FLAGS.IMBUEMENTS,
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
			?.setFlag(imbuementsSheet.ID, imbuementsSheet.FLAGS.IMBUEMENTS, update);
	}

	static deleteImbuement(imbuementID) {
		const relevantImbuement = this.allImbuements[imbuementID];

		const keyDeletion = {
			[`-=${imbuementID}`]: null,
		};

		return game.items
			.get(relevantImbuement.itemID)
			?.setFlag(
				imbuementsSheet.ID,
				imbuementsSheet.FLAGS.IMBUEMENTS,
				keyDeletion
			);
	}
}

Hooks.on('renderItemSheet', (itemSheet, html) => {
	const itemSheetTabs = html.find('[class="sheet-tabs tabs"]');
	const imbuementsSheetBody = html.find('[class="sheet-body"]');
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

	imbuementsSheetBody.append(
		`<section class="tab imbuements" data-tab="imbuements">
			<div class="imbuements">
			</div> 
		</section>`
	);

	// Populate the Imbuements sheet with existing imbuements
	const imbuedPropertiesSection = html.find('[class="imbuements"]');
	for (let imbuementID in imbuementsSheetData.getImbuementsForItem(itemID)) {
		imbuedPropertiesSection.append(
			`<div class="imbuement-form-group">
				<fieldset>
					<legend>${imbuementsSheetData.getImbuementsForItem(itemID)[imbuementID].name}
					</legend>
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
		imbuementsSheetData.createImbuement(itemID, {
			label: foundry.utils.randomID(16),
		});
		event.stopPropagation();
		return false;
	});

	// click on Remove Imbuement button
	html.on('click', '.delete-imbuement', (event) => {
		console.log('Imbuement deleted.');
		const imbuementID = event.currentTarget.getAttribute('data-imbuement-id');
		imbuementsSheetData.deleteImbuement(imbuementID);
		event.stopPropagation();
		return false;
	});

	itemSheet._tabs[0].activate(itemSheet._tabs[0]._activeCustom);

	// Click on Edit Imbuement Button
	html.on('click', '.edit-imbuement', (event) => {
		const imbuementID = event.currentTarget.getAttribute('data-imbuement-id');
		const imbuement =
			imbuementsSheetData.getImbuementsForItem(itemID)[imbuementID];
		const editImbuementDialog = `
			<form autocomplete="off">
				<div class="form-group">
					<label>Name:</label>
					<input id="${imbuementID}-name" type="text" value="${imbuement.name}" placeholder="${imbuement.name}"></input>
				</div>
				<div class="form-group">
					<label>Platinum:</label>
					<input id="${imbuementID}-pp-value" type="number" value="${imbuement.imbuedValue.pp}" min="0"></input>
				</div>
				<div class="form-group">
					<label>Gold:</label>
					<input id="${imbuementID}-gp-value" type="number" value="${imbuement.imbuedValue.gp}" min="0"></input>
				</div>
				<div class="form-group">
					<label>Silver:</label>
					<input id="${imbuementID}-sp-value" type="number" value="${imbuement.imbuedValue.sp}" min="0"></input>
				</div>
				<div class="form-group">
					<label>Copper:</label>
					<input id="${imbuementID}-cp-value" type="number" value="${imbuement.imbuedValue.cp}" min="0"></input>
				</div>
			</form>
					`;

		const editWindowDialog = new Dialog({
			title: imbuement.name,
			content: editImbuementDialog,
			buttons: {
				saveButton: {
					label: 'Save Changes',
					callback: (html) => {
						// console.log(html.find('input').val());
						const imbuedValue = {
							pp: html.find(`#${imbuementID}-pp-value`).val(),
							gp: html.find(`#${imbuementID}-gp-value`).val(),
							sp: html.find(`#${imbuementID}-sp-value`).val(),
							cp: html.find(`#${imbuementID}-cp-value`).val(),
						};
						const imbuementName = html.find(`#${imbuementID}-name`).val();

						imbuementsSheetData.updateImbuement(imbuementID, {
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
