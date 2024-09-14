/** Returns a helper function for figures which accepts labels and returns the corresponding number. */
export default function useFigure() {
	let fig: any = function (ref: string): number {
		if (!fig[ref]) {
			fig[ref] = ++fig.count;
		}
		return fig[ref];
	};
	fig.count = 0;
	return fig as (ref: string) => number;
}