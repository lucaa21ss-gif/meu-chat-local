export default function GuidePage() {
  return (
    <section className="card">
      <h2>Guia Rapido</h2>
      <ol className="guide-steps">
        <li>
          <strong>Instale dependencias:</strong>
          <pre>npm install</pre>
        </li>
        <li>
          <strong>Suba o modelo local:</strong>
          <pre>ollama serve</pre>
        </li>
        <li>
          <strong>Inicie API + Web:</strong>
          <pre>npm run dev --workspace apps/api{"\n"}npm run dev --workspace apps/web</pre>
        </li>
        <li>
          <strong>Acesse:</strong> <code>/app</code> para chat e <code>/admin</code> para operacao.
        </li>
      </ol>

      <h3 className="section-title">Atalhos uteis</h3>
      <ul className="simple-list">
        <li>
          <strong>Ctrl+N</strong>: nova conversa
        </li>
        <li>
          <strong>Ctrl+K</strong>: foco em busca
        </li>
        <li>
          <strong>?</strong>: ajuda de atalhos
        </li>
      </ul>
    </section>
  );
}
