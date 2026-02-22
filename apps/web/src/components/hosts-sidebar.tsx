import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
	ChevronRight,
	Folder,
	LogOut,
	Plus,
	Server,
	Settings,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
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
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

interface HostsSidebarProps {
	onAddHost?: () => void;
}

type ServerTreeItem =
	| { type: "server"; id: number; label: string }
	| {
			type: "folder";
			id: number;
			label: string;
			color?: string;
			items: ServerTreeItem[];
	  };

export function HostsSidebar({ onAddHost }: HostsSidebarProps) {
	const params = useParams({ strict: false });
	const navigate = useNavigate();
	const hostId = "hostId" in params ? params.hostId : undefined;

	const { data: servers } = useQuery({
		queryKey: ["servers", "getList"],
		queryFn: () => client.servers.getList({}),
	});
	const { data: folders } = useQuery({
		queryKey: ["folders", "getList"],
		queryFn: () => client.folders.getList({}),
	});

	const tree = useMemo<ServerTreeItem[]>(() => {
		const rootServers =
			servers
				?.filter((server) => !server.folder)
				.map((server) => ({
					type: "server" as const,
					id: server.id,
					label: server.name,
				})) ?? [];

		const folderItems =
			folders?.map((folder) => ({
				type: "folder" as const,
				id: folder.id,
				label: folder.name,
				color: folder.color ?? undefined,
				items:
					servers
						?.filter((server) => server.folder?.id === folder.id)
						.map((server) => ({
							type: "server" as const,
							id: server.id,
							label: server.name,
						})) ?? [],
			})) ?? [];

		return [...rootServers, ...folderItems];
	}, [folders, servers]);

	return (
		<Sidebar collapsible="none">
			<SidebarHeader className="flex flex-row items-center justify-between border-b">
				<h2 className="font-medium text-lg">Hosts</h2>
				<Button size="icon-lg" variant="ghost" onClick={onAddHost}>
					<Plus className="h-4 w-4" />
				</Button>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{tree.map((item) => (
								<Tree
									key={`${item.type}-${item.id}`}
									item={item}
									activeHostId={hostId}
								/>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup className="mt-auto">
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<Link to=".">
									<Button
										variant="ghost"
										size="sm"
										className="w-full justify-start"
									>
										<Settings className="h-4 w-4" />
										Settings
									</Button>
								</Link>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-start"
									onClick={() => {
										authClient.signOut({
											fetchOptions: {
												onSuccess: () => {
													navigate({ to: "/login" });
												},
											},
										});
									}}
								>
									<LogOut className="h-4 w-4" />
									Log out
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

function Tree({
	item,
	activeHostId,
}: {
	item: ServerTreeItem;
	activeHostId?: string;
}) {
	if (item.type === "server") {
		return (
			<SidebarMenuButton asChild isActive={activeHostId === String(item.id)}>
				<Link to="/hosts/$hostId" params={{ hostId: String(item.id) }}>
					<Server />
					<span>{item.label}</span>
				</Link>
			</SidebarMenuButton>
		);
	}

	return (
		<SidebarMenuItem>
			<Collapsible className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90">
				<CollapsibleTrigger asChild>
					<SidebarMenuButton>
						<ChevronRight className="transition-transform" />
						<Folder style={{ color: item.color }} />
						<span>{item.label}</span>
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						{item.items.map((subItem) => (
							<Tree
								key={`${subItem.type}-${subItem.id}`}
								item={subItem}
								activeHostId={activeHostId}
							/>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuItem>
	);
}
