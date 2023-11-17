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
			itemID,
		};

		// construct the update to insert the new imbuement
		const newImbuements = {
			[newImbuement.id]: newImbuement,
		};

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
}

Hooks.on('renderItemSheetPF2e', (itemSheet, html) => {
	// find the element which has the item sheet tabs
	const itemSheetTabs = html.find('[class="sheet-tabs tabs"]');
	const imbuementsSheetBody = html.find('[class="sheet-body"]');
	const itemID = itemSheet.object._id;

	itemSheetTabs.append(
		`<a class='list-row' data-tab='imbuements'>Imbuements</a>`
	);

	imbuementsSheetBody.append(
		`<section class="tab imbuements" data-tab="imbuements">
			<div class="imbuements">
				<div class="add-imbuement">
					<a class="new-imbuement">
						<i class="fa-solid fa-plus"></i> New Imbuement
					</a>
				</div>
			</div> 
		</section>`
	);

	// append existing properties
	const imbuedPropertiesList = html.find('[class="imbuements"]');
	// imbuementsSheetData.getImbuementsForItem(itemID);

	html.on('click', '.new-imbuement', (event) => {
		console.log(`${imbuementsSheet.ID} | New imbuement added.`);

		imbuedPropertiesList.append(
			`<div class="imbuement-form-group">
				<input id="WeaponSheetPF2e-Item-${itemID}-imbued-property" type="text" name="system.imbuement">
			</div>`
		);
	});
});
