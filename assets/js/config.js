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
  // TODO: replace with your name / studio name (shown on mobile and for screen readers).
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

  /** Small note at the right of the header (desktop). Each entry is one line. */
  navNote: ['Ideas', 'Into design'],

  /** Footer sign-off: [left text, right text]. */
  tagline: ['Good design\nbuilds connections', 'That last.'],

  /**
   * Closing call-to-action band (used on pages that include <div id="site-cta">).
   * - `href`: where the band links. `null` = a non-clickable band (set this once
   *   your About/Contact page or a mailto: link exists).
   * - `image`: optional path relative to the site root, e.g. 'Images/cta.jpg'.
   */
  cta: {
    eyebrow: 'Have a project in mind?',
    text: 'Let’s create something meaningful together.',
    href: null,
    image: null,
  },
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

/**
 * Name of the preview subfolder inside EVERY category folder, e.g.
 * "Images/Logo Designs/Thumbnail/kynn_logo (1).webp". The filename comes from
 * the sheet's `thumbnail` column. Case-sensitive on GitHub Pages.
 */
export const THUMBNAIL_FOLDER = 'Thumbnail';
