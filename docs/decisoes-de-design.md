# Decisões de design já tomadas

## Paleta
Paleta final: A (azul), aprovada pelo Thiago em 3 de outubro de 2026. Valores em `src/theme/colors.ts`.

Ajustes aprovados para passar no contraste (texto 4,5 para 1, ícones e bordas 3 para 1):

| Modo | Cor | Antes | Depois | Motivo |
| --- | --- | --- | --- | --- |
| Claro | Linha forte (novo) | não existia | #6B7A99 | Setas e chave desligada usavam a cor de linha, 1,4 para 1 |
| Claro | Âmbar | #B45309 | #A14A07 | 4,1 para 1 sobre o azul claro |
| Claro | Vermelho | #DC2626 | #B91C1C | 3,9 para 1 sobre o vermelho claro |
| Escuro | Azul | #4D8EFF | #6FA3FF | 4,4 para 1 sobre o azul escuro |
| Escuro | Texto do botão | #FFFFFF | #0D1117 | 3,2 para 1 sobre o azul |
| Escuro | Linha forte (novo) | não existia | #66799A | Mesmo motivo do claro |
| Escuro | Texto sobre vermelho (novo) | branco | #0D1117 | Branco sobre #FF6B6B não passa |

O alto contraste foi criado a partir da A, aprovado pelo Thiago. Liga sozinho quando o celular pede (Aumentar contraste no iPhone, Texto de alto contraste no Android).

O teste `__tests__/contrast.test.ts` confere todas as combinações nos quatro modos.

## Texto
- Corpo do texto em 16, texto de apoio em 14, rótulos de seção em 12, texto bíblico em 19 (Literata).
- O protótipo usa 14 no corpo e 12 no apoio. No app subiu para 16 e 14, por causa da regra de acessibilidade.

## Toque
- Toda área tocável tem no mínimo 48 de altura, o que cobre 44 pt no iPhone e 48 dp no Android.

## Sem sequência
- No lugar de "12 dias" (sequência), o Hoje mostra o total de dias com leitura ou oração, com ícone de calendário no lugar do raio.
