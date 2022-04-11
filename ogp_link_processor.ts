import { App } from "obsidian";
import * as Yaml from "yaml";

import { YamlParseError, NoRequiredParamsError } from "errors";
import { linkMetadata } from "interfaces";

export class ogpLinkProcessor {
  app: App;

  constructor(app: App) {
    this.app = app;
  }

  getURLMetaData(source: string): linkMetadata {
    let yaml: Partial<linkMetadata>;

    try {
      yaml = Yaml.parse(source) as linkMetadata;
    } catch (error) {
      console.log(error);
      throw new YamlParseError(
        "failed to parse yaml. Check debug console for more detail."
      );
    }

    if (!yaml || !yaml.url || !yaml.title) {
      throw new NoRequiredParamsError(
        "required params[url, title] are not found."
      );
    }

    return {
      url: yaml.url,
      title: yaml.title,
      description: yaml.description,
      host: yaml.host,
      favicon: yaml.favicon,
      image: yaml.image,
    };
  }

  genErrorEl(errorMsg: string): HTMLElement {
    const containerEl = document.createElement("div");
    containerEl.addClass("obsidian-ogp-error-container");

    const spanEl = document.createElement("span");
    spanEl.textContent = `ogplink error: ${errorMsg}`;
    containerEl.appendChild(spanEl);

    return containerEl;
  }

  genLinkEl(data: linkMetadata): HTMLElement {
    const containerEl = document.createElement("div");
    containerEl.addClass("obsidian-ogp-container");

    const cardEl = document.createElement("a");
    cardEl.addClass("obsidian-ogp-card");
    cardEl.setAttr("href", data.url);
    containerEl.appendChild(cardEl);

    const mainEl = document.createElement("div");
    mainEl.addClass("obsidian-ogp-main");
    cardEl.appendChild(mainEl);

    const titleEl = document.createElement("div");
    titleEl.addClass("obsidian-ogp-title");
    titleEl.textContent = data.title;
    mainEl.appendChild(titleEl);

    const descriptionEl = document.createElement("div");
    descriptionEl.addClass("obsidian-ogp-description");
    if (data.description) {
      descriptionEl.textContent = data.description;
    }
    mainEl.appendChild(descriptionEl);

    const hostEl = document.createElement("div");
    hostEl.addClass("obsidian-ogp-host");
    mainEl.appendChild(hostEl);

    const faviconEl = document.createElement("img");
    faviconEl.addClass("obsidian-ogp-favicon");
    if (data.favicon) {
      faviconEl.setAttr("src", data.favicon);
    }
    faviconEl.setAttr("width", 14);
    faviconEl.setAttr("height", 14);
    faviconEl.setAttr("alt", "");
    hostEl.appendChild(faviconEl);

    const hostNameEl = document.createElement("span");
    if (data.host) {
      hostNameEl.textContent = data.host;
    }
    hostEl.appendChild(hostNameEl);

    const thumbnailEl = document.createElement("div");
    thumbnailEl.addClass("obsidian-ogp-thumbnail");
    cardEl.appendChild(thumbnailEl);

    const thumbnailImgEl = document.createElement("img");
    thumbnailImgEl.addClass("obsidian-ogp-thumbnail-img");
    if (data.image) {
      thumbnailImgEl.setAttr("src", data.image);
    }
    thumbnailImgEl.setAttr("alt", "");
    thumbnailEl.appendChild(thumbnailImgEl);

    return containerEl;
  }

  async run(source: string, el: HTMLElement) {
    try {
      const data = this.getURLMetaData(source);
      el.appendChild(this.genLinkEl(data));
    } catch (error) {
      if (error instanceof NoRequiredParamsError) {
        el.appendChild(this.genErrorEl(error.message));
      } else if (error instanceof YamlParseError) {
        el.appendChild(this.genErrorEl(error.message));
      } else {
        console.log("Code Block: ogplink unknown error", error);
      }
    }
  }
}
