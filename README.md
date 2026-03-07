# CRM Inteligente com IA

Este é um sistema robusto de gerenciamento de relacionamento com clientes focado em equipes de vendas e corretores imobiliários. Ele integra uma poderosa API em Python com um Frontend moderno em React.

## Visão Geral Estrutural
- **Frontend**: Desenvolvido em **React**, utilizando **Vite** como bundler, estilizado amplamente com **TailwindCSS** e ícones **Lucide-React**. O painel de controle possui um design limpo, moderno e voltado a produtividade.
- **Backend**: API de alta de performance escrita em **Python** usando **FastAPI**. Comunica-se com um banco de dados **PostgreSQL** através do **SQLAlchemy** via models e validadas por schemas do **Pydantic**.
- **Autenticação e Permissões**: A arquitetura do sistema funciona com três níveis bem definidos de papel (Admin, Gerente de Vendas e Corretor), com JWT tokens validando o acesso nas rotas.

## Documentação de Funcionalidades e Telas Atuais

### 1. Dashboard Inicial (`/`)
Tela inicial de apresentação foca em dados analíticos macro e rápidos para decisões.
- **Micro-KPIs (Cards)**: Mostra no topo os números chave como Receita Estimada, Número de Leads, Taxa de Conversão, Contatos, Leads do Mês.
- **Visualizações em Gráficos**: Recharts alimenta um "Funil de Vendas", "Leads por Origem" e "Evolução Mensal", trazendo o Raio-X que gestores precisam em batida de olho. 

### 2. Gestão de Leads (`/leads`)
O coração do CRM. Listagem principal aonde corretores podem cadastrar e acompanhar potenciais interessados.
- **Listagem e Status**: Uma Tabela que detalha cada contato, mostrando o estágio que ele está, canal de origem, interesse e etc. (Tem suporte para exibição customizável de páginas com 10, 50 até 1000 registros).
- **Importador Customizado**: O sistema permite a importação de uma base gigantesca que a empresa já possua num arquivo **CSV** fazendo um DE-PARA do arquivo original inteligente e com tratamento de falhas.

### 3. Funil de Vendas - Kanban (`/kanban`)
Evolução interativa e visual dos negócios (`/leads`) em formato de esteira de negociação controlada por _drag-and-drop_ de colunas.
- Cada cartão de Lead passa pelo status: `Novo -> Atendimento -> Proposta -> Negociação -> Ganho/Perdido`.
- O Dashboard do card exibe indicadores financeiros estimados dos corretores dentro daquela tratativa.

### 4. Gestão de Empreendimentos (`/empreendimentos`)
Sistema de controle de portfólio de produtos ou empreendimentos da Cia imobiliária.
- Um cadastro visual rico com cards para cada empreendimento do catálogo. As informações possuem data de lançamento, código, preço tabela base, disponibilidade (%).
- Há funções interativas completas de Edição na Base bem elaborada no modal principal.

### 5. Controle de Equipe / Acessos (`/equipe`)
Tela poderosa que os Admins e Líderes dominam a rede de colaboradores. 
- Permite criar, resetar senha e atribuir as roles e relacionamentos dos subordinados. 
- Suporta dois modos de visualização modernos em tempo real: a Grade de Imagens de Corretor vs as extensas Tabelas densas de Auditoria de Criação.
- Permite importar corretores em massa via **Extrator/Importador CSV**.

### 6. Central de Relatórios Analíticos (`/relatorios`)
Motor central de extração detalhada de performance.
- **Múltiplos Bancos:** Extração pura de todos os dados permitindo a exploração das tabelas (Usuários, Leads, Empreendimentos, Tarefas, Contatos, etc).
- **Client-Side Data Engine**: Suporta filtragem avançada on-the-fly de Nome, Status, Data, Gerente ou Checkbox que gera imediatamente uma tabela pré-vizualizada rica embaixo e contadores automáticos em tela antes dele apertar O Export.
- Contém um Heatmap (Painel) de Análise de Densidade Atividades (em quais as horas se cadastram as pautas).

### 7. Perfil e Tela Detalhada do Lead (`/leads/:id`)
Aberto ao se clicar num lead na listagem ou funil. É um Hub focal na entidade Pessoa.
- Interface separada em detalhes de Cadastro lateral x Abas de Histórico na direta.
- **Relacionamentos (Novo Modelo)**: Cada Lead aceita o conceito de associar "Pessoas Relacionadas" / Familiares / Sócios para dentro do lead contendo dados independentes de CPF/e-mail etc.
- Permite inserção de Notas, Alteração de Estágio na Esteira, Agendamento e envio rápido pra WhatsApp. 

---
_Nota: O sistema mantém bloqueios lógicos entre entidades de um Admin para um Gerente (que visualiza sua sub-equipe), para o Corretor de vendas base (que só gerencia seus próprios leads)._
