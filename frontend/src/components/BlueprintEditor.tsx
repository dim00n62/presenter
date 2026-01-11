// frontend/src/components/BlueprintEditor.tsx

import { useState, useEffect } from 'react';
import { Card, Button, Input } from '@heroui/react';
import { api } from '../lib/api';

interface BlueprintEditorProps {
    projectId: string;
    blueprint: any;
    onApproved?: () => void;
}

export function BlueprintEditor({ projectId, blueprint: initialBlueprint, onApproved }: BlueprintEditorProps) {
    const [blueprint, setBlueprint] = useState(initialBlueprint);
    const [slides, setSlides] = useState(initialBlueprint?.slides || []);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialBlueprint) {
            setBlueprint(initialBlueprint);
            setSlides(initialBlueprint.slides || []);
        }
    }, [initialBlueprint]);

    const handleAddSlide = () => {
        const newSlide = {
            id: crypto.randomUUID(),
            type: 'content',
            title: 'Новый слайд',
            order: slides.length,
            section: 'body',
            layoutType: 'text',
            contentPriority: 'medium',
            designNotes: '',
            estimatedComplexity: 'medium'
        };

        setSlides([...slides, newSlide]);
    };

    const handleUpdateSlide = (index: number, field: string, value: any) => {
        const updated = [...slides];
        updated[index] = { ...updated[index], [field]: value };
        setSlides(updated);
    };

    const handleDeleteSlide = (index: number) => {
        const updated = slides.filter((_, i) => i !== index);
        // Reorder
        updated.forEach((slide, i) => {
            slide.order = i;
        });
        setSlides(updated);
    };

    const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === slides.length - 1)
        ) {
            return;
        }

        const updated = [...slides];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

        // Update order
        updated.forEach((slide, i) => {
            slide.order = i;
        });

        setSlides(updated);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.updateBlueprint(blueprint.id, slides);
            alert('✅ Изменения сохранены');
        } catch (error: any) {
            alert(`Ошибка: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async () => {
        try {
            // Save first
            await api.updateBlueprint(blueprint.id, slides);

            // Then approve
            await api.approveBlueprint(blueprint.id);

            alert('✅ Структура утверждена! Можно переходить к генерации контента.');

            if (onApproved) {
                onApproved();
            }
        } catch (error: any) {
            alert(`Ошибка: ${error.message}`);
        }
    };

    const isApproved = blueprint?.status === 'approved';

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-semibold">
                        Структура презентации ({slides.length} слайдов)
                    </h3>
                    <p className="text-sm text-gray-600">
                        {isApproved ? '✅ Утверждено' : '📝 Черновик - редактируйте и утвердите'}
                    </p>
                </div>

                <div className="flex gap-2">
                    {!isApproved && (
                        <>
                            <Button
                                color="default"
                                onClick={handleAddSlide}
                            >
                                ➕ Добавить слайд
                            </Button>
                            <Button
                                color="default"
                                onClick={handleSave}
                                isLoading={saving}
                            >
                                💾 Сохранить
                            </Button>
                            <Button
                                color="success"
                                onClick={handleApprove}
                            >
                                ✅ Утвердить
                            </Button>
                        </>
                    )}
                    {isApproved && (
                        <span className="text-green-600 font-semibold">
                            Структура утверждена
                        </span>
                    )}
                </div>
            </div>

            {/* Slides List */}
            <div className="space-y-2">
                {slides.map((slide, index) => (
                    <Card key={slide.id} className="p-4">
                        <div className="flex items-center gap-4">
                            {/* Order */}
                            <div className="text-2xl font-bold text-gray-400 w-12">
                                {index + 1}
                            </div>

                            {/* Type Badge */}
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${slide.type === 'title' ? 'bg-blue-100 text-blue-700' :
                                slide.type === 'section' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                {slide.type}
                            </span>

                            {/* Title Input */}
                            <Input
                                value={slide.title}
                                onChange={(e) => handleUpdateSlide(index, 'title', e.target.value)}
                                className="flex-1"
                                disabled={isApproved}
                            />

                            {/* Actions */}
                            {!isApproved && (
                                <div className="flex gap-1">
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        onClick={() => handleMoveSlide(index, 'up')}
                                        isDisabled={index === 0}
                                    >
                                        ↑
                                    </Button>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        onClick={() => handleMoveSlide(index, 'down')}
                                        isDisabled={index === slides.length - 1}
                                    >
                                        ↓
                                    </Button>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        color="danger"
                                        variant="light"
                                        onClick={() => handleDeleteSlide(index)}
                                    >
                                        🗑️
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {slides.length === 0 && (
                <Card className="p-8 text-center">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-gray-600 mb-4">Нет слайдов</p>
                    <Button color="default" onClick={handleAddSlide}>
                        Добавить первый слайд
                    </Button>
                </Card>
            )}
        </div>
    );
}
