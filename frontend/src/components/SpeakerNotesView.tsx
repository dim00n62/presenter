// frontend/src/components/SpeakerNotesView.tsx

import { useState, useEffect } from 'react';
import { Card, Button, Progress, Chip, Textarea, Tabs, Tab } from '@heroui/react';
import { api } from '../lib/api';
import { toast } from 'sonner';

export function SpeakerNotesView({ projectId }: { projectId: string }) {
    const [notes, setNotes] = useState<any[]>([]);
    const [generating, setGenerating] = useState(false);
    const [selectedSlide, setSelectedSlide] = useState(0);

    useEffect(() => {
        loadNotes();
    }, [projectId]);

    const loadNotes = async () => {
        try {
            const result = await api.getSpeakerNotes(projectId);
            if (result.speakerNotes) {
                setNotes(result.speakerNotes);
            }
        } catch (err) {
            console.log('Speaker notes не найдены');
        }
    };

    const generateNotes = async () => {
        setGenerating(true);
        try {
            const result = await api.generateSpeakerNotes(projectId);
            setNotes(result.speakerNotes);
            toast.success(`✅ Готово! Создан текст для ${result.speakerNotes.length} слайдов`);
        } catch (error: any) {
            toast.error('Ошибка: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('✅ Скопировано в буфер обмена');
    };

    const copyAllNotes = () => {
        const allText = notes.map((note, idx) => {
            return `
═══════════════════════════════════════
СЛАЙД ${idx + 1}
═══════════════════════════════════════

${note.speakerNotes?.intro || ''}

${note.speakerNotes?.body || ''}

${note.speakerNotes?.transition || ''}

⏱️ Время: ~${note.speakerNotes?.timing?.estimated || 60} секунд
`;
        }).join('\n\n');

        copyToClipboard(allText);
    };

    const exportAsDocx = async () => {
        try {
            await api.exportSpeakerNotesDocx(projectId);
        } catch (error: any) {
            toast.error('Ошибка экспорта: ' + error.message);
        }
    };

    // Utility function to safely render key points
    const renderKeyPoint = (point: any): string => {
        if (typeof point === 'string') {
            return point;
        }
        if (point && typeof point === 'object' && point.main) {
            return point.main;
        }
        return String(point);
    };

    // Utility function to check if note is valid
    const isValidNote = (note: any): boolean => {
        return note && note.speakerNotes && (
            note.speakerNotes.intro ||
            note.speakerNotes.body ||
            note.speakerNotes.transition
        );
    };

    if (generating) {
        return (
            <Card className="p-6">
                <div className="text-center py-16">
                    <Progress isIndeterminate color="primary" className="mb-4" />
                    <p className="text-lg font-semibold mb-2">
                        🤖 AI пишет текст выступления...
                    </p>
                    <p className="text-sm text-gray-600">
                        Это займет 1-2 минуты в зависимости от количества слайдов
                    </p>
                </div>
            </Card>
        );
    }

    if (notes.length === 0) {
        return (
            <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">🎤 Текст для выступления</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            AI создаст профессиональный текст для каждого слайда презентации
                        </p>
                    </div>
                    <Button
                        color="default"
                        size="lg"
                        onClick={generateNotes}
                    >
                        ✨ Создать текст
                    </Button>
                </div>

                <div className="text-center py-16 bg-gradient-to-br from-green-50 to-teal-50 rounded-lg border-2 border-dashed border-green-200">
                    <div className="text-6xl mb-4">🎤</div>
                    <h3 className="text-xl font-semibold mb-3">Готово к генерации!</h3>
                    <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                        AI создаст естественный, профессиональный текст выступления для каждого слайда.
                        Текст будет встроен прямо в PPTX файл и доступен для копирования.
                    </p>

                    <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mt-8">
                        <div className="p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-3xl mb-2">📝</div>
                            <h4 className="font-semibold mb-1">Естественная речь</h4>
                            <p className="text-sm text-gray-600">
                                Разговорный стиль, легко произносить
                            </p>
                        </div>

                        <div className="p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-3xl mb-2">⏱️</div>
                            <h4 className="font-semibold mb-1">Точный тайминг</h4>
                            <p className="text-sm text-gray-600">
                                Оптимальное время на каждый слайд
                            </p>
                        </div>

                        <div className="p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-3xl mb-2">🎯</div>
                            <h4 className="font-semibold mb-1">Ключевые акценты</h4>
                            <p className="text-sm text-gray-600">
                                Подсказки что выделить голосом
                            </p>
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    const currentNote = notes[selectedSlide];

    // Проверяем валидность выбранного note
    if (!isValidNote(currentNote)) {
        return (
            <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">🎤 Текст для выступления</h2>
                    <Button
                        color="default"
                        variant="light"
                        onClick={generateNotes}
                    >
                        🔄 Пересоздать
                    </Button>
                </div>

                <div className="text-center py-16">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold mb-3">Текст не создан для этого слайда</h3>
                    <p className="text-gray-600 mb-6">
                        Произошла ошибка при генерации текста для слайда {selectedSlide + 1}
                    </p>
                    <Button
                        color="default"
                        onClick={generateNotes}
                    >
                        Пересоздать все тексты
                    </Button>
                </div>
            </Card>
        );
    }

    const fullText = `${currentNote.speakerNotes.intro || ''}\n\n${currentNote.speakerNotes.body || ''}\n\n${currentNote.speakerNotes.transition || ''}`;

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">🎤 Текст для выступления</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {notes.filter(isValidNote).length} слайдов •
                        Общее время: {Math.round(notes.reduce((sum, n) => sum + (n.speakerNotes?.timing?.estimated || 60), 0) / 60)} мин
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        color="success"
                        variant="bordered"
                        onClick={copyAllNotes}
                    >
                        📋 Скопировать все
                    </Button>

                    <Button
                        color="default"
                        onClick={exportAsDocx}
                    >
                        📄 Экспорт в Word
                    </Button>

                    <Button
                        color="default"
                        variant="light"
                        onClick={generateNotes}
                    >
                        🔄 Пересоздать
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Список слайдов */}
                <div className="col-span-3 space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {notes.map((note, idx) => {
                        const valid = isValidNote(note);

                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedSlide(idx)}
                                className={`w-full text-left p-3 rounded-lg transition border-2 ${selectedSlide === idx
                                    ? 'bg-green-50 border-green-500 shadow-sm'
                                    : valid
                                        ? 'bg-white border-gray-200 hover:border-green-300'
                                        : 'bg-red-50 border-red-200 hover:border-red-300'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <span className="text-xs font-semibold text-gray-500">
                                        Слайд {idx + 1}
                                    </span>
                                    {valid ? (
                                        <Chip size="sm" variant="flat" color={
                                            (note.metadata?.confidence || 0) > 80 ? 'success' :
                                                (note.metadata?.confidence || 0) > 60 ? 'warning' : 'default'
                                        }>
                                            {note.metadata?.confidence || 0}%
                                        </Chip>
                                    ) : (
                                        <Chip size="sm" color="danger" variant="flat">
                                            Ошибка
                                        </Chip>
                                    )}
                                </div>

                                {valid ? (
                                    <>
                                        <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">
                                            {note.speakerNotes?.intro || 'Нет текста'}
                                        </p>

                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>⏱️ {note.speakerNotes?.timing?.estimated || 60}с</span>
                                            <span>•</span>
                                            <span>📝 {note.metadata?.wordCount || 0} слов</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-red-600">
                                        Текст не создан
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Детали выбранного слайда */}
                <div className="col-span-9">
                    <Tabs size="lg" className="mb-4">
                        <Tab key="view" title="👁️ Просмотр">
                            <Card className="p-6 bg-gray-50">
                                {/* Intro */}
                                {currentNote.speakerNotes?.intro && (
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-green-700 uppercase">
                                                Вступление
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="light"
                                                onClick={() => copyToClipboard(currentNote.speakerNotes.intro)}
                                            >
                                                📋
                                            </Button>
                                        </div>
                                        <p className="text-lg text-green-800 font-medium italic leading-relaxed">
                                            "{currentNote.speakerNotes.intro}"
                                        </p>
                                    </div>
                                )}

                                {/* Body */}
                                {currentNote.speakerNotes?.body && (
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-gray-700 uppercase">
                                                Основной текст
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="light"
                                                onClick={() => copyToClipboard(currentNote.speakerNotes.body)}
                                            >
                                                📋
                                            </Button>
                                        </div>
                                        <div className="prose prose-lg max-w-none">
                                            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                                {currentNote.speakerNotes.body}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Transition */}
                                {currentNote.speakerNotes?.transition && (
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-gray-700 uppercase">
                                                Переход
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="light"
                                                onClick={() => copyToClipboard(currentNote.speakerNotes.transition)}
                                            >
                                                📋
                                            </Button>
                                        </div>
                                        <p className="text-gray-700 italic">
                                            "{currentNote.speakerNotes.transition}"
                                        </p>
                                    </div>
                                )}

                                {/* Key Points */}
                                {currentNote.speakerNotes?.keyPoints && Array.isArray(currentNote.speakerNotes.keyPoints) && currentNote.speakerNotes.keyPoints.length > 0 && (
                                    <div className="mb-6">
                                        <p className="text-xs font-semibold text-gray-700 uppercase mb-2">
                                            Ключевые пункты
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {currentNote.speakerNotes.keyPoints.map((point: any, i: number) => (
                                                <Chip key={i} color="primary" variant="flat">
                                                    {renderKeyPoint(point)}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Emphasis */}
                                {currentNote.speakerNotes?.emphasis && Array.isArray(currentNote.speakerNotes.emphasis) && currentNote.speakerNotes.emphasis.length > 0 && (
                                    <div className="mb-6">
                                        <p className="text-xs font-semibold text-gray-700 uppercase mb-2">
                                            Акценты при выступлении
                                        </p>
                                        <div className="space-y-2">
                                            {currentNote.speakerNotes.emphasis.map((emp: any, i: number) => (
                                                <div key={i} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                                    <span className="font-bold text-orange-700">"{emp.text}"</span>
                                                    <span className="text-gray-600 text-sm"> — {emp.reason}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-green-600">
                                            {currentNote.speakerNotes?.timing?.estimated || 60}с
                                        </p>
                                        <p className="text-xs text-gray-600">Время</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-blue-600">
                                            {currentNote.metadata?.wordCount || 0}
                                        </p>
                                        <p className="text-xs text-gray-600">Слов</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-purple-600 capitalize">
                                            {currentNote.speakerNotes?.tone || 'neutral'}
                                        </p>
                                        <p className="text-xs text-gray-600">Тон</p>
                                    </div>
                                </div>
                            </Card>
                        </Tab>

                        <Tab key="edit" title="✏️ Редактировать">
                            <Card className="p-6">
                                <Textarea
                                    label="Полный текст для копирования"
                                    value={fullText}
                                    minRows={15}
                                    maxRows={25}
                                    className="font-mono text-sm"
                                    readOnly
                                />

                                <div className="flex gap-2 mt-4">
                                    <Button
                                        color="default"
                                        onClick={() => copyToClipboard(fullText)}
                                    >
                                        📋 Скопировать текст
                                    </Button>
                                </div>
                            </Card>
                        </Tab>
                    </Tabs>
                </div>
            </div>
        </Card>
    );
}