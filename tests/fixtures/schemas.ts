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
	salesOrderLines: z.array(SalesLine).optional(),
});

export const SalesOrder = OriginalSalesOrder.transform((val) => {
	return {
		id: val.id as UUID,
		customerNumber: val.customerNumber,
		number: val.number,
		orderDate: new Date(val.orderDate),
		lines: val.salesOrderLines,
	};
});

export type SalesOrder = z.infer<typeof SalesOrder>;
