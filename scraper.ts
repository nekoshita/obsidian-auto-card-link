const electronPkg = require('electron');
import { OGData } from 'interfaces';
import { request } from 'obsidian';

function blank(text: string): boolean {
  return text === undefined || text === null || text === '';
}

// async wrapper to load a url and settle on load finish or fail
async function load(window: any, url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    window.webContents.on('did-finish-load', (event: any) => resolve(event));
    window.webContents.on('did-fail-load', (event: any) => reject(event));
    // window.webContents.on('console-message', console.log);
    window.loadURL(url);
  });
}

const getOGDataFromDocument = () => {
  const ogData: OGData = {};
  const metas = document.getElementsByTagName('meta');
  for (let i = 0; i < metas.length; i++) {
    const property = metas[i].getAttribute('property');
    const content = metas[i].getAttribute('content');
    switch (property) {
      case 'og:type':
        if (content == null) {
          break;
        }
        ogData.ogType = content;
        break;
      case 'og:site_name':
        if (content == null) {
          break;
        }
        ogData.ogSiteName = content;
        break;
      case 'og:title':
        if (content == null) {
          break;
        }
        ogData.ogTitle = content;
        break;
      case 'og:image':
        if (content == null) {
          break;
        }
        ogData.ogImage = content;
        break;
      case 'og:description':
        if (content == null) {
          break;
        }
        ogData.ogDescription = content;
        break;
      case 'og:url':
        if (content == null) {
          break;
        }
        ogData.ogUrl = content;
        break;
    }
  }
  return ogData;
};

async function electronGetOGData(url: string): Promise<OGData | undefined> {
  const { remote } = electronPkg;
  const { BrowserWindow } = remote;

  try {
    const window = new BrowserWindow({
      width: 1000,
      height: 600,
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        images: false,
      },
      show: false,
    });

    await load(window, url);

    try {
      return await window.webContents.executeJavaScript(
        `const fn=${getOGDataFromDocument.toString()};fn();`,
        true
      );
    } catch (ex) {
      return undefined;
    }
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
}

// async function nonElectronGetPageTitle(url: string): Promise<OGData> {
//   try {
//     const html = await request({ url });

//     const doc = new DOMParser().parseFromString(html, 'text/html');
//     const title = doc.querySelectorAll('title')[0];

//     if (title == null || blank(title?.innerText)) {
//       // If site is javascript based and has a no-title attribute when unloaded, use it.
//       const noTitle = title?.getAttr('no-title');
//       if (notBlank(noTitle)) {
//         return noTitle;
//       }

//       // Otherwise if the site has no title/requires javascript simply return Title Unknown
//       return url;
//     }

//     return title.innerText;
//   } catch (ex) {
//     console.error(ex);

//     return 'Site Unreachable';
//   }
// }

export default async function getPageOGData(
  url: string
): Promise<OGData | undefined> {
  // If we're on Desktop use the Electron scraper
  if (!(url.startsWith('http') || url.startsWith('https'))) {
    url = 'https://' + url;
  }

  if (electronPkg != null) {
    return electronGetOGData(url);
  } else {
    //  TODO
    // return nonElectronGetPageTitle(url);
  }
}
