import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
	ChevronRight,
	Folder,
	LogOut,
	Plus,
	Server,
	Settings,
	Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarRail,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { client, queryClient } from "@/utils/orpc";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog";

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

	const [deleteFolderId, setDeleteFolderId] = useState<number | null>(null);
	const [folderState, setFolderState] = useState<string[]>([]);

	const { data: servers } = useQuery({
		queryKey: ["servers", "getList"],
		queryFn: () => client.servers.getList({}),
	});
	const { data: folders } = useQuery({
		queryKey: ["folders", "getList"],
		queryFn: () => client.folders.getList({}),
	});

	const deleteFolderMutation = useMutation({
		mutationFn: (folderId: number) => client.folders.delete({ id: folderId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["folders"] });
			queryClient.invalidateQueries({ queryKey: ["servers"] });
		},
		onError: (error: Error) => {
			toast.error(`Failed to delete folder: ${error.message}`);
		},
	});

	useEffect(() => {
		if (localStorage.getItem("folderState")) {
			setFolderState(JSON.parse(localStorage.getItem("folderState")!));
		}
	}, []);

	useEffect(() => {
		localStorage.setItem("folderState", JSON.stringify(folderState));
	}, [folderState]);

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
				<Link to="/" className="flex flex-row items-center">
					<img
						src="/favicon-48x48.png"
						alt="Script22 Logo"
						className="mr-2 h-6 w-6 rounded-sm"
						width={24}
						height={24}
					/>
					<h2 className="font-medium text-lg">Script22</h2>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Hosts</SidebarGroupLabel>
					<SidebarGroupAction asChild>
						<Button
							size="icon-sm"
							variant="ghost"
							className="-mt-1.25"
							onClick={onAddHost}
						>
							<Plus />
						</Button>
					</SidebarGroupAction>
					<SidebarGroupContent>
						<SidebarMenu>
							{sortTree(tree).map((item) => (
								<Tree
									key={`${item.type}-${item.id}`}
									item={item}
									activeHostId={hostId}
									onDeleteFolder={(folderId) => setDeleteFolderId(folderId)}
									isOpen={(id) => folderState?.includes(String(id)) ?? false}
									setOpen={(id, open) => {
										if (open) {
											setFolderState?.((prev) => [...(prev || []), String(id)]);
										} else {
											setFolderState?.((prev) =>
												prev ? prev.filter((fid) => fid !== String(id)) : [],
											);
										}
									}}
								/>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup className="mt-auto">
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<Link to="/settings">
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

				<AlertDialog
					open={deleteFolderId !== null}
					onOpenChange={(open) => {
						if (!open) setDeleteFolderId(null);
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Folder</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete this folder? This action cannot
								be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={deleteFolderMutation.isPending}>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => deleteFolderMutation.mutate(deleteFolderId!)}
								disabled={deleteFolderMutation.isPending}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{deleteFolderMutation.isPending ? "Deleting..." : "Delete"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}

function Tree({
	item,
	activeHostId,
	onDeleteFolder,
	isOpen,
	setOpen,
}: {
	item: ServerTreeItem;
	activeHostId?: string;
	onDeleteFolder?: (folderId: number) => void;
	isOpen: (id: number) => boolean;
	setOpen: (id: number, open: boolean) => void;
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
			<Collapsible
				defaultOpen={
					item.items.some((i) => activeHostId === String(i.id)) ||
					isOpen(item.id)
				}
				onOpenChange={(open) => setOpen(item.id, open)}
				className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
			>
				<CollapsibleTrigger asChild>
					<SidebarMenuButton>
						<ChevronRight className="transition-transform" />
						<Folder style={{ color: item.color }} />
						<span>{item.label}</span>
						{/* Delete button */}
						<Button
							variant="ghost"
							size="icon-sm"
							className="ml-auto text-muted-foreground/50 opacity-0 hover:text-destructive/50 group-hover/collapsible:opacity-100"
							onClick={(e) => {
								e.stopPropagation();
								onDeleteFolder?.(item.id);
							}}
						>
							<Trash2 />
						</Button>
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						{item.items
							.sort((a, b) =>
								a.type === "folder" && b.type === "server" ? -1 : 1,
							)
							.map((subItem) => (
								<Tree
									key={`${subItem.type}-${subItem.id}`}
									item={subItem}
									activeHostId={activeHostId}
									onDeleteFolder={onDeleteFolder}
									isOpen={isOpen}
									setOpen={setOpen}
								/>
							))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuItem>
	);
}

function sortTree(items: ServerTreeItem[]): ServerTreeItem[] {
	return items
		.sort((a, b) => {
			if (a.type !== b.type) {
				return a.type === "folder" ? -1 : 1;
			}

			return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
		})
		.map((item) => {
			if (item.type === "folder")
				return { ...item, items: sortTree(item.items) };

			return item;
		});
}
