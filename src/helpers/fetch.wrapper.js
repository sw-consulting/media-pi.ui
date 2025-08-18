/**
 * Fetch Wrapper Module
 * This file is a part of Media Pi frontend application
 * 
 * Provides a centralized HTTP client wrapper around the native Fetch API with enhanced
 * functionality for the Media Pi application. This module handles authentication,
 * error management, file operations, and response processing.
 * 
 * Key Features:
 * - Automatic authentication header injection for API requests
 * - Consistent error handling with user-friendly Russian messages
 * - Support for JSON, file upload, and binary download operations
 * - Automatic token validation and logout on authentication failures
 * - Configurable request logging for debugging
 * 
 * Authentication Flow:
 * - Automatically adds Bearer token to requests targeting the API URL
 * - Handles 401 responses by triggering automatic logout
 * - Supports requests to external URLs without authentication
 * 
 * @module FetchWrapper
 * @author Maxim Samsonov
 * @since 2025
 */

import { useAuthStore } from '@/stores/auth.store.js'
import { apiUrl, enableLog } from '@/helpers/config.js'

/**
 * Main fetch wrapper object providing HTTP methods
 * 
 * Exposes a clean API for making HTTP requests with consistent behavior
 * across the application. Each method returns a promise that resolves
 * with the response data or rejects with an appropriate error.
 * 
 * @type {Object}
 * 
 * @example
 * // GET request
 * const users = await fetchWrapper.get('/api/users')
 * 
 * // POST request with JSON body
 * const newUser = await fetchWrapper.post('/api/users', { name: 'John' })
 * 
 * // File upload
 * const formData = new FormData()
 * formData.append('file', file)
 * await fetchWrapper.postFile('/api/upload', formData)
 * 
 * // File download
 * await fetchWrapper.downloadFile('/api/files/123', 'document.pdf')
 */
export const fetchWrapper = {
  get: request('GET'),
  post: request('POST'),
  put: request('PUT'),
  patch: request('PATCH'),
  delete: request('DELETE'),
  postFile: requestFile('POST'),
  getFile: requestBlob('GET'),
  downloadFile: downloadFile
}

/**
 * Creates a request function for the specified HTTP method
 * 
 * This factory function creates method-specific request handlers that include
 * automatic authentication, error handling, and response processing.
 * Handles JSON request/response bodies and provides consistent error messages.
 * 
 * @param {string} method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @returns {Function} Async function that performs the HTTP request
 * 
 * @example
 * // Internal usage - creates the fetchWrapper.post method
 * const postRequest = request('POST')
 * await postRequest('/api/users', { name: 'John', email: 'john@example.com' })
 */
function request(method) {
    return async (url, body) => {
        // Prepare request configuration with authentication headers
        const requestOptions = {
            method,
            headers: authHeader(url)
        };
        
        // Add JSON content-type and serialize body for requests with data
        if (body) {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(body);
        }
        
        let response;
        try {
           // Log request details if debugging is enabled
           if (enableLog) {
            console.log(url, requestOptions)
           }
           response = await fetch(url, requestOptions);
        } catch (error) {
            // Handle network-level errors with user-friendly messages
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.');
            } else {
                throw new Error('Произошла непредвиденная ошибка при обращении к серверу: ' + error.message );
            }           
        }
            
        // Process HTTP error responses (4xx, 5xx status codes)
        if (!response.ok) {
            // Try to extract error message from server response
            const errorText = await response.text();
            let errorMessage;
            let errorObj;
            try {
                // Parse JSON error response if available
                errorObj = JSON.parse(errorText);
                errorMessage = errorObj.msg || `Ошибка ${response.status}`;
            } catch {
                // Fall back to raw text or generic status message
                errorMessage = errorText || `Ошибка ${response.status}`;
            }

            // Create enhanced error object with status and data
            const error = new Error(errorMessage);
            error.status = response.status;
            if (errorObj) error.data = errorObj;
            throw error;
        }
        
        // Process successful response through standard handler
        return handleResponse(response);
    };
}

/**
 * Creates a file upload request function for the specified HTTP method
 * 
 * Similar to the standard request function but designed for file uploads.
 * Does not set Content-Type header to allow the browser to set it automatically
 * with proper boundary parameters for multipart/form-data.
 * 
 * @param {string} method - HTTP method (typically POST or PUT)
 * @returns {Function} Async function that performs file upload requests
 * 
 * @example
 * // Upload a file with form data
 * const formData = new FormData()
 * formData.append('file', fileInput.files[0])
 * formData.append('description', 'User avatar')
 * 
 * const uploadRequest = requestFile('POST')
 * await uploadRequest('/api/upload', formData)
 */
function requestFile(method) {
    return async (url, body) => {
        // Prepare request with authentication but no content-type header
        const requestOptions = {
            method,
            headers: authHeader(url)
        };
        
        // Add body (typically FormData) without serialization
        if (body) {
            requestOptions.body = body;
        }

        let response;
        try {
          // Log request details if debugging is enabled
          if (enableLog) {
            console.log(url, requestOptions)
          }
          response = await fetch(url, requestOptions);
        } catch (error) {
            // Handle network errors with user-friendly messages
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.');
            } else {
                throw new Error('Произошла непредвиденная ошибка при обращении к серверу: ' + error.message );
            }
        }

        // Process HTTP error responses
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage;
            let errorObj;
            try {
                errorObj = JSON.parse(errorText);
                errorMessage = errorObj.msg || `Ошибка ${response.status}`;
            } catch {
                errorMessage = errorText || `Ошибка ${response.status}`;
            }
            const error = new Error(errorMessage);
            error.status = response.status;
            if (errorObj) error.data = errorObj;
            throw error;
        }

        return handleResponse(response);
    };
}

