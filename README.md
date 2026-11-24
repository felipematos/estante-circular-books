# Estante Circular Books

Um aplicativo para anunciar e venda de livros usados na internet, com cadastro simples tirando foto da capa, apenas nome do livro, valor e peso. O anúncio deverá ficar disponível por um tempo limitado para ser pesquisado, o peso servirá para calcular o preço do frete via API, um cadastro completo do vendedor (dono da loja ou pessoa física) e um cadastro do comprador. A receita da venda do livro deverá descontar um percentual para o dono do aplicativo e o restante para o vendedor do livro.

## Locked
- Construir um marketplace online de livros usados com anúncios simples (foto da capa, título, preço e peso), busca de anúncios ativos, cadastro completo do vendedor (pessoa física ou dono de loja) e cadastro de compradores.
- Os anúncios ficam ativos por 30 dias e podem ser renovados com um clique. Decisão do usuário: “30 dias fixos com renovação”.
- A taxa da plataforma é 20% do valor do livro, além dos custos do gateway de pagamento. Decisão do usuário: “Defina 20% como a taxa da plataforma, mais custos do gateway de pagamento.” Mostrar ao vendedor o detalhamento e o líquido; não fixar custos ilustrativos do gateway como valores reais. Os R$ 50,00, R$ 1,50 e R$ 38,50 que aparecem no mockup são apenas conteúdo de exemplo, não tarifas configuradas.
- O modelo inicial de pagamento é simplificado, sem split automático entre vendedor e plataforma; a decisão do usuário foi “Versão Inicial Simplificada”. Registrar de forma transparente a comissão e o custo real do gateway, e permitir gestão/baixa manual de repasses enquanto o marketplace valida o modelo.
- Cotar frete por CEP e peso via API de transportadora. O provedor ainda não foi escolhido; não inventar tarifa. Manter o fluxo e o ponto de integração prontos, oferecendo estado claro de indisponibilidade até a conexão/configuração.
- Direção visual aprovada: “Go with 2 · Vitrine Clean Mercado”. Seguir as telas anexadas da vitrine e do novo anúncio como referências de look, estrutura e conteúdo, portando a lógica para a estrutura da aplicação, não colando as páginas HTML inteiras.
- Tokens e estilo extraídos dos arquivos aprovados: branco #FFFFFF como fundo; verde esmeralda #059669 para ações e destaques; tinta #111827; texto secundário #6B7280; linhas #E5E7EB; fundo suave #F3F4F6; verde suave #ECFDF5; cartões com raio 20px e imagens com raio 14px; tipografia Plus Jakarta Sans (Google Fonts), pesos 400, 500, 600, 700 e 800. Mobile-first, cards de livros em grade de duas colunas, busca e chip de CEP, filtros em chips, badge de expiração e barra inferior flutuante em cápsula com Início, Buscar, Vender, Chat e Perfil. Tela de anúncio com cartão tracejado para foto da capa, campos de título/preço/peso, resumo de deduções e CTA “Publicar Anúncio”. Copy aprovada inclui “O que você quer ler hoje?”, “Entregar em:”, “Perto de você”, “Menor preço”, “Recém-anunciados”, “Fotografar capa”, “Refazer foto”, “Título do livro”, “Preço de venda (R$)”, “Taxa da plataforma (20%)”, “Custos do gateway de pagamento”, “Você recebe líquido”, “Peso do livro (g)”, “Seu anúncio ficará ativo por 30 dias na busca, com renovação em 1 clique.” e “Publicar Anúncio”. Os quatro livros e vendedores mostrados na vitrine são conteúdo demonstrativo do mockup, não registros reais.
- Arquivos anexos incluem as telas selecionadas nos dois formatos disponíveis (HTML/JSON e imagens PNG) para consultar a composição visual e copy. Não reutilizar as fotos de perfil do mockup nem imagens remotas de demonstração; imagens de capas reais vêm dos vendedores. Se precisar de produtos de demonstração, usar capas gráficas neutras, sem representar capas reais protegidas.

## Open
- Faça a implementação real e funcional, não um protótipo clicável. Habilite Lovable Cloud para contas, dados persistentes e upload de fotos, se ainda não estiver conectado. Construa busca/vitrine, cadastro/login de comprador e vendedor, criação/edição/renovação/expiração de anúncios, checkout e acompanhamento de pedidos, estados vazios, carregamento, erro e responsividade.
- Integre o gateway de pagamento disponível na plataforma, usando ambiente de teste e fluxo de cobrança simples. Registre pedidos, taxas, status de pagamento e repasse manual; não implemente split automático. Se a configuração exigir credenciais ou decisão de provedor, solicite esses dados pelo fluxo seguro apropriado e não invente credenciais nem valores.
- Implemente cálculo de frete com integração por API quando o serviço for escolhido/configurado. Não invente tarifas: no modo sem integração, informe que a cotação ainda não está disponível, e mantenha o restante do marketplace testável.
- Defina e implemente os detalhes de arquitetura, validação, acessibilidade, segurança de uploads, privacidade e estados de interface que não foram especificados, sempre preservando a direção visual aprovada. Não acrescente funções que não façam sentido para um marketplace de livros usados.

Build a real working app, not a clickable prototype; the attached screens show layout, content and look and must not be copied as code. The screens are the moments the user designed, not the whole product. Before building, walk through each flow as its user would and design the steps and responses the screens leave out, including waiting, empty and error states. Enable backend functionality where needed; do not leave a core flow as “coming soon”. Look at every attached screen picture before writing code, use the finished screen copy exactly where it appears, replace mockup-only photos as specified above, and check the built screens at phone canvas 393×764. In the final reply, end with the headings “Changed from the mockups” and “Added beyond the mockups”, listing deliberate visual changes with reasons and each extra flow/state/interaction added.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://estante-circular-books.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1ced185e-3c4b-4937-aa77-fa0a33cc2443).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
