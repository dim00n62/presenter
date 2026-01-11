import { useState } from 'react';
import { Button, Textarea, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import { api } from '../lib/api';

export function ProjectSettings({ project, onUpdate }: { project: any; onUpdate: () => void }) {
    const { isOpen, onOpen, onClose } = useDisclosure();

    const [presentationGoal, setPresentationGoal] = useState(project.presentationGoal || '');
    const [targetAudience, setTargetAudience] = useState(project.targetAudience || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.updateProject(project.id, {
                presentationGoal,
                targetAudience,
                description: presentationGoal
            });
            onUpdate();
            onClose();
            alert('✅ Настройки сохранены');
        } catch (error: any) {
            alert(`Ошибка: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Button
                size="sm"
                variant="light"
                onPress={onOpen}
            >
                ⚙️ Редактировать цель
            </Button>

            <Modal isOpen={isOpen} onClose={onClose} size="lg">
                <ModalContent>
                    <ModalHeader>Настройки презентации</ModalHeader>
                    <ModalBody>
                        <Textarea
                            label="Цель презентации"
                            value={presentationGoal}
                            onChange={(e) => setPresentationGoal(e.target.value)}
                            minRows={3}
                        />
                        <Input
                            label="Целевая аудитория"
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={onClose}>
                            Отмена
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleSave}
                            isLoading={saving}
                        >
                            Сохранить
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
