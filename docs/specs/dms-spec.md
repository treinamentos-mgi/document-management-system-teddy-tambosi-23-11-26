# Especificação - Document Management System

Versão: MVP inicial  
Status: Especificação para orientar implementação futura

## 1. Objetivo

Entregar um sistema web para enviar documentos, listar e baixar os documentos associados a um identificador de usuário, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição.
- Listagem dos documentos associados ao usuário informado.
- Download de um documento pelo identificador, limitado ao usuário associado.
- Associação de documentos a um identificador lógico de usuário.
- Validação de formato e tamanho dos arquivos enviados.
- Interface web para envio, listagem e download.
- Armazenamento local de arquivos com Multer `diskStorage`.
- Metadados mantidos em memória durante a execução do processo.

A associação a um usuário é apenas uma separação funcional nesta versão. Não há cadastro, login, autenticação ou garantia de que o identificador informado corresponda à identidade real de uma pessoa.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Banco de dados ou persistência durável de metadados.
- Versionamento, compartilhamento, pastas, edição ou exclusão de documentos.
- Cadastro de usuários, login, autenticação e autorização baseada em identidade verificada.
- Busca avançada, filtros e paginação.
- Antivírus, análise de conteúdo e transformação dos arquivos.
- Garantia de recuperação dos metadados depois de reiniciar o backend.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | Identificar o usuário lógico da operação | As operações de envio, listagem e download exigem `X-User-Id` não vazio, com até 128 caracteres e sem caracteres de controle. O valor é tratado como identificador fornecido pelo cliente, não como credencial. |
| RF-02 | Enviar um documento | O usuário pode enviar um arquivo no campo multipart `file`. Uma requisição aceita exatamente um arquivo, de até 10 MiB (10.485.760 bytes), em um dos formatos permitidos nesta especificação. |
| RF-03 | Criar metadados após o envio | Após salvar o arquivo localmente, o sistema cria um identificador único, associa o registro ao `X-User-Id` e retorna os metadados públicos. Se não for possível registrar os metadados, o arquivo recém-enviado deve ser removido. |
| RF-04 | Preservar o nome original sem usá-lo como caminho | O nome recebido é registrado como `originalName` para exibição e download. O nome físico é gerado pelo sistema; nomes repetidos são aceitos e não sobrescrevem arquivos existentes. |
| RF-05 | Listar documentos próprios | A listagem retorna somente registros cujo `owner` corresponda exatamente ao `X-User-Id`. A ordem é da data de envio mais recente para a mais antiga; uma lista sem registros retorna `documents: []`. |
| RF-06 | Baixar documento próprio | O usuário pode baixar um documento pelo `id` se o registro pertencer ao mesmo `X-User-Id`. A resposta contém bytes do arquivo, tipo de conteúdo e disposição para download com o nome original. |
| RF-07 | Não revelar documentos de outros usuários | Para identificador inexistente, não pertencente ao usuário, ou cujo arquivo local não esteja disponível, a API responde `404` com o mesmo formato de erro. |
| RF-08 | Rejeitar requisições inválidas | A API retorna erro estruturado para identificador de usuário ausente/inválido, arquivo ausente, tipo não permitido, arquivo acima do limite ou falha interna. Nenhum registro de metadados fica criado em caso de falha no upload. |
| RF-09 | Apresentar as operações na interface | A interface permite selecionar e enviar um arquivo, exibir o resultado da operação, atualizar a lista do usuário atual e iniciar o download de um item listado. Erros da API são apresentados sem interromper a aplicação. |

### Formatos permitidos no MVP

A extensão e o tipo de mídia declarado devem corresponder a um dos pares abaixo. O backend deve validar a política no servidor; a validação do frontend é apenas auxiliar.

| Extensão | Tipo de mídia (`Content-Type`) |
| --- | --- |
| `.pdf` | `application/pdf` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.png` | `image/png` |
| `.txt` | `text/plain` |
| `.csv` | `text/csv` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `.pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |

