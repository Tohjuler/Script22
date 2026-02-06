import { createFileRoute, redirect } from "@tanstack/react-router";
import SetupForm from "@/components/setup-form";
import { getUser } from "@/functions/get-user";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/(auth)/setup")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		const needSetup = await orpc.settings.needSetup.call();

		return { session, needSetup };
	},
	loader: async ({ context }) => {
		if (context.session) {
			throw redirect({
				to: "/",
			});
		}

		if (!context.session && !context.needSetup) {
			throw redirect({
				to: "/login",
			});
		}
	},
});

function RouteComponent() {
	return (
		<div className="w-full">
			<SetupForm />
		</div>
	);
}
