export async function to<T>(
  promise: Promise<T>
): Promise<
  | [T, null]
  | [null, Error]
> {
  try {
    const result = await promise;
    return [result, null];
  } catch (err) {
    if (err instanceof Error) {
      return [null, err];
    }

    return [null, new Error(String(err))];
  }
}