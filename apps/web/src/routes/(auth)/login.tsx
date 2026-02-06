import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginForm } from "@/components/login-form";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/(auth)/login")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		if (context.session) {
			throw redirect({
				to: "/",
			});
		}
	},
});

function RouteComponent() {
	return <LoginForm />;
}
