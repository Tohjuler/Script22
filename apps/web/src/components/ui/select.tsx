"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as SelectPrimitive from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Select({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Select.Root>) {
	return <SelectPrimitive.Select.Root data-slot="select" {...props} />;
}

function SelectTrigger({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Select.Trigger>) {
	return (
		<SelectPrimitive.Select.Trigger
			className={cn(
				"flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			data-slot="select-trigger"
			{...props}
		>
			{children}
			<SelectPrimitive.Select.Icon asChild>
				<ChevronDownIcon className="h-4 w-4 opacity-50" />
			</SelectPrimitive.Select.Icon>
		</SelectPrimitive.Select.Trigger>
	);
}

function SelectValue({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Select.Value>) {
	return <SelectPrimitive.Select.Value data-slot="select-value" {...props} />;
}

function SelectPortal({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Select.Portal>) {
	return <SelectPrimitive.Select.Portal data-slot="select-portal" {...props} />;
}

function SelectContent({
	className,
	children,
	position = "popper",
	...props
}: React.ComponentProps<typeof SelectPrimitive.Select.Content>) {
	return (
		<SelectPrimitive.Select.Portal>
			<SelectPrimitive.Select.Content
				className={cn(
					"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in",
					position === "popper" &&
						"data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
					className,
				)}
				position={position}
				data-slot="select-content"
				{...props}
			>
				<SelectPrimitive.Select.Viewport
					className={cn(
						"p-1",
						position === "popper" &&
							"h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)",
					)}
				>
					{children}
				</SelectPrimitive.Select.Viewport>
			</SelectPrimitive.Select.Content>
		</SelectPrimitive.Select.Portal>
	);
}

function SelectItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Select.Item>) {
	return (
		<SelectPrimitive.Select.Item
			className={cn(
				"relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
				className,
			)}
			data-slot="select-item"
			{...props}
		>
			<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
				<SelectPrimitive.Select.ItemIndicator>
					<CheckIcon className="h-4 w-4" />
				</SelectPrimitive.Select.ItemIndicator>
			</span>
			<SelectPrimitive.Select.ItemText>
				{children}
			</SelectPrimitive.Select.ItemText>
		</SelectPrimitive.Select.Item>
	);
}

function SelectSeparator({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Select.Separator>) {
	return (
		<SelectPrimitive.Select.Separator
			className={cn("-mx-1 my-1 h-px bg-muted", className)}
			data-slot="select-separator"
			{...props}
		/>
	);
}

export {
	Select,
	SelectTrigger,
	SelectValue,
	SelectPortal,
	SelectContent,
	SelectItem,
	SelectSeparator,
};
