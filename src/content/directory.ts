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

const devSidebar = loadDirectory([
	{
		label: 'Dev markdown examples',
		items: [
			{ label: 'Markdown test', link: '/docs/markdown' },
			{ label: 'Embedded STG test', link: '/docs/mdtest' },
		]
	},
]);
const prodSidebar = loadDirectory([
	{ label: 'Welcome', link: '/docs' },
	{ label: 'Evaluation rules', link: '/docs/rules' },
	{
		label: 'Examples',
		items: [
			{ label: 'Fibonacci', link: '/docs/example-fib' },
		]
	},
	{ label: 'WebSTG sandbox', link: '/' },
]);

const isProd = import.meta.env.PROD;
export const sidebar: SidebarEntry[] = (isProd ? [] : devSidebar).concat(prodSidebar);