/**
 * Generates authentication headers for API requests
 * 
 * Automatically includes Bearer token in Authorization header for requests
 * to the configured API URL. External requests are sent without authentication.
 * This enables the application to make both authenticated API calls and
 * unauthenticated requests to external services.
 * 
 * @param {string} url - The request URL to check for authentication requirements
 * @returns {Object} Headers object with Authorization header if needed
 * 
 * @example
 * // API request - includes Bearer token
 * authHeader('https://api.mediapi.com/users') 
 * // → { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIs...' }
 * 
 * // External request - no authentication
 * authHeader('https://external-service.com/data')
 * // → {}
 */
function authHeader(url) {
  // Check if user is authenticated and request is for API
  const { user } = useAuthStore()
  const isLoggedIn = !!user?.token
  
  if (isLoggedIn && url.startsWith(apiUrl)) {
    return { Authorization: `Bearer ${user.token}` }
  } else {
    return {}
  }
}

/**
 * Creates a binary data request function for file downloads
 * 
 * Specialized request function for retrieving binary data (files, images, etc.).
 * Returns the raw Response object instead of processing it as JSON,
 * allowing the caller to handle the binary data appropriately.
 * 
 * @param {string} method - HTTP method (typically GET)
 * @returns {Function} Async function that returns raw Response for binary data
 * 
 * @example
 * // Download a file as blob
 * const getBlobRequest = requestBlob('GET')
 * const response = await getBlobRequest('/api/files/123')
 * const blob = await response.blob()
 * 
 * // Create download URL
 * const url = URL.createObjectURL(blob)
 */
function requestBlob(method) {
    return async (url) => {
        // Prepare request with authentication headers
        const requestOptions = {
            method,
            headers: authHeader(url)
        };
        
        let response;
        try {
           // Log request details if debugging is enabled
           if (enableLog) {
            console.log(url, requestOptions)
           }
           response = await fetch(url, requestOptions);
        } catch (error) {
            // Handle network errors with user-friendly messages
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.');
            } else {
                throw new Error('Произошла непредвиденная ошибка при обращении к серверу: ' + error.message );
            }           
        }
            
        // Process HTTP error responses
        if (!response.ok) {
            // Try to extract error message from server response
            const errorText = await response.text();
            let errorMessage;
            let errorObj;
            try {
                errorObj = JSON.parse(errorText);
                errorMessage = errorObj.msg || `Ошибка ${response.status}`;
            } catch {
                errorMessage = errorText || `Ошибка ${response.status}`;
            }

            const error = new Error(errorMessage);
            error.status = response.status;
            if (errorObj) error.data = errorObj;
            throw error;
        }
        
        // Return raw response for binary data processing
        return response;
    };
}

/**
 * Downloads a file from the server and initiates browser download
 * 
 * Handles the complete file download process including:
 * - Fetching the file from the server
 * - Extracting filename from Content-Disposition header
 * - Creating a blob URL and triggering browser download
 * - Cleaning up temporary resources
 * 
 * @param {string} fileUrl - The URL to download the file from
 * @param {string} defaultFilename - Fallback filename if server doesn't provide one
 * @returns {Promise<boolean>} True if download was initiated successfully
 * 
 * @example
 * // Download a user's profile document
 * await fetchWrapper.downloadFile('/api/users/123/document', 'profile.pdf')
 * 
 * // Download with server-provided filename
 * await fetchWrapper.downloadFile('/api/reports/monthly', 'report.xlsx')
 */
async function downloadFile(fileUrl, defaultFilename) {
    // Fetch the file as binary data
    const response = await requestBlob('GET')(fileUrl)
    
    // Extract filename from Content-Disposition header if available
    let filename = defaultFilename
    const disposition = response.headers.get('Content-Disposition')
    if (disposition && disposition.includes('filename=')) {
      filename = disposition
        .split('filename=')[1]
        .replace(/["']/g, '')  // Remove quotes
        .trim()
    }
    
    // Create blob URL and trigger download
    const blob = await response.blob()
    const objectUrl = window.URL.createObjectURL(blob)
    
    // Create temporary download link and click it
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    
    // Clean up temporary elements and URLs
    a.remove()
    window.URL.revokeObjectURL(objectUrl)
    return true
}

/**
 * Processes HTTP response and handles authentication/authorization
 * 
 * Central response handler that:
 * - Handles empty responses (204 No Content)
 * - Parses JSON responses
 * - Manages authentication errors (401 Unauthorized)
 * - Provides consistent error handling and logging
 * 
 * @param {Response} response - The fetch Response object to process
 * @returns {Promise} Parsed response data or rejection with error message
 * 
 * @example
 * // Internal usage after successful fetch
 * const response = await fetch('/api/users')
 * const data = await handleResponse(response)  // Returns parsed JSON
 */
function handleResponse(response) {
  // Handle empty success responses
  if (response.status == 204) {
    return Promise.resolve()
  }
  
  // Process text response and attempt JSON parsing
  return response.text().then((text) => {
    try {
      const data = JSON.parse(text)
      
      // Log response details if debugging is enabled
      if (enableLog) {
        console.log(response.status, response.statusText, data)
      }
      
      // Handle error responses that weren't caught earlier
      if (!response.ok) {
        const { user, logout } = useAuthStore()
        
        // Handle authentication failures
        if ([401].includes(response.status)) {
          // Auto logout if 401 Unauthorized response returned from api
          if (user) {
            logout()
          }
        }

        // Extract error message from response or use generic message
        const error = (data && data.msg) || response.statusText
        return Promise.reject(error)
      }
      
      return data
    } catch {
      // Handle non-JSON responses by returning raw text as error
      return Promise.reject(text)
    }
  })
}
