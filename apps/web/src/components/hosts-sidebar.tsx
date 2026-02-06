import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronRight, Folder, Plus, Server } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

interface HostsSidebarProps {
	onAddHost?: () => void;
}

export function HostsSidebar({ onAddHost }: HostsSidebarProps) {
	const params = useParams({ strict: false });
	const hostId = "hostId" in params ? params.hostId : undefined;
	const [openFolders, setOpenFolders] = useState<number[]>([]);

	const { data: servers } = useQuery({
		queryKey: ["servers", "getList"],
		queryFn: () => client.servers.getList({}),
	});
	const { data: folders } = useQuery({
		queryKey: ["folders", "getList"],
		queryFn: () => client.folders.getList({}),
	});

	// Group servers by folder
	const serversWithoutFolder = servers?.filter((s) => !s.folder) || [];
	const folderGroups =
		folders?.map((folder) => ({
			folder,
			servers: servers?.filter((s) => s.folder?.id === folder.id) || [],
		})) || [];

	const toggleFolder = (folderId: number) => {
		setOpenFolders((prev) =>
			prev.includes(folderId)
				? prev.filter((id) => id !== folderId)
				: [...prev, folderId],
		);
	};

	return (
		<div className="w-64 space-y-4 border-r bg-background p-4">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-lg">Hosts</h2>
				<Button size="icon" variant="ghost" onClick={onAddHost}>
					<Plus className="h-4 w-4" />
				</Button>
			</div>

			<div className="space-y-1">
				{/* Servers without folder */}
				{serversWithoutFolder.map((server) => (
					<Link
						key={server.id}
						to="/hosts/$hostId"
						params={{ hostId: String(server.id) }}
						className={cn(
							"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
							hostId === String(server.id) && "bg-accent",
						)}
					/>
				))}

				{/* Folders with servers */}
				{folderGroups.map(({ folder, servers }) => (
					<Collapsible
						key={folder.id}
						open={openFolders.includes(folder.id)}
						onOpenChange={() => toggleFolder(folder.id)}
					>
						<CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent">
							<ChevronRight
								className={cn(
									"h-4 w-4 shrink-0 transition-transform",
									openFolders.includes(folder.id) && "rotate-90",
								)}
							/>
							<Folder
								className="h-4 w-4 shrink-0"
								style={{ color: folder.color || undefined }}
							/>
							<span className="truncate">{folder.name}</span>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-1 ml-6 space-y-1">
							{servers.map((server) => (
								<Link
									key={server.id}
									to="/hosts/$hostId"
									params={{ hostId: String(server.id) }}
									className={cn(
										"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
										hostId === String(server.id) && "bg-accent",
									)}
								>
									<Server className="h-4 w-4 shrink-0" />
									<span className="truncate">{server.name}</span>
								</Link>
							))}
						</CollapsibleContent>
					</Collapsible>
				))}
			</div>
		</div>
	);
}
