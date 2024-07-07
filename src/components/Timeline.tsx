import { Slider } from "@/components/ui/slider"
import { useMemo, useState } from "react";

function calculateTicks(limit: number) {
	console.log("Calculating ticks...");
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
	for (let i = spacing; i < limit; i += spacing) {
		ticks.push(i);
	}
	ticks.push(limit);
	console.log("Ticks:", ticks);
	return ticks;
}

export default function Timeline({ className, width, markers, step, moveTo }:
	{ className?: string, width: number, markers: [number, string][], step: number, moveTo: Function }) {
	let [limit, setLimit] = useState(step);
	const ticks = useMemo(() => calculateTicks(limit), [limit]);

	if (step > limit) {
		setLimit(step);
		limit = step;
	}

	function changeHandler(value: number[]) {
		moveTo(value[0]);
	}

	return (
		<div className={className + ` w-[${width}px]`}>
			<div className="relative mx-2 h-8">
				{markers.filter(([i, _]) => i <= step).map(([i, name]) =>
					<span key={i} onClick={() => moveTo(i)} className='absolute bottom-0 -translate-x-1/2 bg-secondary px-1.5 py-0.25 rounded' style={{ left: Math.round((i - 1) / (limit - 1) * (width - 16)) }}>
						<span className='w-0 h-0 border-transparent border-[5px] border-t-secondary absolute top-full left-0 right-0 m-auto' />
						{name}
					</span>
				)}
			</div>
			<Slider value={[step]} min={1} max={limit} step={1} onValueChange={changeHandler} className="my-2" />
			<div className="relative mx-2 h-6 -z-10">
				{ticks.map(x =>
					<span key={x} className='absolute top-0 -translate-x-1/2' style={{ left: Math.round((x - 1) / (limit - 1) * (width - 16)) }}>
						<span className='border border-secondary-foreground m-auto inset-0 absolute w-0 h-2 -translate-y-4' />
						{x}
					</span>
				)}
			</div>
		</div >
	);
}