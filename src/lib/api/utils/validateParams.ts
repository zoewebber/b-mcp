/**
 * Validates that all required parameters are provided
 * @param params - Parameters to validate
 * @param requiredParams - List of required parameter names
 * @throws Error if any required parameter is missing or falsy
 */
export function validateParams(params: Record<string, unknown>, requiredParams: string[]): void {
  for (const key of requiredParams) {
    const value = params[key];
    if (!value && value !== 0) { // Allow 0 as valid value for IDs
      throw new Error(`${key} is required`);
    }
  }
}