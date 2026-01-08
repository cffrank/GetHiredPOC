import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import type { InterviewQuestion } from '@gethiredpoc/shared';

export function InterviewQuestions() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'behavioral' | 'technical'>('all');

  // Form state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isBehavioral, setIsBehavioral] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [notes, setNotes] = useState('');

  // Fetch interview questions
  const { data: questions, isLoading } = useQuery<InterviewQuestion[]>({
    queryKey: ['interview-questions'],
    queryFn: () => apiClient.request('/api/interview-questions')
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingId) {
        return apiClient.request(`/api/interview-questions/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      }
      return apiClient.request('/api/interview-questions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-questions'] });
      resetForm();
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.request(`/api/interview-questions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-questions'] });
    }
  });

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setIsBehavioral(false);
    setDifficulty('medium');
    setNotes('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (q: InterviewQuestion) => {
    setQuestion(q.question);
    setAnswer(q.answer || '');
    setIsBehavioral(q.is_behavioral === 1);
    setDifficulty((q.difficulty as 'easy' | 'medium' | 'hard') || 'medium');
    setNotes(q.notes || '');
    setEditingId(q.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      question,
      answer: answer || null,
      is_behavioral: isBehavioral ? 1 : 0,
      difficulty,
      notes: notes || null
    });
  };

  const filteredQuestions = questions?.filter(q => {
    if (filterType === 'behavioral') return q.is_behavioral === 1;
    if (filterType === 'technical') return q.is_behavioral === 0;
    return true;
  }) || [];

  const getDifficultyColor = (diff: string | null) => {
    switch (diff) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'hard': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading interview questions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Interview Questions</h2>
          <p className="text-gray-600 text-sm mt-1">
            Prepare for interviews with common questions and your answers
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Question
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['all', 'behavioral', 'technical'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              filterType === type
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
            {type === 'all' && ` (${questions?.length || 0})`}
            {type === 'behavioral' && ` (${questions?.filter(q => q.is_behavioral === 1).length || 0})`}
            {type === 'technical' && ` (${questions?.filter(q => q.is_behavioral === 0).length || 0})`}
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingId ? 'Edit Question' : 'New Question'}</CardTitle>
              <Button
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Question *</Label>
                <textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                  className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder="Tell me about a time when..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer">Your Answer</Label>
                <textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="flex min-h-[120px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder="Use the STAR method: Situation, Task, Action, Result..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    value={isBehavioral ? 'behavioral' : 'technical'}
                    onChange={(e) => setIsBehavioral(e.target.value === 'behavioral')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="behavioral">Behavioral</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or tips..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Question' : 'Add Question'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-700 mb-1">No questions yet</h3>
            <p className="text-gray-500">
              {filterType === 'all'
                ? 'Add your first interview question to get started'
                : `No ${filterType} questions found`}
            </p>
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <Card key={q.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${
                        q.is_behavioral === 1
                          ? 'bg-purple-100 text-purple-700 border-purple-300'
                          : 'bg-blue-100 text-blue-700 border-blue-300'
                      }`}>
                        {q.is_behavioral === 1 ? 'Behavioral' : 'Technical'}
                      </span>
                      {q.difficulty && (
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getDifficultyColor(q.difficulty)}`}>
                          {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{q.question}</h3>
                    {q.answer && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-2">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.answer}</p>
                      </div>
                    )}
                    {q.notes && (
                      <p className="text-sm text-gray-600 italic">Note: {q.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={() => handleEdit(q)}
                      className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this question?')) {
                          deleteMutation.mutate(q.id);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
