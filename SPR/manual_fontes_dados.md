# Manual de Fontes de Dados do SPR 1.1

## 1. Módulo de Análise

### Fontes de Dados:
- **Notícias e Redes Sociais**:
  - **Fonte**: APIs de notícias (e.g., Google News API), plataformas de redes sociais (e.g., Twitter API).
  - **Confiabilidade**: Alta, mas sujeita a ruído; validação cruzada com múltiplas fontes é recomendada.
  - **Frequência de Atualização**: Contínua, com coleta em tempo real ou em intervalos regulares (e.g., a cada hora).
  - **Importância**: Essencial para análise de sentimento e detecção de tendências emergentes.

- **Relatórios Mercadológicos**:
  - **Fonte**: Relatórios de instituições como CONAB, USDA.
  - **Confiabilidade**: Muito alta; fontes oficiais e reconhecidas.
  - **Frequência de Atualização**: Mensal ou trimestral.
  - **Importância**: Base para análises de mercado e comparativos de precificação.

## 2. Módulo de Suporte Técnico

### Fontes de Dados:
- **Logs e Monitoramento**:
  - **Fonte**: Sistemas internos de logging e monitoramento (e.g., ELK Stack).
  - **Confiabilidade**: Alta; dados gerados internamente.
  - **Frequência de Atualização**: Contínua.
  - **Importância**: Crucial para manutenção e suporte técnico.

## 3. Módulo de Precificação

### Fontes de Dados:
- **Preços Agrícolas**:
  - **Fonte**: APIs de mercado (e.g., CEPEA, B3).
  - **Confiabilidade**: Alta; fontes oficiais e de mercado.
  - **Frequência de Atualização**: Diária.
  - **Importância**: Fundamental para previsões de preços.

- **Dados Climáticos**:
  - **Fonte**: APIs meteorológicas (e.g., INMET, Open-Meteo).
  - **Confiabilidade**: Alta; validação com múltiplas fontes é recomendada.
  - **Frequência de Atualização**: Diária ou horária.
  - **Importância**: Impacta diretamente nas previsões de produção e preços.

- **Câmbio e Custos**:
  - **Fonte**: APIs financeiras (e.g., Banco Central, Yahoo Finance).
  - **Confiabilidade**: Alta; fontes oficiais e de mercado.
  - **Frequência de Atualização**: Diária.
  - **Importância**: Ajusta previsões de preços com base em variações econômicas.

## Considerações para a Fonte da Decisão
- **Previsibilidade de Preços**: O sistema deve ser capaz de prever preços agrícolas com um erro máximo de MAPE ≤ 6% em até 3 meses de funcionamento e de no máximo 1,5% para um ano.
- **Interpretação Operacional**: Todos os modelos (soja, milho, sorgo, etc.) devem ser validados com conjuntos de teste independentes, garantindo que o erro médio permaneça abaixo de 6%.
- **Avaliações de Acurácia**: Devem ser contínuas, utilizando conjuntos de dados de teste independentes para garantir a precisão e a confiabilidade das previsões. 