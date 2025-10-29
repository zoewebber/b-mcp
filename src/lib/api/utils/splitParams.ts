/**
 * Splits parameters into path parameters and query parameters
 * @param params - All parameters (both path and query)
 * @param pathParamKeys - Keys that should be used as path parameters
 * @returns Object with pathParams and queryParams
 */
export function splitParams(
  params: Record<string, unknown>,
  pathParamKeys: string[]
): { pathParams: Record<string, unknown>; queryParams: Record<string, string> } {
  const pathParams: Record<string, unknown> = {};
  const queryParams: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (pathParamKeys.includes(key)) {
      pathParams[key] = value;
    } else {
      queryParams[key] = String(value);
    }
  }

  return { pathParams, queryParams };
}