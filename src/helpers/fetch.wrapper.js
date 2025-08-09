// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// This file is a part of Media Pi frontend application

import { useAuthStore } from '@/stores/auth.store.js'
import { apiUrl, enableLog } from '@/helpers/config.js'

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

function request(method) {
    return async (url, body) => {
        const requestOptions = {
            method,
            headers: authHeader(url)
        };
        if (body) {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = JSON.stringify(body);
        }
        
        let response;
        try {
           if (enableLog) {
            console.log(url, requestOptions)
           }
           response = await fetch(url, requestOptions);
        } catch (error) {
            // Customize your error message here
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.');
            } else {
                throw new Error('Произошла непредвиденная ошибка при обращении к серверу: ' + error.message );
            }           
        }
            
        // Check if the response is ok (status in the range 200-299)
        if (!response.ok) {
            // If server returned an error response, try to parse it
            const errorText = await response.text();
            let errorMessage;
            let errorObj;
            try {
                // Try to parse as JSON
                errorObj = JSON.parse(errorText);
                errorMessage = errorObj.msg || `Ошибка ${response.status}`;
            } catch {
                // If not valid JSON, use text as is
                errorMessage = errorText || `Ошибка ${response.status}`;
            }

            const error = new Error(errorMessage);
            error.status = response.status;
            if (errorObj) error.data = errorObj;
            // Re-throw the error for further handling if needed
            throw error;
        }
        
        return handleResponse(response);
    };
}

function requestFile(method) {
    return async (url, body) => {
        const requestOptions = {
            method,
            headers: authHeader(url)
        };
        if (body) {
            requestOptions.body = body;
        }

        let response;
        try {
          if (enableLog) {
            console.log(url, requestOptions)
          }
          response = await fetch(url, requestOptions);
        } catch (error) {
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.');
            } else {
                throw new Error('Произошла непредвиденная ошибка при обращении к серверу: ' + error.message );
            }
        }

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

// helper functions

function authHeader(url) {
  // return auth header with jwt if user is logged in and request is to the api url
  const { user } = useAuthStore()
  const isLoggedIn = !!user?.token
  if (isLoggedIn && url.startsWith(apiUrl)) {
    return { Authorization: `Bearer ${user.token}` }
  } else {
    return {}
  }
}

function requestBlob(method) {
    return async (url) => {
        const requestOptions = {
            method,
            headers: authHeader(url)
        };
        
        let response;
        try {
           if (enableLog) {
            console.log(url, requestOptions)
           }
           response = await fetch(url, requestOptions);
        } catch (error) {
            // Customize your error message here
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.');
            } else {
                throw new Error('Произошла непредвиденная ошибка при обращении к серверу: ' + error.message );
            }           
        }
            
        // Check if the response is ok (status in the range 200-299)
        if (!response.ok) {
            // If server returned an error response, try to parse it
            const errorText = await response.text();
            let errorMessage;
            let errorObj;
            try {
                // Try to parse as JSON
                errorObj = JSON.parse(errorText);
                errorMessage = errorObj.msg || `Ошибка ${response.status}`;
            } catch {
                // If not valid JSON, use text as is
                errorMessage = errorText || `Ошибка ${response.status}`;
            }

            const error = new Error(errorMessage);
            error.status = response.status;
            if (errorObj) error.data = errorObj;
            // Re-throw the error for further handling if needed
            throw error;
        }
        
        return response;
    };
}

/**
 * Downloads a file from the server and initiates browser download
 * @param {string} fileUrl - The URL to download from
 * @param {string} defaultFilename - Fallback filename if none provided in headers
 * @returns {Promise<boolean>} - True if download initiated successfully
 */
async function downloadFile(fileUrl, defaultFilename) {
  try {
    const response = await requestBlob('GET')(fileUrl)
    
    let filename = defaultFilename
    const disposition = response.headers.get('Content-Disposition')
    if (disposition && disposition.includes('filename=')) {
      filename = disposition
        .split('filename=')[1]
        .replace(/["']/g, '')
        .trim()
    }
    
    // Process the blob and trigger download
    const blob = await response.blob()
    const objectUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(objectUrl)
    return true
  } catch (error) {
    console.error('Error downloading file:', error)
    throw error
  }
}

function handleResponse(response) {
  if (response.status == 204) {
    return Promise.resolve()
  }
  return response.text().then((text) => {
    try {
      const data = JSON.parse(text)
      if (enableLog) {
        console.log(response.status, response.statusText, data)
      }
      if (!response.ok) {
        const { user, logout } = useAuthStore()
        if ([401].includes(response.status)) {
          // auto logout if 401 Unauthorized response returned from api
          if (user) {
            logout()
          }
        }

        const error = (data && data.msg) || response.statusText
        return Promise.reject(error)
      }
      return data
    } catch {
      return Promise.reject(text)
    }
  })
}
