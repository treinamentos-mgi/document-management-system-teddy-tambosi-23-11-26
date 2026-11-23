import { useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ userId, onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    setIsUploading(true);
    setFeedback({ type: '', message: '' });

    try {
      const document = await uploadDocument(userId, selectedFile);
      setFeedback({ type: 'success', message: `"${document.originalName}" enviado com sucesso.` });
      setSelectedFile(null);
      event.currentTarget.reset();
      onUploaded?.(document);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="file"
        name="file"
        aria-label="Arquivo para envio"
        onChange={(event) => setSelectedFile(event.target.files[0] ?? null)}
      />
      <button type="submit" disabled={!userId || !selectedFile || isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
      {feedback.message && (
        <p role={feedback.type === 'error' ? 'alert' : 'status'} style={{ width: '100%', margin: 0 }}>
          {feedback.message}
        </p>
      )}
    </form>
  );
}
