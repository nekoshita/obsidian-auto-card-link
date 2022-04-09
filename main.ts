import { EditorExtensions } from "./editor-enhancements";
import { Plugin, MarkdownView, Editor } from "obsidian";
import {
  AutoLinkTitleSettings,
  AutoLinkTitleSettingTab,
  DEFAULT_SETTINGS,
} from "./settings";
import { CheckIf } from "checkif";

interface PasteFunction {
  (this: HTMLElement, ev: ClipboardEvent): void;
}

export default class ObsidianOGP extends Plugin {
  settings?: AutoLinkTitleSettings;
  pasteFunction?: PasteFunction;

  async onload() {
    console.log("loading obsidian-auto-link-title");
    await this.loadSettings();

    // Listen to paste event
    this.pasteFunction = this.pasteUrlByIframe.bind(this);

    this.addCommand({
      id: "auto-link-title-paste",
      name: "Paste URL and auto fetch title",
      callback: () => {
        this.manualPasteUrlByIframe();
      },
      hotkeys: [],
    });

    this.registerEvent(
      this.app.workspace.on("editor-paste", this.pasteFunction)
    );

    this.addCommand({
      id: "enhance-url-with-title",
      name: "Enhance existing URL with link and title",
      callback: () => this.addTitleToLink(),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "e",
        },
      ],
    });

    this.addSettingTab(new AutoLinkTitleSettingTab(this.app, this));
  }

  addTitleToLink(): void {
    // Only attempt fetch if online
    if (!navigator.onLine) return;
    const editor = this.getEditor();
    if (!editor) return;
    const selectedText = (
      EditorExtensions.getSelectedText(editor) || ""
    ).trim();

    // If the cursor is on a raw html link, convert to a markdown link and fetch title
    if (CheckIf.isUrl(selectedText)) {
      this.convertUrlToIframe(editor, selectedText);
    }
    // If the cursor is on the URL part of a markdown link, fetch title and replace existing link title
    else if (CheckIf.isLinkedUrl(selectedText)) {
      const link = this.getUrlFromLink(selectedText);
      this.convertUrlToIframe(editor, link);
    }
  }

  // Simulate standard paste but using editor.replaceSelection with clipboard text since we can't seem to dispatch a paste event.
  async manualPasteUrlByIframe(): Promise<void> {
    const editor = this.getEditor();
    if (!editor) return;

    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText == null || clipboardText == "") return;

    // Only attempt fetch if online
    if (!navigator.onLine) {
      editor.replaceSelection(clipboardText);
      return;
    }

    // If its not a URL, we return false to allow the default paste handler to take care of it.
    // Similarly, image urls don't have a meaningful <title> attribute so downloading it
    // to fetch the title is a waste of bandwidth.
    if (!CheckIf.isUrl(clipboardText) || CheckIf.isImage(clipboardText)) {
      editor.replaceSelection(clipboardText);
      return;
    }

    const selectedText = (
      EditorExtensions.getSelectedText(editor) || ""
    ).trim();
    if (selectedText && !this.settings?.shouldReplaceSelection) {
      // If there is selected text and shouldReplaceSelection is false, do not fetch title
      editor.replaceSelection(clipboardText);
      return;
    }

    // If it looks like we're pasting the url into a markdown link already, don't fetch title
    // as the user has already probably put a meaningful title, also it would lead to the title
    // being inside the link.
    if (CheckIf.isMarkdownLinkAlready(editor) || CheckIf.isAfterQuote(editor)) {
      editor.replaceSelection(clipboardText);
      return;
    }

    // At this point we're just pasting a link in a normal fashion, fetch its title.
    this.convertUrlToIframe(editor, clipboardText);
    return;
  }

  async pasteUrlByIframe(clipboard: ClipboardEvent): Promise<void> {
    if (!this.settings?.enhanceDefaultPaste) {
      return;
    }

    // Only attempt fetch if online
    if (!navigator.onLine) return;

    const editor = this.getEditor();
    if (!editor) return;

    if (clipboard.clipboardData == null) return;

    const clipboardText = clipboard.clipboardData.getData("text/plain");
    if (clipboardText == null || clipboardText == "") return;

    // If its not a URL, we return false to allow the default paste handler to take care of it.
    // Similarly, image urls don't have a meaningful <title> attribute so downloading it
    // to fetch the title is a waste of bandwidth.
    if (!CheckIf.isUrl(clipboardText) || CheckIf.isImage(clipboardText)) {
      return;
    }

    const selectedText = (
      EditorExtensions.getSelectedText(editor) || ""
    ).trim();
    if (selectedText && !this.settings.shouldReplaceSelection) {
      // If there is selected text and shouldReplaceSelection is false, do not fetch title
      return;
    }

    // We've decided to handle the paste, stop propagation to the default handler.
    clipboard.stopPropagation();
    clipboard.preventDefault();

    // If it looks like we're pasting the url into a markdown link already, don't fetch title
    // as the user has already probably put a meaningful title, also it would lead to the title
    // being inside the link.
    if (CheckIf.isMarkdownLinkAlready(editor) || CheckIf.isAfterQuote(editor)) {
      editor.replaceSelection(clipboardText);
      return;
    }

    // At this point we're just pasting a link in a normal fashion, fetch its title.
    this.convertUrlToIframe(editor, clipboardText);
    return;
  }

  async convertUrlToIframe(editor: Editor, url: string): Promise<void> {
    // Generate a unique id for find/replace operations for the title.
    const pasteId = this.createBlockHash();
    const fetchingText = `[Fetching Data#${pasteId}](${url})`;

    // Instantly paste so you don't wonder if paste is broken
    editor.replaceSelection(fetchingText);

    const data = await ajaxPromise({
      url: `http://iframely.server.crestify.com/iframely?url=${url}`,
    }).then((res) => {
      return JSON.parse(res);
    });
    const imageLink = data.links[0].href || "";
    const faviconLink = data.links.find((link: { rel: string[] }) => {
      return link.rel.includes("icon");
    }).href;
    const title = (data.meta.title || "").replace(/\s{3,}/g, " ").trim();
    const description = (data.meta.description || "")
      .replace(/\s{3,}/g, " ")
      .trim();
    const { hostname } = new URL(url);

    const text = editor.getValue();
    const start = text.indexOf(fetchingText);
    if (start < 0) {
      console.log(
        `Unable to find text "${fetchingText}" in current editor, bailing out; link ${url}`
      );
    } else {
      const end = start + fetchingText.length;
      const startPos = EditorExtensions.getEditorPositionFromIndex(text, start);
      const endPos = EditorExtensions.getEditorPositionFromIndex(text, end);

      editor.replaceRange(
        `<div class="obsidian-ogp-card-container">
  <a href="${url}" class="obsidian-ogp-card-card">
    <div class="obsidian-ogp-card-main">
      <h1 class="obsidian-ogp-card-title">${title}</h1>
      <div class="obsidian-ogp-card-description">${description}</div>
      <div class="obsidian-ogp-card-host">
        <img src="${faviconLink}" width="14" height="14" class="obsidian-ogp-card-favicon" alt="">${hostname}
      </div>
    </div>
    <div class="obsidian-ogp-card-thumbnail">
      <img src="${imageLink}" alt="" class="obsidian-ogp-card-thumbnail-img">
    </div>
  </a>
</div>
`,
        startPos,
        endPos
      );
    }
  }

  private getEditor(): Editor | undefined {
    const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeLeaf == null) return;
    return activeLeaf.editor;
  }

  public getUrlFromLink(link: string): string {
    const urlRegex = new RegExp(DEFAULT_SETTINGS.linkRegex);
    const regExpExecArray = urlRegex.exec(link);
    if (regExpExecArray === null || regExpExecArray.length < 2) {
      return "";
    }
    return regExpExecArray[2];
  }

  // Custom hashid by @shabegom
  private createBlockHash(): string {
    let result = "";
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < 4; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  onunload() {
    console.log("unloading obsidian-auto-link-title");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
