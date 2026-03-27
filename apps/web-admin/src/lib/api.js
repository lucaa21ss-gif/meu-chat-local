export const apiClient = {
  async request(method, path, body = null, headers = {}) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user-default',
        ...headers
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(path, options);

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  get(path, headers) {
    return this.request('GET', path, null, headers);
  },

  post(path, body, headers) {
    return this.request('POST', path, body, headers);
  },

  patch(path, body, headers) {
    return this.request('PATCH', path, body, headers);
  },

  delete(path, headers) {
    return this.request('DELETE', path, null, headers);
  }
};
