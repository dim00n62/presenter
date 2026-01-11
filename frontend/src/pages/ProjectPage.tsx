// frontend/src/pages/ProjectPage.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Tabs, Tab, Card, Chip } from '@heroui/react';
import { DocumentUpload } from '../components/DocumentUpload';
import { AutoAnalysisProgress } from '../components/AutoAnalysisProgress';
import { BlueprintEditor } from '../components/BlueprintEditor';
import { GenerationView } from '../components/GenerationView';
import { SpeakerNotesView } from '../components/SpeakerNotesView';
import { api } from '../lib/api';

export function ProjectPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const [project, setProject] = useState<any>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [blueprint, setBlueprint] = useState<any>(null);
    const [showProgress, setShowProgress] = useState(false);
    const [activeTab, setActiveTab] = useState('documents');

    useEffect(() => {
        if (projectId) {
            loadProject();
            loadDocuments();
            checkForBlueprint();
        }
    }, [projectId]);

    const loadProject = async () => {
        try {
            const p = await api.getProject(projectId!);
            setProject(p);
        } catch (error: any) {
            console.error('Failed to load project:', error);
            navigate('/');
        }
    };

    const loadDocuments = async () => {
        try {
            const docs = await api.getDocuments(projectId!);
            setDocuments(docs);

            // Check if any document is parsing
            const isParsing = docs.some((d: any) => d.status === 'parsing');
            if (isParsing) {
                setShowProgress(true);
                setActiveTab('progress');
            }
        } catch (error: any) {
            console.error('Failed to load documents:', error);
        }
    };

    const checkForBlueprint = async () => {
        try {
            const bp = await api.getLatestBlueprint(projectId!);
            if (bp) {
                setBlueprint(bp.blueprint);
            }
        } catch (err) {
            // No blueprint yet
        }
    };

    const handleDocumentUploaded = () => {
        loadDocuments();
        setShowProgress(true);
        setActiveTab('progress');
    };

    const handleQuickStart = async () => {
        try {
            const result = await api.quickStart(projectId!);
            setBlueprint(result.blueprint);
            setActiveTab('blueprint');
            alert(result.message);
        } catch (error: any) {
            alert(`Ошибка: ${error.message}`);
        }
    };

    const handleAnalysisComplete = (result: any) => {
        setShowProgress(false);
        if (result.blueprintId) {
            checkForBlueprint();
            setActiveTab('blueprint');
        }
    };

    const handleBlueprintApproved = () => {
        checkForBlueprint();
        setActiveTab('generation');
    };

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <p className="text-gray-600">Загрузка проекта...</p>
                </div>
            </div>
        );
    }

    const isApproved = blueprint?.status === 'approved';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="container mx-auto p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                isIconOnly
                                variant="light"
                                onPress={() => navigate('/')}
                            >
                                ←
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">
                                    {project.name}
                                </h1>

                                {/* ПОКАЗЫВАЕМ ЦЕЛЬ ПРЕЗЕНТАЦИИ */}
                                {project.presentationGoal && (
                                    <div className="mt-2 p-3 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg">
                                        <p className="text-sm font-semibold text-green-800 mb-1">
                                            🎯 Цель презентации:
                                        </p>
                                        <p className="text-sm text-gray-700">
                                            {project.presentationGoal}
                                        </p>
                                        {project.targetAudience && (
                                            <p className="text-xs text-gray-600 mt-1">
                                                👥 Аудитория: {project.targetAudience}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status badges */}
                        <div className="flex gap-2">
                            {documents.length > 0 && (
                                <Chip color="success" variant="flat">
                                    📄 документов: {documents.length}
                                </Chip>
                            )}
                            {blueprint && (
                                <Chip
                                    color={isApproved ? 'success' : 'warning'}
                                    variant="flat"
                                >
                                    📋 {isApproved ? 'Утверждено' : 'Черновик'}
                                </Chip>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto p-6">
                <Tabs
                    selectedKey={activeTab}
                    onSelectionChange={(key) => setActiveTab(key as string)}
                    size="lg"
                    color="default"
                    className="mb-6"
                >
                    {/* Tab 1: Documents */}
                    <Tab key="documents" title="📄 Документы">
                        <Card className="p-6">
                            <DocumentUpload
                                projectId={projectId!}
                                onDocumentUploaded={handleDocumentUploaded}
                            />

                            {/* Documents List */}
                            {documents.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-semibold mb-3">Загруженные документы:</h3>
                                    <div className="space-y-2">
                                        {documents.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">
                                                        {doc.mimeType.includes('pdf') ? '📄' :
                                                            doc.mimeType.includes('excel') ? '📊' :
                                                                doc.mimeType.includes('word') ? '📝' : '📎'}
                                                    </span>
                                                    <div>
                                                        <p className="font-medium">{doc.filename}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {(doc.size / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                </div>

                                                <Chip
                                                    color={
                                                        doc.status === 'parsed' ? 'success' :
                                                            doc.status === 'failed' ? 'danger' :
                                                                'primary'
                                                    }
                                                    variant="flat"
                                                    size="sm"
                                                >
                                                    {doc.status === 'parsed' ? '✅ Готово' :
                                                        doc.status === 'failed' ? '❌ Ошибка' :
                                                            doc.status === 'parsing' ? '⏳ Обработка' :
                                                                '📤 Загружен'}
                                                </Chip>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quick Start Button */}
                            {documents.length > 0 && !blueprint && !showProgress && (
                                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border-2 border-blue-200">
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        🚀 Быстрый старт
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Создать базовую структуру из 4 слайдов и сразу начать редактирование
                                    </p>
                                    <Button
                                        color="default"
                                        onPress={handleQuickStart}
                                        className="shadow-md"
                                    >
                                        Начать быстро
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </Tab>

                    {/* Tab 2: Auto-Analysis Progress */}
                    <Tab
                        key="progress"
                        title="⏳ Анализ"
                        isDisabled={!showProgress}
                    >
                        {showProgress && projectId && (
                            <AutoAnalysisProgress
                                projectId={projectId}
                                onComplete={handleAnalysisComplete}
                            />
                        )}
                    </Tab>

                    {/* Tab 3: Blueprint Editor */}
                    <Tab
                        key="blueprint"
                        title="📋 Структура"
                        isDisabled={!blueprint}
                    >
                        {blueprint && projectId && (
                            <BlueprintEditor
                                projectId={projectId}
                                blueprint={blueprint}
                                onApproved={handleBlueprintApproved}
                            />
                        )}
                    </Tab>

                    {/* Tab 4: Content Generation */}
                    <Tab
                        key="generation"
                        title="🎨 Контент"
                        isDisabled={!isApproved}
                    >
                        {isApproved && projectId && (
                            <GenerationView projectId={projectId} />
                        )}
                    </Tab>

                    {/* Tab 5: Speaker Notes */}
                    <Tab
                        key="speaker-notes"
                        title="🎤 Текст выступления"
                        isDisabled={!isApproved}
                    >
                        {isApproved && projectId && (
                            <SpeakerNotesView projectId={projectId} />
                        )}
                    </Tab>
                </Tabs>
            </div>
        </div>
    );
}