import * as CONSTANTS from './constants.js';
import { logger } from './logger.js';
import * as helpers from './helpers.js';

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
				logger(false, 'Weapon/Armor Imbuements Initialized | ', {
					imbuements,
					itemSheet,
				});
				return imbuements;
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
				logger(false, 'Equipment Imbuements Initialized | ', {
					imbuement,
					itemSheet,
				});
				return imbuement;
		}
	}

	static async applyImbuementRules(imbuementID, imbuementPath) {
		const label = `{item|flags.${CONSTANTS.ID}.imbuements.${imbuementID}.name}`;
		const damageType = `{item|flags.${CONSTANTS.ID}.imbuements.${imbuementID}.imbuedProperty}`;
		const field = `item|flags.${CONSTANTS.ID}.imbuements.${imbuementID}.imbuementLevel`;
		const imbuementLevel = `{item|flags.${CONSTANTS.ID}.imbuements.${imbuementID}.imbuementLevel}`;

		switch (imbuementPath) {
			case 'might': {
				const damageDice = await helpers.fetchJsonWithTimeout(
					CONSTANTS.RULES.MIGHTDAMAGEDICE
				);
				damageDice.label = label;
				damageDice.damageType = damageType;
				damageDice.value.field = field;
				damageDice.predicate = [
					{
						gte: [imbuementLevel, 6],
					},
				];

				const flatModifier = await helpers.fetchJsonWithTimeout(
					CONSTANTS.RULES.MIGHTFLATMODIFIER
				);
				flatModifier.label = label;
				flatModifier.damageType = damageType;
				flatModifier.value.field = field;
				flatModifier.predicate = [
					{
						gte: [imbuementLevel, 4],
					},
					{
						lte: [imbuementLevel, 5],
					},
				];

				const resistanceNote = await helpers.fetchJsonWithTimeout(
					CONSTANTS.RULES.NOTE
				);
				resistanceNote.title = label;
				resistanceNote.predicate = [
					{
						gte: [imbuementLevel, 12],
					},
				];
				resistanceNote.text = `The ${damageType} damage dealt by this imbued property (including persistent ${damageType} damage) ignores resistances.`;

				const persistentDamageDice = await helpers.fetchJsonWithTimeout(
					CONSTANTS.RULES.MIGHTPERSISTENTDAMAGE
				);
				persistentDamageDice.label = label;
				persistentDamageDice.damageType = damageType;
				persistentDamageDice.value.field = field;

				const weaknessNote = await helpers.fetchJsonWithTimeout(
					CONSTANTS.RULES.NOTE
				);
				weaknessNote.title = label;
				weaknessNote.predicate = [
					{
						gte: [imbuementLevel, 20],
					},
				];
				weaknessNote.text = `On a successful Strike with this weapon, before applying ${damageType} damage, the target gains weakness 1 to ${damageType} until the beginning of your next turn.`;

				return [
					damageDice,
					flatModifier,
					resistanceNote,
					persistentDamageDice,
					weaknessNote,
				];
			}
			case 'magic':
				return [];
			case 'technique': {
				const techniquePersistentFlatModifier =
					await helpers.fetchJsonWithTimeout(
						CONSTANTS.RULES.TECHNIQUEPERSISTENTFLATMODIFIER
					);
				techniquePersistentFlatModifier.value.field = field;
				techniquePersistentFlatModifier.label = label;
				techniquePersistentFlatModifier.damageType = damageType;
				techniquePersistentFlatModifier.predicate = [
					{
						gte: [imbuementLevel, 4],
					},
					{
						lte: [imbuementLevel, 7],
					},
				];

				const techniqueFlatModifier = await helpers.fetchJsonWithTimeout(
					CONSTANTS.RULES.TECHNIQUEFLATMODIFIER
				);
				techniqueFlatModifier.value.field = field;
				techniqueFlatModifier.label = label;
				techniqueFlatModifier.damageType = damageType;
				techniqueFlatModifier.predicate = [
					{
						gte: [imbuementLevel, 6],
					},
				];

				const techniqueDamageDice = await helpers.fetchJsonWithTimeout(
					CONSTANTS.RULES.TECHNIQUEDAMAGEDICE
				);
				techniqueDamageDice.value.field = field;
				techniqueDamageDice.label = label;
				techniqueDamageDice.damageType = damageType;
				techniqueDamageDice.predicate = [
					{
						gte: [imbuementLevel, 8],
					},
				];

				const resistanceNote = await helpers.fetchJsonWithTimeout(
					CONSTANTS.RULES.NOTE
				);
				resistanceNote.title = label;
				resistanceNote.predicate = [
					{
						gte: [imbuementLevel, 12],
					},
				];
				resistanceNote.text = `The ${damageType} damage dealt by this imbued property (including persistent ${damageType} damage) ignores resistances.`;

				const techniqueCriticalPersistentDamage =
					await helpers.fetchJsonWithTimeout(
						CONSTANTS.RULES.TECHNIQUECRITICALPERSISTENTDAMAGE
					);
				techniqueCriticalPersistentDamage.label = `${label} Critical`;
				techniqueCriticalPersistentDamage.damageType = damageType;
				techniqueCriticalPersistentDamage.predicate = [
					{
						gte: [imbuementLevel, 8],
					},
					'check:outcome:critical-success',
				];

				const offGuardNote = await helpers.fetchJsonWithTimeout(
					CONSTANTS.RULES.NOTE
				);
				offGuardNote.text = `Foes currently affected by persistent ${damageType} damage from the ${label} imbued property are distracted, making them off-guard.`;
				offGuardNote.title = label;
				offGuardNote.predicate = [
					{
						gte: [imbuementLevel, 16],
					},
				];

				const splashDamageNote = await helpers.fetchJsonWithTimeout(
					CONSTANTS.RULES.NOTE
				);
				splashDamageNote.text = `At the end of a foe's turn, when they take damage from the ${label} imbued property's persistent ${damageType} damage, all foes adjacent to that foe are effected, taking the same amount of persistent ${damageType} damage.`;
				splashDamageNote.title = label;
				splashDamageNote.predicate = [
					{
						gte: [imbuementLevel, 20],
					},
				];

				return [
					techniquePersistentFlatModifier,
					techniqueFlatModifier,
					techniqueDamageDice,
					resistanceNote,
					techniqueCriticalPersistentDamage,
					offGuardNote,
					splashDamageNote,
				];
			}
		}
	}

	static async updateImbuementLevel(itemSheet, imbuementValue) {
		const levelData = await helpers.fetchJsonWithTimeout(
			CONSTANTS.DATA.IMBUEMENTLEVELDATA
		);
		const itemType = itemSheet.type;
		const itemLevel = itemSheet.system.level.value;
		const imbuementLevel =
			Number(
				Object.keys(levelData[itemType]).find(
					(key) => levelData[itemType][key] > imbuementValue
				) - 1
			) === 0
				? 0
				: Number(
						Object.keys(levelData[itemType]).find(
							(key) => levelData[itemType][key] > imbuementValue
						) - 1
				  ) || 20;

		const lowerLevel = Math.min(imbuementLevel, itemLevel);
		const nextLevel =
			lowerLevel + 1 <= 20 ? levelData[itemType][lowerLevel + 1] : 0;

		logger(false, 'Updating Imbuement Level | ', {
			imbuementLevel,
			itemLevel,
		});

		return {
			imbuementLevel: lowerLevel,
			nextLevel,
		};
	}
}
