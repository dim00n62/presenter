// frontend/src/components/DocumentList.tsx
import { useEffect, useState } from 'react';
import { Card, Chip, Spinner } from '@heroui/react';
import { api } from '../lib/api';

interface Document {
    id: string;
    filename: string;
    originalName: string;
    status: 'uploaded' | 'parsing' | 'parsed' | 'failed';
    uploadedAt: string;
    size: number;
    stats?: {
        chunkCount: number;
    };
}

interface Props {
    projectId: string;
    refreshTrigger?: number;
}

export function DocumentList({ projectId, refreshTrigger }: Props) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDocuments();
    }, [projectId, refreshTrigger]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const data = await api.getProject(projectId);
            setDocuments(data.documents || []);
        } catch (error) {
            console.error('Failed to load documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'parsed': return 'success';
            case 'parsing': return 'warning';
            case 'failed': return 'danger';
            default: return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'parsed': return '✅ Ready';
            case 'parsing': return '⏳ Processing...';
            case 'failed': return '❌ Failed';
            default: return '📤 Uploaded';
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (loading) {
        return (
            <Card className="p-6 flex items-center justify-center">
                <Spinner />
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">
                Documents ({documents.length})
            </h3>

            {documents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                    No documents uploaded yet
                </p>
            ) : (
                <div className="space-y-3">
                    {documents.map(doc => (
                        <div
                            key={doc.id}
                            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <p className="font-medium truncate">{doc.originalName}</p>
                                    <p className="text-xs text-gray-500">
                                        {formatSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleString()}
                                    </p>
                                </div>
                                <Chip
                                    color={getStatusColor(doc.status)}
                                    size="sm"
                                    variant="flat"
                                >
                                    {getStatusText(doc.status)}
                                </Chip>
                            </div>

                            {doc.stats && (
                                <div className="text-xs text-gray-600">
                                    📊 {doc.stats.chunkCount} chunks created
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}