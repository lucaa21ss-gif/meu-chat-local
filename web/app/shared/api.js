export function createApiClient(options = {}) {
  const baseUrl = options.baseUrl || "";

  return {
    async fetchJson(path, requestOptions = {}) {
      const response = await fetch(`${baseUrl}${path}`, requestOptions);
      const responseTraceId = response.headers.get("x-trace-id") || null;

      if (!response.ok) {
        let detail = "";
        let serverTraceId = responseTraceId;

        try {
          const data = await response.json();
          detail = data?.error || "";
          if (data?.traceId) serverTraceId = data.traceId;
        } catch {
          try {
            detail = await response.text();
          } catch {
            detail = "";
          }
        }

        const fallback = `Falha na requisicao (${response.status})`;
        const err = new Error((detail || fallback).trim());
        err.traceId = serverTraceId;
        err.status = response.status;
        throw err;
      }

      return response.json();
    },
  };
}