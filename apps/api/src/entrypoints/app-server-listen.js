export function startHttpServer({ app, port, logger }) {
  const server = app.listen(port, () => {
    logger.info(`API rodando em http://localhost:${port}`);
  });
  return server;
}
