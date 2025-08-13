import z from "zod";

export const SalesOrder = z.object({
	id: z.guid(),
	customerNumber: z.string(),
	number: z.string(),
});

export const SalesOrderTransformed = SalesOrder.transform((val) => {
	return {
		id: val.id,
		customer_number: val.customerNumber,
		order_number: val.number,
	};
});
