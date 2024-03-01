export const logger = (force, ...args) => {
	const shouldLog =
		force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

	if (shouldLog) {
		console.log(MonsterParts.ID, '|', ...args);
	}
};
