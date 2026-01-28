// frontend/src/pages/ProjectPageV2.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import { WorkflowStepper } from '../components/WorkflowStepper';
import type { WorkflowStage } from '../components/WorkflowStepper';
import { api } from '../lib/api';

// Stage components
import { ProjectSetupStage } from '../components/stages/ProjectSetupStage';
import { DocumentsStage } from '../components/stages/DocumentsStage';
import { AnalysisStage } from '../components/stages/AnalysisStage';
import { BlueprintStage } from '../components/stages/BlueprintStage';
import { ContentAndExportStage } from '../components/stages/ContentAndExportStage';
import { SpeakerNotesStage } from '../components/stages/SpeakerNotesStage';

export function ProjectPageV2() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [currentStage, setCurrentStage] = useState<WorkflowStage>('documents');

  // Data for each stage - lazy loaded
  const [documents, setDocuments] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [slideContents, setSlideContents] = useState<any[]>([]);

  // Track what data has been loaded
  const [loadedStages, setLoadedStages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadDataForStage('documents');
    }
  }, [projectId]);

  // Load data when stage changes
  useEffect(() => {
    if (currentStage && projectId) {
      loadDataForStage(currentStage);
    }
  }, [currentStage]);

  useEffect(() => {
    if (documents.length > 0 && documents.some(d => d.status === 'parsing')) {
      setTimeout(loadDocuments, 3000);
    }
  }, [documents]);

  const loadProject = async () => {
    try {
      const p = await api.getProject(projectId!);
      setProject(p);
    } catch (error: any) {
      console.error('Failed to load project:', error);
      navigate('/');
    }
  };

  /**
   * Load data for specific stage (lazy loading)
   */
  const loadDataForStage = async (stage: WorkflowStage) => {
    // Skip if already loaded
    if (loadedStages.has(stage)) {
      return;
    }

    console.log(`📥 Loading data for stage: ${stage}`);

    try {
      switch (stage) {
        case 'project_setup':
          // No data needed
          break;

        case 'documents':
          await loadDocuments();
          break;

        case 'blueprint':
          await loadBlueprint();
          break;

        case 'content_export':
          await loadBlueprint();
          await loadSlideContents();
          break;
      }

      // Mark as loaded
      setLoadedStages(prev => new Set([...prev, stage]));
    } catch (error) {
      console.error(`Failed to load data for stage ${stage}:`, error);
    }
  };

  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments(projectId!);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadBlueprint = async () => {
    try {
      const bp = await api.getLatestBlueprint(projectId!);
      if (bp) {
        setBlueprint(bp.blueprint);
      }
    } catch (error) {
      console.error('Failed to load blueprint:', error);
    }
  };

  const loadSlideContents = async () => {
    try {
      const contents = await api.getSlideContents(projectId!);
      setSlideContents(contents || []);
    } catch (error) {
      console.error('Failed to load slide contents:', error);
    }
  };

  const goToStage = (stage: WorkflowStage) => {
    setCurrentStage(stage);
  };

  const goNext = () => {
    const stages: WorkflowStage[] = ['documents', 'analysis', 'blueprint', 'content_export', 'speaker_notes', 'project_setup'];
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      setCurrentStage(stages[currentIndex + 1]);
    }
  };

  const goPrev = () => {
    const stages: WorkflowStage[] = ['documents', 'analysis', 'blueprint', 'content_export', 'speaker_notes', 'project_setup'];
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex > 0) {
      setCurrentStage(stages[currentIndex - 1]);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
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
                {project.presentationGoal && (
                  <p className="text-sm text-gray-600 mt-1">
                    🎯 {project.presentationGoal}
                  </p>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex gap-2">
              {documents.length > 0 && (
                <Chip color="success" variant="flat">
                  📄 {documents.length} документов
                </Chip>
              )}
              {analysis && (
                <Chip color="success" variant="flat">
                  🔍 Проанализировано
                </Chip>
              )}
              {blueprint && (
                <Chip color="success" variant="flat">
                  📋 {blueprint.slides?.length || 0} слайдов
                </Chip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        {/* Workflow Stepper - Simplified, all stages clickable */}
        <WorkflowStepper
          currentStage={currentStage}
          onStageClick={goToStage}
        />

        {/* Stage Content */}
        <div className="mt-6">
          {currentStage === 'project_setup' && (
            <ProjectSetupStage
              projectId={projectId!}
              project={project}
            />
          )}

          {currentStage === 'documents' && (
            <DocumentsStage
              projectId={projectId!}
              documents={documents}
              onDocumentsReady={loadDocuments}
              onNext={goNext}
            />
          )}

          {currentStage === 'analysis' && (
            <AnalysisStage
              projectId={projectId!}
              onPrev={goPrev}
              onContinue={goNext}
            />
          )}

          {currentStage === 'blueprint' && (
            <BlueprintStage
              projectId={projectId!}
              analysis={analysis}
              blueprint={blueprint}
              onBlueprintReady={(bp) => {
                setBlueprint(bp);
                goNext();
              }}
              onPrev={goPrev}
              onNext={goNext}
            />
          )}

          {currentStage === 'content_export' && (
            <ContentAndExportStage
              projectId={projectId!}
              blueprint={blueprint}
              onPrev={goPrev}
            />
          )}

          {currentStage === 'speaker_notes' && (
            <SpeakerNotesStage
              projectId={projectId!}
              slideContents={slideContents}
              onPrev={goPrev}
              onNext={() => { }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
