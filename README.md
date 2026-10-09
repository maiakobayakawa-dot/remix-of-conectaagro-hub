# Remix of ConectaAgro Hub

Objetivo do Projeto:

Crie um Dashboard de Gestão e Inteligência Agrícola em tempo real para monitoramento de plantações e agricultura de precisão. O design deve ser moderno, limpo, responsivo e intuitivo para produtores rurais.

Telas e Funcionalidades Necessárias:

Dashboard Principal (Tempo Real & IoT):

Visão geral das parcelas/talhões com status de saúde da cultura.

Cartões com métricas em tempo real (Umidade do solo, Temperatura ambiente, Umidade do ar, Radiação e Pluviosidade).

Indicador visual do Balanço Hídrico do Dia: Recomendação clara da quantia de água necessária ($L/m²$ e tempo de irrigação) calculada com base na evapotranspiração ($ET_0$), fase da cultura ($K_c$) e previsão do tempo.

Painel com previsão meteorológica embutida para os próximos 7 dias.

Diagnóstico Fitossanitário com IA:

Espaço para o usuário fazer upload/tirar foto de folhas ou plantas afetadas.

Interface simulada de análise por IA identificando possíveis pragas, doenças ou deficiências nutricionais com nível de confiança e recomendações de manejo.

Painel de Alertas Preditivos (ex: "Risco alto de fungos devido à umidade elevada").

Caderno de Campo Digital:

Registro de Insumos e Defensivos: Formulário para cadastrar aplicações de agrotóxicos/fertilizantes (data, produto, dosagem, período de carência com contador regressivo para colheita segura).

Diário de Bordo: Espaço para anotações diárias do produtor.

Galeria de Acompanhamento: Upload e linha do tempo de fotos da evolução do plantio.

Histórico e Calendário Agrícola:

Calendário interativo para consultar dados retroativos de qualquer dia do cultivo (clima, irrigação, fotos, insumos aplicados).

Funcionalidade para comparar o desempenho entre safras/talhões.

Estilo Visual e UX:

Paleta de cores inspirada na natureza: tons de verde agrícola, terra/marrom suave e azul hídrico.

Suporte a modo escuro/claro.

Design responsivo focado na usabilidade em tablets e smartphones no campo.

Inclua dados fictícios (mock data) completos para demonstração de todos os gráficos, cards e fotos.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/277b0272-23a8-422f-a0af-fa08e0d40bd4).

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
