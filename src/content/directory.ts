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

const isProd = import.meta.env.PROD;
const devSidebar = loadDirectory(isProd ? [] : [{
	label: 'My markdown files',
	items: [
		{ label: 'Markdown test', link: '/docs/markdown' },
		{ label: 'Other file', link: '/docs/other' },
	]
}]);
export const sidebar: SidebarEntry[] = devSidebar.concat(loadDirectory([
	{ label: 'Welcome', link: '/docs' },
	{
		label: 'Examples',
		items: [
			{ label: 'Fibonacci', link: '/docs/example-fib' },
		]
	},
	{ label: 'WebSTG sandbox', link: '/live' },
]));
