import { App } from "obsidian";
import * as Yaml from "yaml";

export class ogpLinkProcessor {
  app: App;

  constructor(app: App) {
    this.app = app;
  }

  async run(source: string, el: HTMLElement) {
    try {
      const yaml = Yaml.parse(source);
      if (!yaml) return;

      const containerEl = document.createElement("div");
      containerEl.addClass("obsidian-ogp-container");

      const cardEl = document.createElement("a");
      cardEl.addClass("obsidian-ogp-card");
      cardEl.setAttr("href", yaml.url);
      containerEl.appendChild(cardEl);

      const mainEl = document.createElement("div");
      mainEl.addClass("obsidian-ogp-main");
      cardEl.appendChild(mainEl);

      const titleEl = document.createElement("div");
      titleEl.addClass("obsidian-ogp-title");
      titleEl.textContent = yaml.title;
      mainEl.appendChild(titleEl);

      const descriptionEl = document.createElement("div");
      descriptionEl.addClass("obsidian-ogp-description");
      descriptionEl.textContent = yaml.description;
      mainEl.appendChild(descriptionEl);

      const hostEl = document.createElement("div");
      hostEl.addClass("obsidian-ogp-host");
      mainEl.appendChild(hostEl);

      const faviconEl = document.createElement("img");
      faviconEl.addClass("obsidian-ogp-favicon");
      faviconEl.setAttr("src", yaml.favicon);
      faviconEl.setAttr("width", 14);
      faviconEl.setAttr("height", 14);
      faviconEl.setAttr("alt", "");
      hostEl.appendChild(faviconEl);

      const hostNameEl = document.createElement("span");
      hostNameEl.textContent = yaml.host;
      hostEl.appendChild(hostNameEl);

      const thumbnailEl = document.createElement("div");
      thumbnailEl.addClass("obsidian-ogp-thumbnail");
      cardEl.appendChild(thumbnailEl);

      const thumbnailImgEl = document.createElement("img");
      thumbnailImgEl.addClass("obsidian-ogp-thumbnail-img");
      thumbnailImgEl.setAttr("src", yaml.image);
      thumbnailImgEl.setAttr("alt", "");
      thumbnailEl.appendChild(thumbnailImgEl);

      el.appendChild(containerEl);
    } catch (error) {
      console.log("Code Block: ogplink", error);
    }
  }
}
