import { useState } from 'react';
import { Card, Input, Button } from '@heroui/react';
import { api } from '../lib/api';

export function RAGTest({ projectId }: { projectId?: string }) {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleAsk = async () => {
        if (!question.trim()) return;

        setLoading(true);
        try {
            const result = await api.askQuestion(question, projectId);
            setAnswer(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Ask Questions</h2>

            <div className="flex gap-2 mb-4">
                <Input
                    placeholder="What is the project budget?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                />
                <Button onClick={handleAsk} disabled={loading}>
                    {loading ? 'Thinking...' : 'Ask'}
                </Button>
            </div>

            {answer && (
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded">
                        <p className="font-semibold mb-2">Answer:</p>
                        <p>{answer.answer}</p>
                    </div>

                    <div className="space-y-2">
                        <p className="font-semibold">Sources:</p>
                        {answer.sources.map((source: any, idx: number) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded text-sm">
                                <p className="font-mono text-xs text-gray-500 mb-1">
                                    {source.metadata.source} (Similarity: {(source.similarity * 100).toFixed(1)}%)
                                </p>
                                <p className="text-gray-700">{source.content.slice(0, 200)}...</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}
