// frontend/src/pages/ProjectPageV2.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import { WorkflowStepper } from '../components/WorkflowStepper';
import type { WorkflowStage } from '../components/WorkflowStepper';
import { api } from '../lib/api';

// Stage components (будут созданы отдельно)
import { DocumentsStage } from '../components/stages/DocumentsStage';
import { AnalysisStage } from '../components/stages/AnalysisStage';
import { BlueprintStage } from '../components/stages/BlueprintStage';
import { ContentStage } from '../components/stages/ContentStage';
import { SpeakerNotesStage } from '../components/stages/SpeakerNotesStage';
import { ExportStage } from '../components/stages/ExportStage';

export function ProjectPageV2() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [currentStage, setCurrentStage] = useState<WorkflowStage>('documents');
  const [completedStages, setCompletedStages] = useState<WorkflowStage[]>(['project_setup']);

  // Data for each stage - lazy loaded per stage
  const [documents, setDocuments] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [slideContents, setSlideContents] = useState<any[]>([]);
  const [speakerNotes, setSpeakerNotes] = useState<any[]>([]);

  // Track what data has been loaded
  const [loadedStages, setLoadedStages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (projectId) {
      loadProject();
      // Only load documents on initial load (first stage)
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
    console.log(documents.length > 0, documents.some(d => d.status === 'parsing'))
    if (documents.length > 0 && documents.some(d => d.status === 'parsing')) {
      setTimeout(loadDocuments, 3000);
    }
  }, [documents]);

  const loadProject = async () => {
    try {
      const p = await api.getProject(projectId!);
      setProject(p);

      // Determine current stage based on project status
      determineCurrentStage();
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
        case 'documents':
          await loadDocuments();
          break;

        case 'analysis':
          await loadDocuments(); // Need documents for analysis
          await loadAnalysis();
          break;

        case 'blueprint':
          await loadAnalysis(); // Need analysis for blueprint
          await loadBlueprint();
          break;

        case 'content':
          await loadBlueprint(); // Need blueprint for content
          await loadSlideContents();
          break;

        case 'speaker_notes':
          await loadSlideContents(); // Need slide contents for notes
          await loadSpeakerNotes();
          break;

        case 'export':
          await loadBlueprint();
          await loadSlideContents();
          await loadSpeakerNotes();
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

      // Mark documents stage as completed if we have parsed docs
      if (docs.length > 0 && docs.every((d: any) => d.status === 'parsed')) {
        markStageCompleted('documents');
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadAnalysis = async () => {
    try {
      const analyses = await api.getAnalysis(projectId!);
      if (analyses && analyses.length > 0) {
        setAnalysis(analyses[0]);
        markStageCompleted('analysis');
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
    }
  };

  const loadBlueprint = async () => {
    try {
      const bp = await api.getLatestBlueprint(projectId!);
      if (bp) {
        setBlueprint(bp.blueprint);
        markStageCompleted('blueprint');

        if (bp.blueprint.status === 'blueprint_ready') {
          markStageCompleted('blueprint');
        }
      }
    } catch (error) {
      console.error('Failed to load blueprint:', error);
    }
  };

  const loadSlideContents = async () => {
    try {
      if (!blueprint?.id) {
        console.log('No blueprint available for loading slide contents');
        return;
      }

      const contents = await api.getSlideContents(projectId!);
      setSlideContents(contents || []);

      if (contents && contents.length > 0) {
        markStageCompleted('content');
      }
    } catch (error) {
      console.error('Failed to load slide contents:', error);
    }
  };

  const loadSpeakerNotes = async () => {
    try {
      if (!blueprint?.id) {
        console.log('No blueprint available for loading speaker notes');
        return;
      }

      const notes = await api.getSpeakerNotes(projectId!);
      setSpeakerNotes(notes || []);

      if (notes && notes.length > 0) {
        markStageCompleted('speaker_notes');
      }
    } catch (error) {
      console.error('Failed to load speaker notes:', error);
    }
  };

  const determineCurrentStage = () => {
    // Logic to determine which stage we're on based on project state
    if (!documents.length) {
      setCurrentStage('documents');
    } else if (!analysis) {
      setCurrentStage('analysis');
    } else if (!blueprint) {
      setCurrentStage('blueprint');
    } else if (blueprint.status !== 'blueprint_ready') {
      setCurrentStage('blueprint');
    } else if (!slideContents.length) {
      setCurrentStage('content');
    } else {
      setCurrentStage('speaker_notes');
    }
  };

  const markStageCompleted = (stage: WorkflowStage) => {
    setCompletedStages(prev => {
      if (!prev.includes(stage)) {
        return [...prev, stage];
      }
      return prev;
    });
  };

  const goToStage = (stage: WorkflowStage) => {
    // Check if stage is accessible
    const stageIndex = ['project_setup', 'documents', 'analysis', 'blueprint', 'content', 'speaker_notes', 'export'].indexOf(stage);
    const currentIndex = ['project_setup', 'documents', 'analysis', 'blueprint', 'content', 'speaker_notes', 'export'].indexOf(currentStage);

    // Can go to completed stages or next stage
    if (completedStages.includes(stage) || stageIndex === currentIndex + 1) {
      setCurrentStage(stage);
    }
  };

  const goNext = () => {
    const stages: WorkflowStage[] = ['project_setup', 'documents', 'analysis', 'blueprint', 'content', 'speaker_notes', 'export'];
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      setCurrentStage(nextStage);
    }
  };

  const goPrev = () => {
    const stages: WorkflowStage[] = ['project_setup', 'documents', 'analysis', 'blueprint', 'content', 'speaker_notes', 'export'];
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
              {blueprint?.status === 'blueprint_ready' && (
                <Chip color="success" variant="flat">
                  ✅ Структура утверждена
                </Chip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        {/* Workflow Stepper */}
        <WorkflowStepper
          currentStage={currentStage}
          completedStages={completedStages}
          onStageClick={goToStage}
        />

        {/* Stage Content */}
        <div className="mt-6">
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
              documents={documents}
              analysis={analysis}
              onAnalysisComplete={(result) => {
                setAnalysis(result);
                markStageCompleted('analysis');
                goNext();
              }}
              onPrev={goPrev}
              onNext={goNext}
            />
          )}

          {currentStage === 'blueprint' && (
            <BlueprintStage
              projectId={projectId!}
              analysis={analysis}
              blueprint={blueprint}
              onBlueprintReady={(bp) => {
                setBlueprint(bp);
                markStageCompleted('blueprint');
                goNext();
              }}
              onPrev={goPrev}
              onNext={goNext}
            />
          )}

          {currentStage === 'content' && (
            <ContentStage
              projectId={projectId!}
              blueprint={blueprint}
              slideContents={slideContents}
              onContentGenerated={(contents) => {
                setSlideContents(contents);
                markStageCompleted('content');
              }}
              onPrev={goPrev}
              onNext={goNext}
            />
          )}

          {currentStage === 'speaker_notes' && (
            <SpeakerNotesStage
              projectId={projectId!}
              slideContents={slideContents}
              speakerNotes={speakerNotes}
              onNotesGenerated={(notes) => {
                setSpeakerNotes(notes);
                markStageCompleted('speaker_notes');
                goNext();
              }}
              onPrev={goPrev}
              onNext={goNext}
            />
          )}

          {currentStage === 'export' && (
            <ExportStage
              projectId={projectId!}
              blueprint={blueprint}
              slideContents={slideContents}
              speakerNotes={speakerNotes}
              onPrev={goPrev}
            />
          )}
        </div>
      </div>
    </div>
  );
}