import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
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
			})
		}
	},
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const user = session!.user;

	return (
		<SidebarProvider>
			<AppSidebar tree={[]} user={user} />
			<SidebarInset>
				<header className="flex h-8 shrink-0 items-center gap-2 border-b">
					<div className="flex items-center gap-2 px-3">
						<SidebarTrigger />
						<Separator orientation="vertical" className="mr-2 h-4" />
					</div>
				</header>
				<div className="p-2">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
