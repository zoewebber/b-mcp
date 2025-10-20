import { z } from 'zod';
import logger from './logger.js';

/**
 * Options for the API request
 */
export interface ApiRequestOptions {
  token?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown>;
  additionalHeaders?: Record<string, string>;
}

/**
 * API Error type representing all possible API errors
 */
export class ApiError extends Error {
  statusCode?: number;
  
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export type ApiResult<T> = [T, null] | [null, ApiError];

/**
 * Makes a request to an API with application/json content type 
 * and Authorization Bearer token from BUDDY_TOKEN env variable
 * Returns Go-style [result, error] tuple
 */
export async function apiRequest<T>(
  path: string, 
  options?: ApiRequestOptions
): Promise<ApiResult<T>> {
  const baseUrl = process.env.BUDDY_API_URL;
  
  if (!baseUrl) {
    return [null, new ApiError('BUDDY_API_URL environment variable is not set')];
  }

  const {
    method = 'GET',
    body,
    additionalHeaders = {},
    token = ''
  } = options || {};

  // Ensure path starts with / if needed
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Remove trailing slash from baseUrl if present
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  const url = `${normalizedBaseUrl}${normalizedPath}`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...additionalHeaders,
  };

  // Set environment variable to disable certificate validation
  // This must be set before the Node.js process starts
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const requestOptions = {
    method,
    headers,
  };

  if (body && (method !== 'GET')) {
    // @ts-ignore - TypeScript doesn't recognize body property 
    // but it's supported by the standard fetch API
    requestOptions.body = JSON.stringify(body);
  }

  try {
    logger.debug(`API Request: ${method} ${url}`);
    if (body) {
      logger.debug(`Request body: ${JSON.stringify(body)}`);
    }
    
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to read error response');
      const errorMsg = `API request failed with status ${response.status}: ${errorText}`;
      logger.error(errorMsg);
      return [null, new ApiError(errorMsg, response.status)];
    }

    const data = await response.json();
    logger.debug(`API Response: ${JSON.stringify(data).substring(0, 200)}${JSON.stringify(data).length > 200 ? '...' : ''}`);
    return [data as T, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`API request error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Type-safe API request with Zod schema validation
 * Returns Go-style [result, error] tuple
 */
export async function typedApiRequest<T>(
  path: string, 
  schema: z.ZodType<T>,
  options: ApiRequestOptions
): Promise<ApiResult<T>> {
  const [data, error] = await apiRequest(path, options);
  
  if (error) {
    return [null, error];
  }
  
  try {
    const parsed = schema.parse(data);
    return [parsed, null];
  } catch (validationError) {
    const errorMsg = validationError instanceof Error ? validationError.message : String(validationError);
    logger.error(`Schema validation error: ${errorMsg}`);
    return [null, new ApiError(`Schema validation error: ${errorMsg}`)];
  }
}