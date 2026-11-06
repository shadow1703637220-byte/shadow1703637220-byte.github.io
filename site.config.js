// Edited through /admin/. JSON is bundled on every GitHub Pages publication.
import settings from './content/site.json';
import projects from './content/projects.json';
import journal from './content/journal.json';
import footprints from './content/footprints.json';
import gallery from './content/gallery.json';

export const site = { ...settings, ...projects, ...journal, ...footprints, gallery };
