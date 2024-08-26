import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PropsWithChildren } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

export default function HelpPopover({ children }: PropsWithChildren) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	if (isDesktop) {
		return (
			<Popover>
				<PopoverTrigger asChild>
					<Button variant={"outline"} size="icon">
						<HelpCircle />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[560px]">
					{children}
				</PopoverContent>
			</Popover>
		);
	} else {
		return (
			<Drawer>
				<DrawerTrigger asChild>
					<Button variant={"outline"} size="icon">
						<HelpCircle />
					</Button>
				</DrawerTrigger>
				<DrawerContent>
					<div className="p-4">
						{children}
					</div>
				</DrawerContent>
			</Drawer>
		);
	}
}