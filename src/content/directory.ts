import config from "astro.config.mjs";
const base = config.base || '';

export type SubDirectory = { items: SidebarEntry[], collapsed?: boolean }
export type Link = { link: string }
export type SidebarEntry = { label: string } & (SubDirectory | Link)

export function loadDirectory(entries: SidebarEntry[]): SidebarEntry[] {
	return entries.map((entry) => {
		if ("link" in entry) {
			const link = entry.link.startsWith('/') ? base + entry.link : entry.link;
			return { label: entry.label, link: link };
		} else {
			return { label: entry.label, items: loadDirectory(entry.items) };
		}
	});
}

export const sidebar: SidebarEntry[] = loadDirectory([
	{
		label: 'My markdown files',
		items: [
			{ label: 'Markdown test', link: '/docs/markdown' },
			{ label: 'Other file', link: '/docs/other' },
		]
	},
	{ label: 'WebSTG sandbox', link: '/live' },
]);
