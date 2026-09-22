# Editor A4 — Digitar 📖✍️

Editor profissional de livros e manuscritos em formato A4, com diagramação em tempo real, paginação automática e sumário romanizado.

---

## 🌟 Funcionalidades

- **Diagramação A4 Dinâmica:** Paginação automática em conformidade com as dimensões reais de folha A4 (210mm x 297mm).
- **Sumário Romanizado Automático:** Capítulos identificados estritamente por Algarismos Romanos (`Capítulo I`, `Capítulo II`, etc.) com vinculação automática de páginas.
- **Estrutura por Seções:** Organização por capítulos e seções encadeadas (`1.1`, `1.2`, `2.1`).
- **Visualização Lado a Lado (Grade) e Zoom:** Aproveitamento inteligente do espaço de tela com alternador de disposição e controles de zoom.
- **Exportação e Impressão:** Suporte completo para impressão e exportação em PDF (`Ctrl+P` / `Cmd+P`).

---

## 🚀 Como Executar em Qualquer Sistema Operacional (Windows / macOS / Linux)

### Pré-requisitos

- **Node.js**: `v18.0.0` ou superior.
- **npm**: `v9.0.0` ou superior.

### 1. Clonar o repositório

```bash
git clone https://github.com/JunioSilvestre/digitar.git
cd digitar
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Executar em ambiente de desenvolvimento

```bash
npm run dev
```

Acesse no navegador:

```text
http://localhost:8080
```

Se quiser acessar de outro dispositivo na mesma rede local ou via Tailscale:

```text
http://<SEU_IP>:8080
```

---

## 📜 Scripts Disponíveis

- `npm run dev` — Inicia o servidor de desenvolvimento Vite (acessível na rede em `0.0.0.0:8080`).
- `npm run build` — Executa a compilação do projeto para produção.
- `npm run preview` — Visualiza a compilação de produção localmente.
- `npm run typecheck` — Executa a verificação de tipos com o TypeScript (`tsc --noEmit`).
- `npm run lint` — Executa o ESLint para manter o código limpo.

---

## 💻 Compatibilidade Multiplataforma (Git & SO)

Este repositório está pré-configurado com `.gitattributes` para padronizar as quebras de linha (`LF`) entre **Windows**, **macOS** e **Linux**, evitando conflitos em commits realizados em diferentes sistemas operacionais.
