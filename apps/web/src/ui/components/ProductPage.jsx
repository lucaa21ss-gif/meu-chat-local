export default function ProductPage() {
  const features = [
    "Privacidade local com dados na sua maquina",
    "Modo offline sem dependencia obrigatoria de nuvem",
    "Historico persistente de conversas",
    "Modelos customizaveis com Ollama",
    "Importacao e exportacao em JSON/Markdown",
    "Backup e recuperacao de dados",
    "Suporte a documentos (RAG)",
    "Perfis de usuario e controle de acesso",
    "Health e observabilidade integrados",
    "Auditoria de eventos criticos",
  ];

  return (
    <section className="card">
      <h2>Produto</h2>
      <p>
        Meu Chat Local e um assistente de IA local-first para uso profissional com foco em privacidade,
        resiliencia e operacao em rede domestica.
      </p>

      <h3 className="section-title">Principais Caracteristicas</h3>
      <ul className="feature-list">
        {features.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3 className="section-title">Requisitos Basicos</h3>
      <ul className="simple-list">
        <li>Node.js 20+</li>
        <li>Ollama instalado e em execucao</li>
        <li>Navegador moderno (Chrome, Firefox, Safari ou Edge)</li>
        <li>Recomendado: 4 GB+ de RAM e espaco para modelos</li>
      </ul>
    </section>
  );
}
