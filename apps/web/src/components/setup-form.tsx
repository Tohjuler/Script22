import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "./ui/card";
import { Field, FieldGroup } from "./ui/field";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SetupForm() {
	const navigate = useNavigate({
		from: "/",
	});

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
			name: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: value.email,
					password: value.password,
					name: value.name,
				},
				{
					onSuccess: () => {
						navigate({
							to: "/",
						});
						toast.success("Sign up successful");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z
				.object({
					name: z.string().min(2, "Name must be at least 2 characters"),
					email: z.email("Invalid email address"),
					password: z.string().min(8, "Password must be at least 8 characters"),
					confirmPassword: z
						.string()
						.min(8, "Confirm Password must be at least 8 characters"),
				})
				.refine((data) => data.password === data.confirmPassword, {
					message: "Passwords do not match",
					path: ["confirmPassword"],
				}),
		},
	});

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Setup Admin Account</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<FieldGroup>
							<form.Field name="name">
								{(field) => (
									<Field>
										<Label htmlFor={field.name}>Name</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500">
												{error?.message}
											</p>
										))}
									</Field>
								)}
							</form.Field>

							<form.Field name="email">
								{(field) => (
									<Field>
										<Label htmlFor={field.name}>Email</Label>
										<Input
											id={field.name}
											name={field.name}
											type="email"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500">
												{error?.message}
											</p>
										))}
									</Field>
								)}
							</form.Field>

							<form.Field name="password">
								{(field) => (
									<Field>
										<Label htmlFor={field.name}>Password</Label>
										<Input
											id={field.name}
											name={field.name}
											type="password"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500">
												{error?.message}
											</p>
										))}
									</Field>
								)}
							</form.Field>

							<form.Field name="confirmPassword">
								{(field) => (
									<Field>
										<Label htmlFor={field.name}>Confirm Password</Label>
										<Input
											id={field.name}
											name={field.name}
											type="password"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message} className="text-red-500">
												{error?.message}
											</p>
										))}
									</Field>
								)}
							</form.Field>

							<form.Subscribe>
								{(state) => (
									<Field>
										<Button
											type="submit"
											className="w-full"
											disabled={!state.canSubmit || state.isSubmitting}
										>
											{state.isSubmitting ? "Submitting..." : "Finish Setup"}
										</Button>
									</Field>
								)}
							</form.Subscribe>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