Extensões e tipos de mídia não listados, pares incompatíveis e arquivos vazios devem ser rejeitados. A lista não implica análise antivírus nem garantia de que o conteúdo corresponda ao tipo declarado.

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local da aplicação por meio de Multer `diskStorage`, no diretório `backend/storage` por padrão. Não usar provedores externos ou serviços de armazenamento de terceiros. |
| RNF-02 | Os metadados permanecem em memória no processo do backend. Reiniciar o processo apaga os registros; arquivos existentes no disco podem ficar órfãos e não são recuperados automaticamente. |
| RNF-03 | Configurações dependentes do ambiente, como `PORT`, são lidas de variáveis de ambiente. O diretório de armazenamento de produção é fixo em `backend/storage`. |
| RNF-04 | O limite máximo do upload é 10 MiB por arquivo. O servidor aplica o limite, independentemente das restrições de interface ou do cabeçalho enviado pelo cliente. |
| RNF-05 | O sistema não confia em nomes de arquivo fornecidos pelo usuário como caminho de armazenamento. O identificador físico é gerado pelo sistema, e o caminho resolvido deve permanecer dentro de `backend/storage`. |
| RNF-06 | A API usa respostas JSON para metadados e erros, e transferência binária para download. Falhas não devem expor caminhos locais, stack traces ou detalhes internos. |
| RNF-07 | As camadas do backend mantêm dependências na direção `routes -> controllers -> services -> repositories`; regras de negócio não dependem de Express ou Multer. |
| RNF-08 | A interface consome a API usando `fetch` sob o prefixo `/api`, conforme a configuração de proxy do Vite. |
| RNF-09 | As operações são testáveis sem serviços externos. A fase de implementação deve cobrir regras de propriedade, validações de upload, respostas HTTP e erros de filesystem com testes do runner nativo do Node. |

## 5. Modelo de dados (metadados do documento)

O repositório de metadados é em memória. Os campos abaixo descrevem o registro mantido pelo backend; `storageKey` é interno e nunca é devolvido pela API.

| Campo | Tipo | Exposição | Descrição |
| --- | --- | --- | --- |
| `id` | string (UUID) | Público | Identificador único gerado pelo sistema. |
| `originalName` | string | Público | Nome original sanitizado para apresentação e download; nunca usado como caminho físico. |
| `size` | number (bytes) | Público | Tamanho do arquivo em bytes. Deve ser maior que zero e no máximo 10.485.760. |
| `mimeType` | string | Público | Tipo de mídia permitido e associado ao arquivo enviado. |
| `uploadedAt` | string (ISO 8601 UTC) | Público | Data e hora em que o upload foi concluído e os metadados foram criados. |
| `owner` | string | Público | Identificador lógico recebido no cabeçalho `X-User-Id`. |
| `storageKey` | string | Interno | Nome gerado pelo sistema para localizar o arquivo dentro de `STORAGE_DIR`; não contém caminho fornecido pelo cliente. |

### Regras de consistência

- Cada `id` identifica no máximo um registro durante a vida do processo.
- `owner` deve corresponder exatamente ao valor normalizado de `X-User-Id` usado na requisição.
- `storageKey` não pode ser derivado diretamente de `originalName` ou de qualquer entrada de caminho enviada pelo cliente.
- Se o arquivo não puder ser persistido, não deve existir registro. Se a criação do registro falhar depois de persistir o arquivo, o arquivo deve ser removido quando possível.
- A remoção manual ou perda de um arquivo local não apaga automaticamente os metadados; o download desse registro responde `404`.

## 6. Contratos de API

### Convenções gerais

- Prefixo público: `/api`. No desenvolvimento, o proxy do Vite remove esse prefixo ao encaminhar a chamada ao backend, cujas rotas são registradas sem `/api`.
- As operações que dependem do usuário exigem `X-User-Id` com valor não vazio de até 128 caracteres e sem caracteres de controle.
- Os identificadores de documento são UUIDs gerados pelo servidor.
- JSON usa `Content-Type: application/json; charset=utf-8`.
- Formato comum de erro:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo 'file'."
  }
}
```

`code` é estável para uso pelo cliente; `message` é uma mensagem segura para exibição. Erros não incluem stack trace nem caminhos locais.

### POST /api/upload

Envia um arquivo para o usuário lógico indicado.

**Cabeçalhos**

- `X-User-Id: <identificador-do-usuario>` (obrigatório)
- `Content-Type: multipart/form-data; boundary=...`

**Corpo**

Uma parte de arquivo chamada `file`. Apenas um arquivo é permitido por requisição.

**Sucesso: `201 Created`**

```json
{
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "mimeType": "application/pdf",
    "uploadedAt": "2026-11-23T12:00:00.000Z",
    "owner": "usuario-123"
  }
}
```

**Erros**

| Status | Código | Condição |
| --- | --- | --- |
| `400` | `USER_ID_REQUIRED` | `X-User-Id` ausente, vazio ou inválido. |
| `400` | `FILE_REQUIRED` | Campo `file` ausente ou arquivo vazio. |
| `413` | `FILE_TOO_LARGE` | Arquivo acima de 10 MiB. |
| `415` | `FILE_TYPE_NOT_ALLOWED` | Extensão ou tipo de mídia não permitido/incompatível. |
| `500` | `UPLOAD_FAILED` | Falha inesperada ao gravar arquivo ou criar metadados. |

### GET /api/documents

Lista os documentos do usuário informado. Não aceita filtros ou paginação no MVP.

**Cabeçalhos**

- `X-User-Id: <identificador-do-usuario>` (obrigatório)

**Sucesso: `200 OK`**

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-11-23T12:00:00.000Z",
      "owner": "usuario-123"
    }
  ]
}
```

