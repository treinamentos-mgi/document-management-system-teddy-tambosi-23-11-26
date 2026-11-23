import DownloadButton from './DownloadButton.jsx';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('pt-BR');
}

export default function DocumentList({ userId, documents, isLoading, error }) {
  if (isLoading) {
    return <p>Carregando documentos...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (documents.length === 0) {
    return <p>Nenhum documento enviado.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {documents.map((document) => (
        <li
          key={document.id}
          style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #ddd' }}
        >
          <strong style={{ flex: 1 }}>{document.originalName}</strong>
          <span>{formatFileSize(document.size)}</span>
          <span>{formatDate(document.uploadedAt)}</span>
          <DownloadButton userId={userId} document={document} />
        </li>
      ))}
    </ul>
  );
}
