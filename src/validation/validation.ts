const GUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidGUID(str: string): boolean {
	return GUID_REGEX.test(str);
}

export function notEmpty(
	data:
		| string
		| Array<unknown>
		| Record<string, unknown>
		| Map<unknown, unknown>,
) {
	if (!data) return false;

	if (typeof data === "string") {
		return data !== "";
	}

	if (Array.isArray(data)) {
		return data.length > 0;
	}

	if (data instanceof Map) {
		return data.size > 0;
	}

	return Object.entries(data).length > 0;
}

export function isEmpty(
	data:
		| string
		| Array<unknown>
		| Record<string, unknown>
		| Map<unknown, unknown>,
) {
	return !notEmpty(data);
}

export function isValidURL(str?: string) {
	if (!str) return false;

	return URL.parse(str) !== null;
}
