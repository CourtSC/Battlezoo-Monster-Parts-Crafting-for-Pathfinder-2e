class imbuementsSheet {
	static ID = 'Battlezoo-Monster-Parts-Crafting-for-Pathfinder-2e';

	static IMBUEMENTS = 'imbuements';

	static TEMPLATES = `modules/${this.ID}/templates/monsterParts.hbs`;
}

Hooks.on('renderItemSheetPF2e', (itemSheet, html) => {
	// find the element which has the item sheet tabs
	const itemSheetTabs = html.find('[class="sheet-tabs tabs"]');

	itemSheetTabs.append(
		"<a class='list-row' data-tab='imbuements'>Imbuements</a>"
	);
});
