// frontend/src/components/AnalysisView.tsx
import { useState, useEffect } from 'react';
import { Card, Button, Progress, Tabs, Tab, Chip } from '@heroui/react';
import { api } from '../lib/api';

interface Props {
    projectId: string;
}

export function AnalysisView({ projectId }: Props) {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadExistingAnalysis();
    }, [projectId]);

    const loadExistingAnalysis = async () => {
        try {
            const result = await api.getAnalysis(projectId);
            if (result.analysis) {
                setAnalysis(result.analysis);
            }
        } catch (err) {
            // No analysis yet, that's ok
            console.log('No existing analysis found');
        }
    };

    const runAnalysis = async () => {
        setLoading(true);
        setError(null);

        try {
            await api.startAnalysis(projectId);

            // Poll for results every 3 seconds
            let attempts = 0;
            const maxAttempts = 40; // 2 minutes max

            const pollInterval = setInterval(async () => {
                attempts++;

                try {
                    const result = await api.getAnalysis(projectId);
                    if (result.analysis) {
                        setAnalysis(result.analysis);
                        setLoading(false);
                        clearInterval(pollInterval);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        setLoading(false);
                        setError('Analysis timeout. Please try again.');
                    }
                } catch (pollError) {
                    if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        setLoading(false);
                        setError('Failed to get analysis results');
                    }
                }
            }, 3000);
        } catch (err: any) {
            setLoading(false);
            setError(err.message || 'Failed to start analysis');
        }
    };

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">🔍 Document Analysis</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        AI-powered analysis of your uploaded documents
                    </p>
                </div>
                <Button
                    color="default"
                    size="lg"
                    onClick={runAnalysis}
                    disabled={loading}
                >
                    {loading ? '⏳ Analyzing...' : analysis ? '🔄 Re-analyze' : '▶️ Run Analysis'}
                </Button>
            </div>

            {loading && (
                <div className="space-y-3 mb-6">
                    <Progress isIndeterminate color="primary" />
                    <div className="text-center">
                        <p className="text-sm text-gray-600">
                            🤖 AI Agent is analyzing your documents...
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            This usually takes 30-90 seconds
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                    <p className="text-red-800">❌ {error}</p>
                </div>
            )}

            {!analysis && !loading && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-4">
                        No analysis results yet. Click "Run Analysis" to start.
                    </p>
                    <p className="text-sm text-gray-400">
                        Make sure you have uploaded and parsed documents first.
                    </p>
                </div>
            )}

            {analysis && !loading && (
                <Tabs aria-label="Analysis results" size="lg">
                    <Tab key="classification" title="📋 Classification">
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Document Type</p>
                                    <p className="text-lg font-semibold">
                                        {analysis.classification?.type?.replace(/_/g, ' ').toUpperCase()}
                                    </p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Confidence</p>
                                    <p className="text-lg font-semibold">
                                        {analysis.classification?.confidence}%
                                    </p>
                                </div>
                            </div>

                            {analysis.classification?.keywords?.length > 0 && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-2">Keywords</p>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.classification.keywords.map((kw: string, i: number) => (
                                            <Chip key={i} size="sm" variant="flat">
                                                {kw}
                                            </Chip>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analysis.classification?.reasoning && (
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Reasoning</p>
                                    <p className="text-sm">{analysis.classification.reasoning}</p>
                                </div>
                            )}
                        </div>
                    </Tab>

                    <Tab key="entities" title="🏢 Entities">
                        <div className="p-6 space-y-4">
                            {analysis.entities?.projectName && (
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Project Name</p>
                                    <p className="text-lg font-semibold">{analysis.entities.projectName}</p>
                                </div>
                            )}

                            {analysis.entities?.budget && (
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Budget</p>
                                    <p className="text-xl font-bold">
                                        {analysis.entities.budget.total?.toLocaleString()} {analysis.entities.budget.currency}
                                    </p>
                                </div>
                            )}

                            {analysis.entities?.stakeholders?.length > 0 && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-2">Stakeholders</p>
                                    <div className="space-y-2">
                                        {analysis.entities.stakeholders.map((s: string, i: number) => (
                                            <div key={i} className="p-3 bg-gray-50 rounded">
                                                {s}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analysis.entities?.timeline && (
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-2">Timeline</p>
                                    <div className="space-y-1 text-sm">
                                        {analysis.entities.timeline.start && (
                                            <p>Start: {analysis.entities.timeline.start}</p>
                                        )}
                                        {analysis.entities.timeline.end && (
                                            <p>End: {analysis.entities.timeline.end}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Tab>

                    <Tab key="metrics" title="📊 Metrics">
                        <div className="p-6 space-y-6">
                            {analysis.metrics?.financial?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">💰 Financial</h4>
                                    <div className="space-y-2">
                                        {analysis.metrics.financial.map((m: any, i: number) => (
                                            <div key={i} className="p-3 bg-green-50 rounded flex justify-between">
                                                <span className="font-medium">{m.name}</span>
                                                <span>{m.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analysis.metrics?.technical?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">⚙️ Technical</h4>
                                    <div className="space-y-2">
                                        {analysis.metrics.technical.map((m: any, i: number) => (
                                            <div key={i} className="p-3 bg-blue-50 rounded flex justify-between">
                                                <span className="font-medium">{m.name}</span>
                                                <span>{m.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analysis.metrics?.risk?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">⚠️ Risks</h4>
                                    <div className="space-y-2">
                                        {analysis.metrics.risk.map((r: any, i: number) => (
                                            <div key={i} className="p-3 bg-red-50 rounded">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-medium">{r.name}</span>
                                                    <Chip size="sm" color={
                                                        r.severity === 'critical' ? 'danger' :
                                                            r.severity === 'high' ? 'warning' : 'default'
                                                    }>
                                                        {r.severity}
                                                    </Chip>
                                                </div>
                                                <p className="text-sm text-gray-700">{r.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Tab>

                    <Tab key="quality" title="✅ Quality">
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-2">Completeness</p>
                                    <p className="text-2xl font-bold">{analysis.quality?.completeness}%</p>
                                    <Progress
                                        value={analysis.quality?.completeness}
                                        className="mt-2"
                                        color={analysis.quality?.completeness > 70 ? 'success' : 'warning'}
                                    />
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-2">Consistency</p>
                                    <p className="text-2xl font-bold">{analysis.quality?.consistency}%</p>
                                    <Progress
                                        value={analysis.quality?.consistency}
                                        className="mt-2"
                                        color={analysis.quality?.consistency > 70 ? 'success' : 'warning'}
                                    />
                                </div>
                            </div>

                            {analysis.quality?.issues?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">⚠️ Issues Found</h4>
                                    <div className="space-y-2">
                                        {analysis.quality.issues.map((issue: any, i: number) => (
                                            <div key={i} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-medium">{issue.type?.replace(/_/g, ' ')}</span>
                                                    <Chip size="sm" color={
                                                        issue.severity === 'high' ? 'danger' :
                                                            issue.severity === 'medium' ? 'warning' : 'default'
                                                    }>
                                                        {issue.severity}
                                                    </Chip>
                                                </div>
                                                <p className="text-sm">{issue.description}</p>
                                                {issue.location && (
                                                    <p className="text-xs text-gray-500 mt-1">📍 {issue.location}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analysis.quality?.gaps?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">🔍 Missing Information</h4>
                                    <ul className="space-y-2">
                                        {analysis.quality.gaps.map((gap: string, i: number) => (
                                            <li key={i} className="p-3 bg-gray-50 rounded">
                                                • {gap}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </Tab>

                    <Tab key="recommendations" title="💡 Recommendations">
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Recommended Presentation Type</p>
                                <p className="text-lg font-semibold">
                                    {analysis.recommendations?.presentationType?.replace(/_/g, ' ').toUpperCase()}
                                </p>
                            </div>

                            {analysis.recommendations?.slideCount && (
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-2">Suggested Slide Count</p>
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500">Min</p>
                                            <p className="text-lg font-bold">{analysis.recommendations.slideCount.min}</p>
                                        </div>
                                        <div className="text-2xl">→</div>
                                        <div>
                                            <p className="text-xs text-gray-500">Recommended</p>
                                            <p className="text-2xl font-bold text-purple-600">
                                                {analysis.recommendations.slideCount.recommended}
                                            </p>
                                        </div>
                                        <div className="text-2xl">→</div>
                                        <div>
                                            <p className="text-xs text-gray-500">Max</p>
                                            <p className="text-lg font-bold">{analysis.recommendations.slideCount.max}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analysis.recommendations?.mustIncludeSections?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">📌 Must-Include Sections</h4>
                                    <div className="space-y-2">
                                        {analysis.recommendations.mustIncludeSections.map((section: any, i: number) => (
                                            <div key={i} className="p-4 bg-green-50 rounded-lg">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-medium">{section.name}</span>
                                                    <Chip size="sm" color={
                                                        section.priority === 'critical' ? 'danger' : 'primary'
                                                    }>
                                                        {section.priority}
                                                    </Chip>
                                                </div>
                                                <p className="text-sm text-gray-700">{section.reasoning}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analysis.recommendations?.visualizations?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">📊 Suggested Visualizations</h4>
                                    <div className="space-y-2">
                                        {analysis.recommendations.visualizations.map((viz: any, i: number) => (
                                            <div key={i} className="p-4 bg-orange-50 rounded-lg">
                                                <p className="font-medium mb-1">{viz.type?.replace(/_/g, ' ')}</p>
                                                <p className="text-sm font-semibold text-gray-800 mb-1">{viz.title}</p>
                                                <p className="text-xs text-gray-600">{viz.reasoning}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Tab>
                </Tabs>
            )}
        </Card>
    );
}