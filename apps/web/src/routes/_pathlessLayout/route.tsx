import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { HostSheet } from "@/components/host-sheet";
import { HostsSidebar } from "@/components/hosts-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getUser } from "@/functions/get-user";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_pathlessLayout")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		const needSetup = await orpc.settings.needSetup.call();

		return { session, needSetup };
	},
	loader: async ({ context }) => {
		if (context.needSetup) {
			throw redirect({
				to: "/setup",
			});
		}

		if (!context.session) {
			throw redirect({
				to: "/login",
			});
		}
	},
});

function RouteComponent() {
	const [isHostSheetOpen, setIsHostSheetOpen] = useState(false);

	return (
		<SidebarProvider>
			<HostsSidebar onAddHost={() => setIsHostSheetOpen(true)} />
			<SidebarInset className="overflow-hidden">
				<Outlet />
			</SidebarInset>
			<HostSheet open={isHostSheetOpen} onOpenChange={setIsHostSheetOpen} />
		</SidebarProvider>
	);
}
