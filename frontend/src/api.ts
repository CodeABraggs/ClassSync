import axios from 'axios';

// The browser client uses Axios's built-in same-origin XSRF cookie handling.
export const api = axios.create({ baseURL: '/api', withCredentials: true });

export function createReaderApi(token: string) {
  return axios.create({ baseURL: '/api', headers: { 'X-Classroom-Link': token }, withXSRFToken: false });
}

export async function initCsrf() {
  await api.get('/auth/csrf');
}

export function errorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string; error?: string }>(error)) {
    const data = error.response?.data;
    return data?.message || data?.error || 'Something went wrong';
  }
  return 'Something went wrong';
}
