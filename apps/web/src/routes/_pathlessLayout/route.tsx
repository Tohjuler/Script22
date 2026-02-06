import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { HostSheet } from "@/components/host-sheet";
import { HostsSidebar } from "@/components/hosts-sidebar";
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
		<div className="flex h-screen bg-background">
			<HostsSidebar onAddHost={() => setIsHostSheetOpen(true)} />
			<div className="flex flex-1 flex-col overflow-hidden">
				<Outlet />
			</div>
			<HostSheet open={isHostSheetOpen} onOpenChange={setIsHostSheetOpen} />
		</div>
	);
}
