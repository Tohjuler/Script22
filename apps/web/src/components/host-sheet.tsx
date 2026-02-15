import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { client, queryClient } from "@/utils/orpc";

interface HostSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hostId?: number;
}

export function HostSheet({ open, onOpenChange, hostId }: HostSheetProps) {
	const isEditing = !!hostId;

	const { data: host } = useQuery({
		queryKey: ["servers", "getById", hostId],
		queryFn: () => client.servers.getById({ id: hostId! }),
		enabled: isEditing,
	});

	const { data: folders } = useQuery({
		queryKey: ["folders", "getList"],
		queryFn: () => client.folders.getList({}),
	});

	const [showFolderForm, setShowFolderForm] = useState(false);
	const [folderFormData, setFolderFormData] = useState({
		name: "",
		color: "#3b82f6",
	});

	const [formData, setFormData] = useState({
		name: "",
		host: "",
		port: 22,
		username: "",
		authType: "password" as "password" | "key",
		auth: "",
		folderId: null as number | null,
	});

	// Update form when host data loads
	useEffect(() => {
		if (host) {
			setFormData({
				name: host.name,
				host: host.host,
				port: host.port,
				username: host.username,
				authType: host.authType as "password" | "key",
				auth: host.auth || "",
				folderId: host.folder?.id || null,
			});
		}
	}, [host]);

	const createMutation = useMutation({
		mutationFn: (input: typeof formData) => client.servers.create(input),
		onSuccess: () => {
			toast.success("Host created successfully");
			queryClient.invalidateQueries({ queryKey: ["servers"] });
			onOpenChange(false);
			resetForm();
		},
		onError: (error: Error) => {
			toast.error(`Failed to create host: ${error.message}`);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (input: { id: number } & Partial<typeof formData>) =>
			client.servers.update(input),
		onSuccess: () => {
			toast.success("Host updated successfully");
			queryClient.invalidateQueries({ queryKey: ["servers"] });
			onOpenChange(false);
		},
		onError: (error: Error) => {
			toast.error(`Failed to update host: ${error.message}`);
		},
	});

	const createFolderMutation = useMutation({
		mutationFn: (input: typeof folderFormData) => client.folders.create(input),
		onSuccess: (newFolder) => {
			toast.success("Folder created successfully");
			queryClient.invalidateQueries({ queryKey: ["folders"] });
			// Auto-select the newly created folder
			setFormData({ ...formData, folderId: newFolder[0].id });
			setShowFolderForm(false);
			setFolderFormData({ name: "", color: "#3b82f6" });
		},
		onError: (error: Error) => {
			toast.error(`Failed to create folder: ${error.message}`);
		},
	});

	const resetForm = () => {
		setFormData({
			name: "",
			host: "",
			port: 22,
			username: "",
			authType: "password",
			auth: "",
			folderId: null,
		});
		setShowFolderForm(false);
		setFolderFormData({ name: "", color: "#3b82f6" });
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (isEditing) {
			updateMutation.mutate({
				id: hostId!,
				...formData,
			});
		} else {
			createMutation.mutate(formData);
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>{isEditing ? "Edit Host" : "Add Host"}</SheetTitle>
					<SheetDescription>
						{isEditing
							? "Update the host configuration"
							: "Add a new host to manage"}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="mt-3 space-y-4 px-3">
					<Field>
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							placeholder="Production Server"
							required
						/>
					</Field>

					<Field>
						<Label htmlFor="host">Host</Label>
						<Input
							id="host"
							value={formData.host}
							onChange={(e) =>
								setFormData({ ...formData, host: e.target.value })
							}
							placeholder="192.168.1.100"
							required
						/>
					</Field>

					<Field>
						<Label htmlFor="port">Port</Label>
						<Input
							id="port"
							type="number"
							value={formData.port}
							onChange={(e) =>
								setFormData({ ...formData, port: Number(e.target.value) })
							}
							required
						/>
					</Field>

					<Field>
						<Label htmlFor="username">Username</Label>
						<Input
							id="username"
							value={formData.username}
							onChange={(e) =>
								setFormData({ ...formData, username: e.target.value })
							}
							placeholder="root"
							required
						/>
					</Field>

					<Field>
						<Label htmlFor="authType">Auth Type</Label>
						<Select
							value={formData.authType}
							onValueChange={(value) =>
								setFormData({
									...formData,
									authType: value as "password" | "key",
								})
							}
						>
							<SelectTrigger id="authType">
								<SelectValue placeholder="Select auth type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="password">Password</SelectItem>
								<SelectItem value="key">SSH Key</SelectItem>
							</SelectContent>
						</Select>
					</Field>

					<Field>
						<Label htmlFor="auth">
							{formData.authType === "password" ? "Password" : "SSH Key"}
						</Label>
						<Input
							id="auth"
							type={formData.authType === "password" ? "password" : "text"}
							value={formData.auth}
							onChange={(e) =>
								setFormData({ ...formData, auth: e.target.value })
							}
							placeholder={
								formData.authType === "password"
									? "Enter password"
									: "Enter SSH key"
							}
						/>
					</Field>

					<Field>
						<Label htmlFor="folder">Folder (Optional)</Label>
						<Select
							value={formData.folderId?.toString() || "__no_folder__"}
							onValueChange={(value) => {
								if (value === "__create__") {
									setShowFolderForm(true);
								} else {
									setFormData({
										...formData,
										folderId: value === "__no_folder__" ? null : Number(value),
									});
								}
							}}
						>
							<SelectTrigger id="folder">
								<SelectValue placeholder="No folder" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__no_folder__">No folder</SelectItem>
								{folders?.map((folder) => (
									<SelectItem key={folder.id} value={folder.id.toString()}>
										{folder.name}
									</SelectItem>
								))}
								<SelectSeparator />
								<SelectItem value="__create__">+ Create new folder</SelectItem>
							</SelectContent>
						</Select>
					</Field>

					{showFolderForm && (
						<>
							<Field>
								<Label htmlFor="folder-name">Folder Name</Label>
								<Input
									id="folder-name"
									value={folderFormData.name}
									onChange={(e) =>
										setFolderFormData({
											...folderFormData,
											name: e.target.value,
										})
									}
									placeholder="Production"
									autoFocus
								/>
							</Field>

							<Field>
								<Label htmlFor="folder-color">Color (Optional)</Label>
								<div className="flex gap-2">
									<Input
										id="folder-color"
										type="color"
										value={folderFormData.color}
										onChange={(e) =>
											setFolderFormData({
												...folderFormData,
												color: e.target.value,
											})
										}
										className="h-9 w-20 cursor-pointer"
									/>
									<Input
										value={folderFormData.color}
										onChange={(e) =>
											setFolderFormData({
												...folderFormData,
												color: e.target.value,
											})
										}
										placeholder="#3b82f6"
										className="flex-1"
									/>
								</div>
							</Field>

							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setShowFolderForm(false);
										setFolderFormData({ name: "", color: "#3b82f6" });
									}}
									className="flex-1"
								>
									Cancel
								</Button>
								<Button
									type="button"
									onClick={() => createFolderMutation.mutate(folderFormData)}
									disabled={
										createFolderMutation.isPending || !folderFormData.name
									}
									className="flex-1"
								>
									Create Folder
								</Button>
							</div>
						</>
					)}

					<div className="flex gap-2 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="flex-1"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							className="flex-1"
							disabled={createMutation.isPending || updateMutation.isPending}
						>
							{isEditing ? "Update" : "Create"}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
