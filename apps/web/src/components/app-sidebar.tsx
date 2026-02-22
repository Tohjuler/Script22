/** biome-ignore-all lint/suspicious/noArrayIndexKey: It's the way the template does it */
import { ChevronRight, File, Folder, PlusCircle } from "lucide-react";
import type * as React from "react";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarRail,
} from "@/components/ui/sidebar";
import type { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

export function AppSidebar({
	tree,
	user,
	...props
}: React.ComponentProps<typeof Sidebar> & {
	tree: TreeItem[];
	user: typeof authClient.$Infer.Session.user;
}) {
	return (
		<Sidebar {...props}>
			<SidebarHeader className="flex flex-row items-center justify-between border-b">
				<h2 className="font-medium text-lg">Hosts</h2>
				<Button size="icon-lg" variant="ghost">
					<PlusCircle />
				</Button>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{tree.map((item, index) => (
								<Tree key={index} item={item} />
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<Button variant="outline" size="sm" className="w-full">
									Log out {user.name}
								</Button>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}

type TreeItem = { id: string; label: string; color: string } | TreeItem[];

function Tree({ item }: { item: TreeItem }) {
	const [name, ...items] = Array.isArray(item) ? item : [item];
	if (!("id" in name)) {
		console.warn("Unexpected folder without a name", item);
		return null;
	}

	if (!items.length) {
		return (
			<SidebarMenuButton
				isActive={name.id === "button.tsx"}
				className="data-[active=true]:bg-transparent"
			>
				<File />
				{name.label}
			</SidebarMenuButton>
		);
	}

	return (
		<SidebarMenuItem>
			<Collapsible
				className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
				// defaultOpen={name === "components" || name === "ui"}
			>
				<CollapsibleTrigger asChild>
					<SidebarMenuButton>
						<ChevronRight className="transition-transform" />
						<Folder />
						{name.label}
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						{items.map((subItem, index) => (
							<Tree key={index} item={subItem} />
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuItem>
	);
}
