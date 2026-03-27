/**
 * @file start-desktop.js 
 * @description Injetor nativo cross-platform para iniciar a aplicacao em modo Desktop.
 * Evita o erro 'DESKTOP_MODE não reconhecido' em shells do Windows CMD que não
 * suportam injeção inline (VAR=value node script.js) e também blinda o projeto
 * contra quebra em caminhos de rede mapeados (UNC paths).
 */

process.env.DESKTOP_MODE = "true";

// Dinamicamente importa a entry principal com o env ja preparado no escopo atual
import("./index.js").catch(err => {
    console.error("Falha ao inicializar o servidor Desktop:", err);
    process.exit(1);
});
