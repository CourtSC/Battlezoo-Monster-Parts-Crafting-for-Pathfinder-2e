import * as CONSTANTS from './constants.js';

export const logger = (force, ...args) => {
	const shouldLog =
		force ||
		game.modules.get('_dev-mode')?.api?.getPackageDebugValue(CONSTANTS.ID);

	if (shouldLog) {
		console.log(CONSTANTS.ID, '|', ...args);
	}
};
