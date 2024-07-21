import { Slider } from "@/components/ui/slider"
import { useMemo, useState } from "react";

function calculateTicks(limit: number) {
	const gap = Math.max(1, Math.ceil((limit - 1) / 10));

	let spacing = 1;
	let flag = false;
	while (gap > spacing) {
		spacing *= flag ? 2 : 5;
		flag = !flag;
	}

	let ticks = [];
	if (spacing > 1) {
		ticks.push(1);
	}
	for (let i = spacing; i <= limit - gap / 2; i += spacing) {
		ticks.push(i);
	}
	ticks.push(limit);

	return ticks;
}

function calculateOffset(step: number, limit: number, width: number) {
	return limit === 1 ? 0 : Math.round((step - 1) / (limit - 1) * (width - 16));
}

export default function Timeline({ className, width, markers, step, moveTo }:
	{ className?: string, width: number, markers: [number, string][], step: number, moveTo: Function }) {
	const [limit, setLimitOriginal] = useState(() => {
		const searchParams = new URLSearchParams(location.search);
		return Number(searchParams.get('limit')) || step;
	});
	const setLimit = (newLimit: number) => {
		setLimitOriginal(newLimit);
		const searchParams = new URLSearchParams(location.search);
		searchParams.set('limit', String(newLimit));
		const newUrl = `${location.pathname}?${searchParams.toString()}`;
		history.replaceState(null, '', newUrl);
	};

	const ticks = useMemo(() => calculateTicks(limit), [limit]);

	if (step > limit) {
		setLimit(step);
	}

	function changeHandler(value: number[]) {
		moveTo(value[0]);
	}

	return (
		<div className={className + ` w-[${width}px] relative z-0`}>

			{
				markers.length > 0 &&
				<div className="relative mx-2 h-8">
					{markers.filter(([i, _]) => i <= limit).map(([i, name]) =>
						<span key={i} onClick={() => moveTo(i)} className='absolute bottom-0 -translate-x-1/2 bg-secondary px-1.5 py-0.25 rounded cursor-pointer' style={{ left: calculateOffset(i, limit, width) }}>
							<span className='w-0 h-0 border-transparent border-[5px] border-t-secondary absolute top-full left-0 right-0 m-auto' />
							{name}
						</span>
					)}
				</div>
			}

			<Slider value={[step]} min={1} max={limit} step={1} onValueChange={changeHandler} className="my-2" />

			<div className="relative mx-2 h-6 -z-10">
				{ticks.map(x =>
					<span key={x} className='absolute top-0 -translate-x-1/2' style={{ left: calculateOffset(x, limit, width) }}>
						<span className='border border-secondary-foreground m-auto inset-0 absolute w-0 h-2 -translate-y-4' />
						{x}
					</span>
				)}
			</div>

		</div >
	);
}