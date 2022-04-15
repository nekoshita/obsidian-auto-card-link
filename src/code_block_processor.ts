import { App } from "obsidian";
import * as Yaml from "yaml";

import { YamlParseError, NoRequiredParamsError } from "src/errors";
import { LinkMetadata } from "src/interfaces";

export class CodeBlockProcessor {
  app: App;

  constructor(app: App) {
    this.app = app;
  }

  async run(source: string, el: HTMLElement) {
    try {
      const data = this.parseLinkMetadataFromYaml(source);
      el.appendChild(this.genLinkEl(data));
    } catch (error) {
      if (error instanceof NoRequiredParamsError) {
        el.appendChild(this.genErrorEl(error.message));
      } else if (error instanceof YamlParseError) {
        el.appendChild(this.genErrorEl(error.message));
      } else {
        console.log("Code Block: cardlink unknown error", error);
      }
    }
  }

  private parseLinkMetadataFromYaml(source: string): LinkMetadata {
    let yaml: Partial<LinkMetadata>;

    try {
      yaml = Yaml.parse(source) as Partial<LinkMetadata>;
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

  private genErrorEl(errorMsg: string): HTMLElement {
    const containerEl = document.createElement("div");
    containerEl.addClass("auto-card-link-error-container");

    const spanEl = document.createElement("span");
    spanEl.textContent = `cardlink error: ${errorMsg}`;
    containerEl.appendChild(spanEl);

    return containerEl;
  }

  private genLinkEl(data: LinkMetadata): HTMLElement {
    const containerEl = document.createElement("div");
    containerEl.addClass("auto-card-link-container");

    const cardEl = document.createElement("a");
    cardEl.addClass("auto-card-link-card");
    cardEl.setAttr("href", data.url);
    containerEl.appendChild(cardEl);

    const mainEl = document.createElement("div");
    mainEl.addClass("auto-card-link-main");
    cardEl.appendChild(mainEl);

    const titleEl = document.createElement("div");
    titleEl.addClass("auto-card-link-title");
    titleEl.textContent = data.title;
    mainEl.appendChild(titleEl);

    const descriptionEl = document.createElement("div");
    descriptionEl.addClass("auto-card-link-description");
    if (data.description) {
      descriptionEl.textContent = data.description;
    }
    mainEl.appendChild(descriptionEl);

    const hostEl = document.createElement("div");
    hostEl.addClass("auto-card-link-host");
    mainEl.appendChild(hostEl);

    if (data.favicon) {
      const faviconEl = document.createElement("img");
      faviconEl.addClass("auto-card-link-favicon");
      if (data.favicon) {
        faviconEl.setAttr("src", data.favicon);
      }
      faviconEl.setAttr("width", 14);
      faviconEl.setAttr("height", 14);
      faviconEl.setAttr("alt", "");
      hostEl.appendChild(faviconEl);
    }

    const hostNameEl = document.createElement("span");
    if (data.host) {
      hostNameEl.textContent = data.host;
    }
    hostEl.appendChild(hostNameEl);

    const thumbnailEl = document.createElement("div");
    thumbnailEl.addClass("auto-card-link-thumbnail");
    cardEl.appendChild(thumbnailEl);

    const thumbnailImgEl = document.createElement("img");
    thumbnailImgEl.addClass("auto-card-link-thumbnail-img");
    if (data.image) {
      thumbnailImgEl.setAttr("src", data.image);
    }
    thumbnailImgEl.setAttr("alt", "");
    thumbnailEl.appendChild(thumbnailImgEl);

    return containerEl;
  }
}
