import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PropsWithChildren } from "react";

export default function HelpPopover({ children }: PropsWithChildren) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant={"outline"} size="icon">
					<HelpCircle />
				</Button>
			</PopoverTrigger>
			<PopoverContent>
				{children}
			</PopoverContent>
		</Popover>
	);
}