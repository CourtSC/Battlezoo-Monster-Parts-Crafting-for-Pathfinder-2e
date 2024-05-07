import { Imbuements } from './Imbuements.js';
import { logger } from './logger.js';
import { MonsterParts } from './MonsterParts.js';
import * as CONSTANTS from './constants.js';
import * as helpers from './helpers.js';

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
	registerPackageDebugFlag(CONSTANTS.ID);
});

Hooks.on('createItem', async (itemSheet) => {
	if (!itemSheet.flags.hasOwnProperty([CONSTANTS.ID])) {
		MonsterParts.initializeItem(itemSheet);
	}
});

Hooks.on('updateActor', (characterSheet) => {
	const actorID = characterSheet._id;

	for (let idx in characterSheet.items._source) {
		const item = characterSheet.items._source[idx];
		const itemType = item.type;

		if (item.flags.hasOwnProperty(CONSTANTS.ID)) {
			if (item.flags[CONSTANTS.ID][CONSTANTS.FLAGS.REFINEMENT].refined) {
				logger(false, 'updateActor | ', {
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
	const actorID = itemSheet.object?.parent?._id;
	await MonsterParts.renderMonsterPartsTab(html, itemSheet);

	logger(false, 'renderItemSheet', ' | ', {
		itemSheet,
		html,
		itemType,
		itemID,
		actorID,
	});

	// Change the Refinement Path for an Equipment item
	html.on('change', '.monster-parts-refinement-property', async (event) => {
		const imbuements = helpers.getImbuements(itemSheet.object);
		const selectedOption =
			event.currentTarget.selectedOptions[0].attributes[0].value;
		const updatePackage = {
			system: { usage: { type: 'worn', value: 'worn' } },
			flags: {},
		};

		if (selectedOption === 'skill') {
			logger(false, 'Selected Option | ', { selectedOption });
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

			logger(false, 'Skill Item updated | ', {
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
			logger(false, 'Selected Option | ', { selectedOption });
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

			logger(false, 'Perception Item updated | ', {
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
		const imbuements = helpers.getImbuements(itemSheet.object);
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

		logger(false, '.monster-parts-skill changed | ', {
			skill,
		});

		event.stopPropagation();
	});

	// Change the Imbuement Property
	html.on('change', '.monster-parts-property', async (event) => {
		const imbuements = helpers.getImbuements(itemSheet.object);
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

		logger(false, '.monster-parts-property changed | ', {
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
		const imbuements = helpers.getImbuements(itemSheet.object);
		const currentTarget = event.currentTarget;
		const selectedOption = currentTarget.selectedOptions[0].attributes[0].value;
		const imbuementID = currentTarget.getAttribute('data-imbuement-id');

		imbuements[
			imbuementID
		].name = `${imbuements[imbuementID].imbuedProperty} ${selectedOption}`;
		imbuements[imbuementID].imbuedPath = selectedOption;

		updatePackage.system.rules = await Imbuements.applyImbuementRules(
			imbuementID,
			selectedOption
		);

		updatePackage.flags.ruleApplied = true;

		MonsterParts.updateItem(
			itemSheet.object,
			updatePackage.refinementData,
			imbuements,
			{
				system: updatePackage.system,
				flags: updatePackage.flags,
			}
		);

		logger(false, '.monster-parts-property changed | ', {
			event,
			currentTarget,
			selectedOption,
			imbuementID,
			imbuements,
		});
		event.stopPropagation();
	});

	// Click on + button
	html.on('click', '.add-gold-button', async (event) => {
		const imbuements = helpers.getImbuements(itemSheet.object);
		const clickedElement = event.currentTarget;
		const action = clickedElement.dataset.action;
		const changeValue = Number(clickedElement.previousElementSibling.value);

		logger(false, 'add-gold-button clicked | ', {
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
					await MonsterParts.updateItem(
						itemSheet.object,
						{ itemValue },
						{},
						{
							system: { specific: { material: {}, runes: {} } },
							flags: { [CONSTANTS.FLAGS.REFINED]: true },
						}
					);
					event.stopPropagation();
					break;

				case 'imbue-add-gold':
					const imbuementID = clickedElement.getAttribute('data-imbuement-id');

					imbuements[imbuementID].imbuedValue += changeValue;

					const imbuementLevelData = await Imbuements.updateImbuementLevel(
						itemSheet.object,
						imbuements[imbuementID].imbuedValue
					);

					imbuements[imbuementID].imbuementLevel =
						imbuementLevelData.imbuementLevel;

					imbuements[imbuementID].nextLevel = imbuementLevelData.nextLevel;

					await MonsterParts.updateItem(itemSheet.object, {}, imbuements, {
						system: { specific: { material: {}, runes: {} } },
						flags: {},
					});
					event.stopPropagation();
					break;
			}
		} else if (!Number.isInteger(changeValue)) {
			// Input is not an integer.
			logger(false, 'Add Gold | ', { changeValue });
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
	html.on('click', '.subtract-gold-button', async (event) => {
		const imbuements = helpers.getImbuements(itemSheet.object);
		const clickedElement = event.currentTarget;
		const action = clickedElement.dataset.action;
		const changeValue = Number(
			clickedElement.previousElementSibling.previousElementSibling.value
		);

		logger(false, 'Subtract Gold Button Clicked | ', {
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
						await MonsterParts.updateItem(
							itemSheet.object,
							{ itemValue },
							{},
							{
								system: { specific: { material: {}, runes: {} } },
								flags: { [CONSTANTS.FLAGS.REFINED]: true },
							}
						);
						event.stopPropagation();
						break;
					} else {
						await MonsterParts.updateItem(
							itemSheet.object,
							{ itemValue: 0 },
							{},
							{
								system: { specific: {} },
								flags: { [CONSTANTS.FLAGS.REFINED]: false },
							}
						);
						event.stopPropagation();
						break;
					}

				case 'imbue-subtract-gold':
					const imbuementID = clickedElement.getAttribute('data-imbuement-id');

					if (imbuements[imbuementID].imbuedValue - changeValue > 0) {
						imbuements[imbuementID].imbuedValue -= changeValue;

						imbuements[imbuementID].imbuementLevel =
							await Imbuements.updateImbuementLevel(
								itemSheet.object,
								imbuements[imbuementID].imbuedValue
							);

						await MonsterParts.updateItem(itemSheet.object, {}, imbuements, {
							system: {},
							flags: {},
						});
						event.stopPropagation();
						break;
					} else {
						imbuements[imbuementID].imbuedValue = 0;
						imbuements[imbuementID].imbuementLevel =
							await Imbuements.updateImbuementLevel(
								itemSheet.object,
								imbuements[imbuementID].imbuedValue
							);

						await MonsterParts.updateItem(itemSheet.object, {}, imbuements, {
							system: {},
							flags: {},
						});
						event.stopPropagation();
						break;
					}
			}
		} else if (!Number.isInteger(changeValue)) {
			// Input is not an integer.
			logger(false, 'Subtract Gold | ', { changeValue });
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
