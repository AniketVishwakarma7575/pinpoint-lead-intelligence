const env = import.meta.env

export const config = {
  useMockApi: env.VITE_USE_MOCK_API !== "false",
  apiUrl: env.VITE_API_URL ?? "http://localhost:3001",
  mockMinLatencyMs: 250,
  mockMaxLatencyMs: 600,
}
