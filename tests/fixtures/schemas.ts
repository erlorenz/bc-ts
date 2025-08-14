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

type SalesOrder = z.infer<typeof SalesOrder>;
