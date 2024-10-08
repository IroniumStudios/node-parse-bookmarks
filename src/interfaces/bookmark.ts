export interface Bookmark {
  description: any;
  title?: string;
  url?: string;
  type?: 'folder' | 'bookmark';
  children?: Bookmark[];
  nsRoot?: 'menu' | 'toolbar' | 'unsorted' | null;
  icon?: string;
  addDate?: string;
  lastModified?: string;
}
