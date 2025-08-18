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
	orderDate: z.string().brand("dateOnly"),
	salesOrderLines: z.array(SalesLine).optional(),
});

export const SalesOrder = OriginalSalesOrder.transform((val) => {
	return {
		id: val.id,
		customerNumber: val.customerNumber,
		number: val.number,
		orderDate: val.orderDate,
		lines: val.salesOrderLines,
	};
});

export type SalesOrder = z.infer<typeof SalesOrder>;

export type SalesOrderCreate = {
	id?: UUID;
	customerNumber: string;
	number?: string;
	orderDate?: string;
};

export type SalesOrderUpdate = {
	customerNumber?: string;
	orderDate?: string;
};

export type SalesOrderActions = "release" | "post";
