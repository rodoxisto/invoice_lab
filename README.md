# Invoice Lab

Aplicação local de testes que importa transações Open Finance em JSON, infere os ciclos de fechamento e apresenta os lançamentos como faturas de cartão de crédito.

## Executar

```bash
npm install
npm run dev
```

Abra o endereço informado pelo Vite e importe um arquivo `.json`.

## Validar

```bash
npm test
npm run build
```

## Como o fechamento é inferido

O motor procura evidências nesta ordem:

1. campo explícito de fechamento no JSON;
2. fronteira cronológica entre lançamentos `POSTED` e `PENDING`;
3. padrão mensal de pagamentos;
4. estimativa conservadora quando as demais evidências não existem.

Compras, encargos e estornos são atribuídos ao primeiro fechamento igual ou posterior. Pagamentos são associados à fatura fechada imediatamente anterior. A tela de diagnóstico mostra a evidência e permite informar uma data real do PDF apenas para conferência.

Todo o processamento acontece no navegador. O arquivo importado não é enviado nem armazenado externamente.
