/**
 * Validates that all path parameters are provided
 * @param pathParams - Object containing path parameters to validate
 * @throws Error if any parameter is missing or falsy
 */
export function validatePathParams(pathParams: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(pathParams)) {
    if (!value && value !== 0) { // Allow 0 as valid value for IDs
      throw new Error(`${key} is required`);
    }
  }
}