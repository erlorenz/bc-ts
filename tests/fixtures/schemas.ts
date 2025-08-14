import type { UUID } from "node:crypto";
import z from "zod";

const SalesLine = z.object({
	lineObjectNumber: z.string(),
	quantity: z.number(),
});
export const OriginalSalesOrder = z.object({
	id: z.guid(),
	customerNumber: z.string(),
	number: z.string(),
	orderDate: z.string(),
	salesLines: z.array(SalesLine).optional(),
	someOther: z
		.object({
			id: z.string(),
			list: z.array(z.object({ id: z.string() })),
		})
		.optional(),
});

export const SalesOrder = OriginalSalesOrder.transform((val) => {
	return {
		id: val.id as UUID,
		customerNumber: val.customerNumber,
		number: val.number,
		orderDate: new Date(val.orderDate),
		salesLines: val.salesLines,
	};
});

type ExpandableKeys<T> = {
	[K in keyof T]: T[K] extends (unknown[] | object) | undefined
		? T[K] extends string | number | boolean | Date | null | undefined
			? never
			: K
		: never;
}[keyof T] &
	string;

type SalesOrder = z.infer<typeof SalesOrder>;

type SalesOrderExpands = ExpandableKeys<z.input<typeof SalesOrder>>;
