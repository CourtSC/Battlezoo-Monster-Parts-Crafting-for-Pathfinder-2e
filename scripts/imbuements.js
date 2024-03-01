export class Imbuements {
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
				MonsterParts.log(false, 'Weapon/Armor Imbuements Initialized | ', {
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

				MonsterParts.log(false, 'Equipment Imbuements Initialized | ', {
					imbuement,
					itemSheet,
				});

				return imbuement;
				break; // Don't want to forget to add break if I change how this function returns.
		}
	}

	static getImbuements(itemSheet) {
		return itemSheet.flags[MonsterParts.ID]?.[MonsterParts.FLAGS.IMBUEMENTS];
	}
}
