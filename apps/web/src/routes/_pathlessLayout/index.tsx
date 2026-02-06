import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_pathlessLayout/")({
	component: RouteComponent,
});
function RouteComponent() {
	const { session } = Route.useRouteContext();
	return (
		<div>
			{" "}
			<h1>Dashboard</h1> <p>Welcome {session?.user.name}</p>{" "}
		</div>
	);
}
