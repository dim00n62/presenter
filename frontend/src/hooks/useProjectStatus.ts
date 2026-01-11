// frontend/src/hooks/useProjectStatus.ts
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function useProjectStatus(projectId?: string) {
    const [status, setStatus] = useState({
        hasDocuments: false,
        hasAnalysis: false,
        hasBlueprint: false,
        blueprintApproved: false,
        hasGeneration: false,
        loading: true,
    });

    useEffect(() => {
        if (!projectId) return;

        checkStatus();
    }, [projectId]);

    const checkStatus = async () => {
        if (!projectId) return;

        try {
            const [project, analysisRes, blueprintRes, generationRes] = await Promise.all([
                api.getProject(projectId).catch(() => null),
                api.getAnalysis(projectId).catch(() => null),
                api.getBlueprint(projectId).catch(() => null),
                api.getGenerationStatus(projectId).catch(() => null),
            ]);

            setStatus({
                hasDocuments: project?.documents?.some((d: any) => d.status === 'parsed') || false,
                hasAnalysis: !!analysisRes?.analysis,
                hasBlueprint: !!blueprintRes?.blueprint,
                blueprintApproved: blueprintRes?.blueprint?.status === 'approved',
                hasGeneration: generationRes?.hasContent || false,
                loading: false,
            });
        } catch (error) {
            console.error('Status check failed:', error);
            setStatus(prev => ({ ...prev, loading: false }));
        }
    };

    return { ...status, refresh: checkStatus };
}