A lista vazia é representada como `{"documents": []}`. Os itens são ordenados por `uploadedAt` decrescente.

**Erros**

| Status | Código | Condição |
| --- | --- | --- |
| `400` | `USER_ID_REQUIRED` | `X-User-Id` ausente, vazio ou inválido. |
| `500` | `DOCUMENT_LIST_FAILED` | Falha inesperada ao consultar os metadados em memória. |

### GET /api/documents/:id/download

Transfere o arquivo associado ao identificador, somente quando pertence ao usuário indicado.

**Cabeçalhos**

- `X-User-Id: <identificador-do-usuario>` (obrigatório)

**Sucesso: `200 OK`**

- Corpo: bytes originais do arquivo.
- `Content-Type`: valor de `mimeType` registrado.
- `Content-Disposition: attachment` com `originalName` codificado de forma segura.
- `Content-Length`: tamanho registrado quando disponível.

**Erros**

| Status | Código | Condição |
| --- | --- | --- |
| `400` | `USER_ID_REQUIRED` | `X-User-Id` ausente, vazio ou inválido. |
| `404` | `DOCUMENT_NOT_FOUND` | ID inválido/inexistente, documento pertencente a outro usuário ou arquivo local ausente. As situações compartilham a mesma resposta para não revelar existência a terceiros. |
| `500` | `DOWNLOAD_FAILED` | Falha inesperada ao ler ou transmitir o arquivo. |

### Endpoint operacional existente

`GET /health` é um endpoint operacional existente no backend e não faz parte dos contratos funcionais de documentos. Esta especificação não altera seu contrato.

## 7. Decisões arquiteturais

- Backend em Node.js e Express, com JavaScript CommonJS.
- Frontend em React e Vite, com componentes funcionais e Hooks; chamadas ao backend via `fetch` e prefixo `/api`.
- Dependências do backend seguem `routes -> controllers -> services -> repositories`.
- Rotas registram os endpoints e conectam middleware de upload aos controllers. Controllers tratam HTTP, validação de entrada e serialização de resposta. Services concentram regras de propriedade, ordenação e fluxo de upload/download. Repositories encapsulam o acesso aos metadados e aos arquivos locais.
- Multer `diskStorage` grava os arquivos em filesystem local em `backend/storage`. O nome físico é gerado pelo sistema. O middleware de upload aplica limite de tamanho e allowlist antes de aceitar o arquivo.
- Metadados ficam em repositório em memória. O filesystem local não é um provedor externo; não são usados banco de dados ou armazenamento em nuvem.
- A resposta pública nunca inclui `storageKey` nem o caminho físico.
- O cabeçalho `X-User-Id` é um identificador fornecido pelo cliente, não autenticação. O MVP não deve ser implantado como sistema com dados que exijam isolamento de segurança entre usuários sem adicionar autenticação/autorização numa etapa futura.
- O desenvolvimento backend usa o runner nativo `node:test`. Testes de integração devem verificar respostas e isolamento por usuário sem depender de serviços externos.

## 8. Plano de execução

As etapas abaixo descrevem uma sequência futura de entrega por capacidade. Nesta atividade, somente esta especificação é produzida; nenhum arquivo de implementação do backend ou frontend é executado ou modificado.

1. **Preparar a base do MVP:** confirmar contratos, configuração por ambiente, limites e critérios de aceite; manter o endpoint operacional existente.
2. **Entregar o fluxo de upload local:** aceitar um arquivo por requisição, validar proprietário/tipo/tamanho, salvar via Multer `diskStorage` com nome gerado e criar metadados em memória; limpar o arquivo se a gravação do registro falhar.
3. **Entregar listagem e download por proprietário:** retornar metadados ordenados e permitir transferência binária apenas para o dono, com resposta uniforme para documento ausente, não pertencente ou sem arquivo local.
4. **Entregar as operações na interface:** permitir envio, feedback de sucesso/erro, atualização da lista e download dos itens associados ao identificador lógico atual.
5. **Validar o MVP integrado:** cobrir regras e contratos com testes automatizados, verificar limite/tipos de arquivo, isolamento funcional por dono, falhas de filesystem e comportamento após reinício; documentar as limitações aceitas antes da entrega.

### Critério de conclusão do MVP

O MVP está apto para entrega quando upload, listagem e download funcionam de ponta a ponta conforme os contratos; usuários lógicos veem apenas seus próprios documentos; erros de validação e falhas locais retornam os códigos especificados; e os testes confirmam a volatilidade dos metadados e o uso exclusivo do filesystem local.
