import { Plugin, Notice } from 'obsidian';

interface PasteFunction {
    (this: HTMLElement, ev: ClipboardEvent): void;
  }
  
export default class ObsidianOGP extends Plugin {
    async onload() {
        const ribbonIconEl = this.addRibbonIcon('dice', 'Obsidian OGP', () => {
			new Notice('Hello world!');
		});
        ribbonIconEl.addClass('my-plugin-ribbon-class');
    }
}
