import { Ollama } from "ollama";

export const client = new Ollama({
  host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
});
