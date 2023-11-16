Hooks.on('renderItemSheetPF2e', (itemSheet, html) => {
	// find the element which has the item sheet tabs
	const itemSheetTabs = html.find('[class="sheet-tabs tabs"]');

	itemSheetTabs.append(
		"<a class='list-row' data-tab='imbuements'>Imbuements</a>"
	);
});
