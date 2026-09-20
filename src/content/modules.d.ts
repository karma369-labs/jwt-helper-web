// Ambient declarations for what scripts/vite-plugin-content.ts produces. Kept import-free
// so TypeScript treats these as module declarations rather than augmentations.
declare module 'virtual:content-index' {
  export const articles: import('./types').ArticleMeta[];
}

declare module '*.md' {
  export const meta: import('./types').ArticleMeta;
  export const html: string;
}
