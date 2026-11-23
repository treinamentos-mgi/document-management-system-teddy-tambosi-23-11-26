import { useCallback, useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';

export default function App() {
  const [userId, setUserId] = useState('usuario-1');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);

  const normalizedUserId = userId.trim();

  useEffect(() => {
    if (!normalizedUserId) {
      setDocuments([]);
      setListError('');
      setIsLoading(false);
      return undefined;
    }

    let ignore = false;
    setIsLoading(true);
    setListError('');

    listDocuments(normalizedUserId)
      .then((items) => {
        if (!ignore) setDocuments(items);
      })
      .catch((error) => {
        if (!ignore) {
          setDocuments([]);
          setListError(error.message);
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [normalizedUserId, refreshCount]);

  const refreshDocuments = useCallback(() => setRefreshCount((count) => count + 1), []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <h1>Document Management System</h1>

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        Usuário (X-User-Id):
        <input value={userId} maxLength={128} onChange={(event) => setUserId(event.target.value)} />
      </label>

      <section>
        <h2>Enviar documento</h2>
        <UploadComponent userId={normalizedUserId} onUploaded={refreshDocuments} />
      </section>

      <section>
        <h2>Meus documentos</h2>
        <DocumentList
          userId={normalizedUserId}
          documents={documents}
          isLoading={isLoading}
          error={listError}
        />
      </section>
    </main>
  );
}
