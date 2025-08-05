// Copyright (c) 2025 sw.consulting
// Licensed under the MIT License.
// This file is a part of Mediapi frontend application

import { useAuthStore } from '@/stores/auth.store.js'
import { apiUrl, enableLog } from '@/helpers/config.js'

export const fetchWrapper = {
  get: request('GET'),
  post: request('POST'),
  put: request('PUT'),
  delete: request('DELETE')
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
        
        var response;
        try {
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
            const error = await response.text();
            let errorMessage;
            try {
                // Try to parse as JSON
                const errorObj = JSON.parse(error);
                errorMessage = errorObj.msg || `Ошибка ${response.status}`;
            } catch {
                // If not valid JSON, use text as is
                errorMessage = error || `Ошибка ${response.status}`;
            }
            
            // Re-throw the error for further handling if needed
            throw new Error(errorMessage);
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
