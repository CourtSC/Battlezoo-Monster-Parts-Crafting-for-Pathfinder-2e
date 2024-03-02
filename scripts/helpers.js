import * as CONSTANTS from './constants.js';

export const fetchJsonWithTimeout = async (path) => {
	return await foundry.utils.fetchJsonWithTimeout(path);
};

export const getMonsterPartsFlags = (itemSheet) => {
	return itemSheet.flags[CONSTANTS.ID];
};

export const getImbuements = (itemSheet) => {
	return itemSheet.flags[CONSTANTS.ID]?.[CONSTANTS.FLAGS.IMBUEMENTS];
};

export const getRefinement = (itemSheet) => {
	return itemSheet.flags[CONSTANTS.ID]?.[CONSTANTS.FLAGS.REFINEMENT];
};
