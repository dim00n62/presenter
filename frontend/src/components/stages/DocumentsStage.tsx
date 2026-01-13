// frontend/src/components/stages/DocumentsStage.tsx

import { useState } from 'react';
import { StagePanel } from '../StagePanel';
import { DocumentUpload } from '../DocumentUpload';
import { Button, Card, Chip, Progress } from '@heroui/react';

interface DocumentsStageProps {
  projectId: string;
  documents: any[];
  onDocumentsReady: () => void;
  onNext: () => void;
}

export function DocumentsStage({
  projectId,
  documents,
  onDocumentsReady,
  onNext,
}: DocumentsStageProps) {
  const [uploading, setUploading] = useState(false);

  const allParsed = documents.length > 0 && documents.every(d => d.status === 'parsed');
  const anyFailed = documents.some(d => d.status === 'failed');
  const parsing = documents.some(d => d.status === 'parsing');

  const handleDocumentsReady = () => {
    if (allParsed) {
      onDocumentsReady();
    }
  };

  return (
    <StagePanel
      title="Загрузка документов"
      icon="📄"
      description="Загрузите файлы, которые нужно использовать для создания презентации"
      canGoNext={allParsed}
      onNext={onNext}
      nextLabel="Начать анализ"
      nextIcon="🔍"
      status={parsing ? 'loading' : allParsed ? 'success' : 'idle'}
      statusMessage={
        parsing ? 'Обработка документов...' :
        allParsed ? 'Все документы успешно обработаны!' :
        undefined
      }
    >
      <div className="space-y-6">
        {/* Upload Area */}
        <DocumentUpload
          projectId={projectId}
          onDocumentUploaded={() => {
            // Reload handled by parent
          }}
        />

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Загруженные документы ({documents.length})
              </h3>
              
              {allParsed && (
                <Chip color="success" variant="flat">
                  ✅ Все готово
                </Chip>
              )}
            </div>

            <div className="space-y-2">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {doc.mimeType.includes('pdf') ? '📄' :
                         doc.mimeType.includes('excel') ? '📊' :
                         doc.mimeType.includes('word') ? '📝' : '📎'}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800">{doc.filename}</p>
                        <p className="text-xs text-gray-500">
                          {(doc.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        
                        {/* Parsing progress */}
                        {doc.status === 'parsing' && (
                          <Progress
                            size="sm"
                            isIndeterminate
                            className="mt-2 max-w-md"
                            color="primary"
                          />
                        )}
                      </div>
                    </div>

                    <Chip
                      color={
                        doc.status === 'parsed' ? 'success' :
                        doc.status === 'failed' ? 'danger' :
                        doc.status === 'parsing' ? 'primary' :
                        'default'
                      }
                      variant="flat"
                    >
                      {doc.status === 'parsed' ? '✅ Готово' :
                       doc.status === 'failed' ? '❌ Ошибка' :
                       doc.status === 'parsing' ? '⏳ Обработка' :
                       '📤 Загружен'}
                    </Chip>
                  </div>

                  {/* Metadata for parsed docs */}
                  {doc.status === 'parsed' && doc.chunks && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span>📦 Чанков: {doc.chunks.length}</span>
                        {doc.metadata?.pageCount && (
                          <span>📄 Страниц: {doc.metadata.pageCount}</span>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Help text */}
        {documents.length === 0 && (
          <Card className="p-6 bg-blue-50 border-2 border-dashed border-blue-200">
            <div className="text-center">
              <div className="text-4xl mb-3">📁</div>
              <h3 className="font-semibold text-blue-900 mb-2">
                Начните с загрузки документов
              </h3>
              <p className="text-sm text-blue-700">
                Поддерживаются форматы: PDF, DOCX, XLSX
              </p>
            </div>
          </Card>
        )}

        {/* Ready indicator */}
        {allParsed && (
          <Card className="p-4 bg-green-50 border border-green-200">
            <div className="flex items-start gap-3">
              <div className="text-3xl">✅</div>
              <div>
                <p className="font-semibold text-green-800 mb-1">
                  Документы готовы к анализу
                </p>
                <p className="text-sm text-green-700">
                  Нажмите "Начать анализ" чтобы AI извлек ключевую информацию из документов
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </StagePanel>
  );
}
