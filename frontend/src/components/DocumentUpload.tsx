// frontend/src/components/DocumentUpload.tsx

import { useState } from 'react';
import { Button, Progress } from '@heroui/react';
import { api } from '../lib/api';
import { toast } from 'sonner';

interface DocumentUploadProps {
    projectId: string;
    onDocumentUploaded: () => void;
}

export function DocumentUpload({ projectId, onDocumentUploaded }: DocumentUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);

    const handleFileSelect = async (file: File) => {
        try {
            setUploading(true);
            setUploadProgress(0);

            // Check file type
            const allowedTypes = [
                'application/pdf',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            if (!allowedTypes.includes(file.type)) {
                toast.error('❌ Неподдерживаемый формат!\n\nРазрешены: Excel (.xlsx), PDF, Word (.docx)');
                return;
            }

            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            // Upload file
            const result = await api.uploadDocument(projectId, file);

            clearInterval(progressInterval);
            setUploadProgress(100);

            console.log('✅ File uploaded:', result);
            setTimeout(() => {
                onDocumentUploaded();
                setUploading(false);
                setUploadProgress(0);
            }, 500);

        } catch (error: any) {
            console.error('Upload error:', error);

            if (error.message.includes('No text content extracted')) {
                toast.warning(
                    '⚠️ Это отсканированный PDF или изображение.\n\n' +
                    '💡 Рекомендации:\n' +
                    '• Конвертируйте в DOCX формат\n' +
                    '• Используйте text-based PDF\n' +
                    '• Откройте PDF в Word и сохраните как DOCX'
                );
            } else {
                toast.error(`❌ Ошибка загрузки: ${error.message}`);
            }

            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
    };

    return (
        <div>
            {/* Upload Area */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
          border-2 border-dashed rounded-xl p-12 text-center transition-all
          ${dragActive ? 'border-primary bg-primary-50' : 'border-gray-300'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-gray-50'}
        `}
            >
                {uploading ? (
                    <div>
                        <div className="text-6xl mb-4">⏳</div>
                        <p className="text-lg font-semibold mb-2">Загрузка файла...</p>
                        <Progress
                            value={uploadProgress}
                            color="primary"
                            className="max-w-md mx-auto mb-2"
                        />
                        <p className="text-sm text-gray-600">{uploadProgress}%</p>
                    </div>
                ) : (
                    <div>
                        <div className="text-6xl mb-4">📤</div>
                        <h3 className="text-xl font-semibold mb-2">
                            Перетащите файл сюда
                        </h3>
                        <p className="text-gray-600 mb-4">
                            или
                        </p>
                        <Button
                            color="default"
                            size="lg"
                            onPress={() => document.getElementById('file-input')?.click()}
                        >
                            Выбрать файл
                        </Button>
                        <input
                            id="file-input"
                            type="file"
                            accept=".pdf,.xlsx,.xls,.docx"
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    handleFileSelect(e.target.files[0]);
                                }
                            }}
                            className="hidden"
                        />
                    </div>
                )}
            </div>

            {/* Supported Formats */}
            <div className="mt-4 text-center text-sm text-gray-600">
                <p className="font-semibold mb-1">Поддерживаемые форматы:</p>
                <div className="flex justify-center gap-4">
                    <span>📊 Excel (.xlsx, .xls)</span>
                    <span>📄 PDF (text-based)</span>
                    <span>📝 Word (.docx)</span>
                </div>
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>💡 Совет:</strong> Для лучших результатов используйте документы с четкой структурой
                    и текстовым содержимым. Сканированные PDF лучше конвертировать в DOCX.
                </p>
            </div>
        </div>
    );
}
