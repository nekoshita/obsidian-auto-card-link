import { Plugin, Notice } from 'obsidian';

export default class ObsidianPluginTemplate extends Plugin {
    async onload() {
        const ribbonIconEl = this.addRibbonIcon('dice', 'Obsidian Plugin Template', () => {
			new Notice('Hello world!');
		});
        ribbonIconEl.addClass('my-plugin-ribbon-class');
    }
}
