/**
 * Site-wide configuration. This is the only file you should need to edit for
 * content-source changes (sheet, folders, navigation, site name).
 *
 * Nothing here is secret: the sheet ID is only usable to READ a sheet that you
 * have already shared as "Anyone with the link → Viewer". No API keys or
 * credentials are used anywhere in this project.
 */

/**
 * Absolute URL of the site root, derived from where this file is served from.
 * Because it is computed from `import.meta.url`, every link and image path
 * works from a GitHub Pages subpath (https://user.github.io/repo/) as well as
 * from a custom domain or `localhost`.
 */
export const ROOT = new URL('../../', import.meta.url);

export const SITE = {
  // TODO: replace with your name / studio name (shown in the header & footer).
  name: 'Portfolio',

  /**
   * Primary navigation. `href: null` renders a non-interactive "coming soon"
   * placeholder. When you build a page, give it an `href` and it becomes a link.
   */
  nav: [
    { key: 'home', label: 'Home', href: 'index.html' },
    { key: 'logo', label: 'Logo Designs', href: 'logo-designs.html' },
    { key: 'social', label: 'Social Media Work', href: null },
    { key: 'packaging', label: 'Packaging And Misc', href: null },
    { key: 'about', label: 'About', href: null },
  ],
};

export const SHEET = {
  id: '1EIJz_W2_cMMuK1-RlyINFOGgGybd0uHkx2ncyyX6mF0',

  /** Tab names exactly as they appear in the spreadsheet. */
  tabs: {
    logo: 'logo',
    social: 'social',
    misc: 'misc',
    motion: 'motion',
    packaging: 'packaging',
  },

  /**
   * Optional: per-tab "Publish to web → CSV" URLs. If set, they take priority
   * over the default Google Visualization endpoint. Leave empty to use the
   * default (works with "Anyone with the link → Viewer").
   */
  csvUrlOverrides: {
    // logo: 'https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv',
  },

  timeoutMs: 12000,
};

/** Image folders, relative to the site root. Folder names are case-sensitive on GitHub Pages. */
export const IMAGE_FOLDERS = {
  logo: 'Images/Logo Designs/',
  social: 'Images/Social Media/',
  misc: 'Images/Misc/',
  motion: 'Images/Motion/',
  packaging: 'Images/Packaging/',
};
