export function startHttpServer({ app, port, host = "0.0.0.0", logger }) {
  const server = app.listen(port, host, () => {
    logger.info(
      `API rodando em http://${host}:${port} (local: http://localhost:${port})`,
    );
  });
  return server;
}
