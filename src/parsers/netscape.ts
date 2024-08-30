import { load } from 'cheerio';
import { Bookmark } from '../interfaces/bookmark';

export const canParse = (html: string) => {
  for (let i = 0; i < html.length; i++) {
    if (/\s/.test(html[i])) {
      continue;
    }
    if (html[i] === '<') {
      break;
    } else {
      return false;
    }
  }

  return (
    /<dl/i.test(html) &&
    /<\/dl/i.test(html) &&
    /<dt/i.test(html) &&
    /<a[^<>]*href\s*=\s*/i.test(html)
  );
};

const getNodeData = ($: any, node: any) => {
  const data: Bookmark = {
    description: undefined,  // Initialize description here
  };

  for (let i = 0; i < node.childNodes.length; i++) {
    const childNode = node.childNodes[i];
    const child = $(childNode);

    if (childNode.tagName === 'a') {
      data.type = 'bookmark';
      data.url = child.attr('href') || '';
      data.title = child.text() || '';

      const addDate = child.attr('add_date');
      if (addDate) {
        data.addDate = addDate;
      }

      const icon = child.attr('icon');
      if (icon) {
        data.icon = icon;
      }

      // Feature 1: Support for bookmark descriptions
      const description = child.attr('description');
      if (description) {
        data.description = description;
      }
    } else if (childNode.tagName === 'h3') {
      data.type = 'folder';
      data.title = child.text() || '';

      const addDate = child.attr('add_date');
      const lastModified = child.attr('last_modified');

      if (addDate) {
        data.addDate = addDate;
      }
      if (lastModified) {
        data.lastModified = lastModified;
      }
      data.nsRoot = null;
      if (child.attr('personal_toolbar_folder')) {
        data.nsRoot = 'toolbar';
      }
      if (child.attr('unfiled_bookmarks_folder')) {
        data.nsRoot = 'unsorted';
      }
    } else if (childNode.tagName === 'dl') {
      (data as any).__dir_dl = childNode;
    }
  }

  if (data.type === 'folder' && !(data as any).__dir_dl) {
    if (node.nextSibling && node.nextSibling.tagName === 'dd') {
      const dls = $(node.nextSibling).find('dl');
      if (dls.length) {
        (data as any).__dir_dl = dls[0];
      }
    }
  }

  return data;
};

// Feature 3: Folder depth limitation
const processDir = ($: any, dir: any, level: number, maxDepth: number = Infinity) => {
  if (level > maxDepth) return []; // Limit depth

  const children = dir.childNodes;
  let menuRoot: Bookmark = null;

  const items: Bookmark[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child.tagName) {
      continue;
    }
    if (child.tagName !== 'dt') {
      continue;
    }
    const itemData = getNodeData($, child);

    if (itemData.type) {
      if (level === 0 && !itemData.nsRoot) {
        if (!menuRoot) {
          menuRoot = {
            type: 'folder',
            title: 'Menu',
            children: [],
            nsRoot: 'menu',
            description: undefined,  // Add missing description property
          };
        }
        if (itemData.type === 'folder' && (itemData as any).__dir_dl) {
          itemData.children = processDir(
            $,
            (itemData as any).__dir_dl,
            level + 1,
            maxDepth,
          );
          delete (itemData as any).__dir_dl;
        }
        menuRoot.children.push(itemData);
      } else {
        if (itemData.type === 'folder' && (itemData as any).__dir_dl) {
          itemData.children = processDir(
            $,
            (itemData as any).__dir_dl,
            level + 1,
            maxDepth,
          );
          delete (itemData as any).__dir_dl;
        }
        items.push(itemData);
      }
    }
  }
  if (menuRoot) {
    items.push(menuRoot);
  }
  return items;
};

// Feature 2: Sorting bookmarks by date
const sortBookmarksByDate = (bookmarks: Bookmark[], ascending: boolean = true) => {
  return bookmarks.sort((a, b) => {
    const dateA = new Date(a.addDate || '');
    const dateB = new Date(b.addDate || '');
    return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
  });
};

// Feature 4: Filtering bookmarks by keyword
export const filterBookmarksByKeyword = (bookmarks: Bookmark[], keyword: string) => {
  const filteredBookmarks = bookmarks.filter(bookmark => {
    return (
      bookmark.title.includes(keyword) ||
      (bookmark.url && bookmark.url.includes(keyword))
    );
  });

  return filteredBookmarks;
};

export const parse = (html: string, maxDepth: number = Infinity) => {
  const $ = load(html);
  const dls = $('dl');

  if (dls.length > 0) {
    return processDir($, dls[0], 0, maxDepth);
  }

  throw new Error(
    'Netscape parser: Bookmarks file malformed: no DL nodes were found',
  );
};

// Feature 5: Convert to JSON format
export const convertToJson = (bookmarks: Bookmark[]): string => {
  return JSON.stringify(bookmarks, null, 2);
};

export const convertToHtml = (bookmarks: Bookmark[]): string => {
  const generateBookmark = (bookmark: Bookmark): string => {
    if (bookmark.type === 'bookmark') {
      return `<a href="${bookmark.url}" add_date="${bookmark.addDate || ''}" icon="${bookmark.icon || ''}" description="${bookmark.description || ''}">${bookmark.title}</a>`;
    } else if (bookmark.type === 'folder') {
      let folderHtml = `<h3 add_date="${bookmark.addDate || ''}" last_modified="${bookmark.lastModified || ''}"`;
      if (bookmark.nsRoot) {
        folderHtml += ` ${bookmark.nsRoot}="true"`;
      }
      folderHtml += `>${bookmark.title}</h3>`;
      if (bookmark.children && bookmark.children.length > 0) {
        folderHtml += '<dl>';
        bookmark.children.forEach(child => {
          folderHtml += generateBookmark(child);
        });
        folderHtml += '</dl>';
      }
      return folderHtml;
    }
    return '';
  };

  let html = '';
  bookmarks.forEach(bookmark => {
    html += generateBookmark(bookmark);
  });
  return html;
};
