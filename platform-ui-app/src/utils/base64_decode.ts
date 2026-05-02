/**
 * Base64 decode utility for the UI
 * Handles base64 encoded data and attempts to unmarshal it to JSON
 */

/**
 * Decodes a base64 encoded string
 * @param encodedString - The base64 encoded string to decode
 * @returns The decoded string
 */
export function decodeBase64String(encodedString: string): string {
  if (!encodedString) {
    return encodedString;
  }

  try {
    // Decode base64 string
    const decodedString = atob(encodedString);
    return decodedString;
  } catch (error) {
    console.warn(
      'Failed to decode base64 string, treating as plain text:',
      error
    );
    // If base64 decoding fails, return the original string
    return encodedString;
  }
}

/**
 * Decodes base64 encoded data and attempts to unmarshal it to JSON
 * @param encodedData - The base64 encoded data string
 * @returns The decoded and parsed JSON object, or the decoded string if JSON parsing fails
 */
export function decodeBase64AndUnmarshal<T = unknown>(
  encodedData: string
): T | string {
  if (!encodedData) {
    return encodedData as T | string;
  }

  try {
    // Decode base64 string
    const decodedString = decodeBase64String(encodedData);

    // Try to parse as JSON
    try {
      const jsonResult = JSON.parse(decodedString);
      return jsonResult as T;
    } catch {
      // If JSON parsing fails, return the decoded string
      console.debug('Decoded content is not valid JSON, returning as string');
      return decodedString as T | string;
    }
  } catch (error) {
    console.warn('Failed to process base64 data:', error);
    // If anything fails, return the original string
    return encodedData as T | string;
  }
}

/**
 * Decodes base64 encoded request fields (prompt and output)
 * @param prompt - The base64 encoded prompt string
 * @param output - The base64 encoded output string (optional)
 * @returns Object with decoded prompt and output
 */
export function decodeRequestFields(prompt: string, output?: string) {
  const decodedPrompt = decodeBase64AndUnmarshal(prompt);
  const decodedOutput = output ? decodeBase64AndUnmarshal(output) : undefined;

  return {
    prompt: decodedPrompt,
    output: decodedOutput,
  };
}

/**
 * Type guard to check if a value is a valid JSON object
 * @param value - The value to check
 * @returns True if the value is a valid JSON object
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a valid JSON array
 * @param value - The value to check
 * @returns True if the value is a valid JSON array
 */
export function isJsonArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
