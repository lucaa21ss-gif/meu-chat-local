/**
 * Fetch helper for consistent error handling with retry capability
 */

export function createFetchHelpers(fetchJson, showStatus) {
  return {
    doFetchWithRetry(action, successMessage, errorMessagePrefix) {
      return doFetchWithRetryImpl(action, successMessage, errorMessagePrefix, fetchJson, showStatus);
    },
    fetchJsonBody(url, method, body) {
      return fetchJson(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
  };
}

async function doFetchWithRetryImpl(action, successMessage, errorMessagePrefix, fetchJson, showStatus) {
  try {
    const result = await action();
    if (successMessage) showStatus(successMessage, { type: "success" });
    return result;
  } catch (error) {
    showStatus(`${errorMessagePrefix}: ${error.message}`, {
      type: "error",
      retryAction: action,
    });
    throw error;
  }
}

