import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/Button';

interface AIPrompt {
  prompt_key: string;
  prompt_name: string;
  prompt_template: string;
  description?: string;
  model_config?: string;
  version: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export default function AdminPrompts() {
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    prompt_key: '',
    prompt_name: '',
    prompt_template: '',
    description: '',
    model_config: '',
  });
  const queryClient = useQueryClient();

  const { data: prompts, isLoading, error } = useQuery<{ prompts: AIPrompt[] }>({
    queryKey: ['admin', 'prompts'],
    queryFn: () => apiClient.request('/api/admin/prompts?active_only=false'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiClient.request('/api/admin/prompts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'prompts'] });
      setIsEditing(false);
      setSelectedPrompt(null);
      resetForm();
      alert('Prompt saved successfully!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (promptKey: string) =>
      apiClient.request(`/api/admin/prompts/${promptKey}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'prompts'] });
      setSelectedPrompt(null);
      alert('Prompt deleted successfully!');
    },
  });

  const resetForm = () => {
    setFormData({
      prompt_key: '',
      prompt_name: '',
      prompt_template: '',
      description: '',
      model_config: '',
    });
  };

  const handleEdit = (prompt: AIPrompt) => {
    setSelectedPrompt(prompt);
    setFormData({
      prompt_key: prompt.prompt_key,
      prompt_name: prompt.prompt_name,
      prompt_template: prompt.prompt_template,
      description: prompt.description || '',
      model_config: prompt.model_config || '',
    });
    setIsEditing(true);
  };

  const handleNew = () => {
    setSelectedPrompt(null);
    resetForm();
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedPrompt(null);
    resetForm();
  };

  const handleSave = () => {
    if (!formData.prompt_key || !formData.prompt_name || !formData.prompt_template) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate model_config is valid JSON if provided
    if (formData.model_config) {
      try {
        JSON.parse(formData.model_config);
      } catch (e) {
        alert('Invalid JSON in model configuration');
        return;
      }
    }

    saveMutation.mutate(formData);
  };

  const handleDelete = (promptKey: string) => {
    if (confirm(`Are you sure you want to delete prompt '${promptKey}'? This will deactivate it.`)) {
      deleteMutation.mutate(promptKey);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading prompts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Error Loading Prompts</h3>
        <p className="text-red-600 text-sm mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Prompt Management</h1>
          <p className="text-gray-600 mt-2">Configure AI prompt templates</p>
        </div>
        <Button onClick={handleNew} disabled={isEditing}>
          Create New Prompt
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prompts List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Available Prompts</h2>
          <div className="space-y-3">
            {prompts?.prompts.map((prompt) => (
              <div
                key={prompt.prompt_key}
                className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all ${
                  selectedPrompt?.prompt_key === prompt.prompt_key
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!prompt.is_active ? 'opacity-50' : ''}`}
                onClick={() => !isEditing && setSelectedPrompt(prompt)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{prompt.prompt_name}</h3>
                      {!prompt.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Key: <code className="bg-gray-100 px-1 rounded">{prompt.prompt_key}</code>
                    </p>
                    {prompt.description && (
                      <p className="text-sm text-gray-500 mt-1">{prompt.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Version {prompt.version} • Updated {formatDate(prompt.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {prompts?.prompts.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No prompts found</p>
              </div>
            )}
          </div>
        </div>

        {/* Prompt Editor / Viewer */}
        <div>
          {isEditing ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {selectedPrompt ? 'Edit Prompt' : 'Create New Prompt'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prompt Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.prompt_key}
                    onChange={(e) => setFormData({ ...formData, prompt_key: e.target.value })}
                    disabled={!!selectedPrompt}
                    placeholder="cover_letter"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unique identifier (cannot be changed after creation)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prompt Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.prompt_name}
                    onChange={(e) => setFormData({ ...formData, prompt_name: e.target.value })}
                    placeholder="Cover Letter Generator"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Generates personalized cover letters"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prompt Template <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.prompt_template}
                    onChange={(e) => setFormData({ ...formData, prompt_template: e.target.value })}
                    rows={12}
                    placeholder="You are an expert cover letter writer. Use {{user_name}} and {{job_title}}..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {'{{'} and {'}}'}  for variables (e.g., {'{{user_name}}'})
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Configuration (JSON)
                  </label>
                  <textarea
                    value={formData.model_config}
                    onChange={(e) => setFormData({ ...formData, model_config: e.target.value })}
                    rows={4}
                    placeholder='{"temperature": 0.7, "max_tokens": 1000}'
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Prompt'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : selectedPrompt ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">{selectedPrompt.prompt_name}</h2>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEdit(selectedPrompt)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(selectedPrompt.prompt_key)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Key</p>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedPrompt.prompt_key}</code>
                </div>

                {selectedPrompt.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Description</p>
                    <p className="text-sm text-gray-600">{selectedPrompt.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Template</p>
                  <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap break-words">
                    {selectedPrompt.prompt_template}
                  </pre>
                </div>

                {selectedPrompt.model_config && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Model Configuration</p>
                    <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(JSON.parse(selectedPrompt.model_config), null, 2)}
                    </pre>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    Version {selectedPrompt.version} •
                    Created {formatDate(selectedPrompt.created_at)} •
                    Updated {formatDate(selectedPrompt.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500">Select a prompt to view or edit</p>
              <p className="text-sm text-gray-400 mt-2">or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">About AI Prompts</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Prompts are cached for 24 hours to improve performance</li>
          <li>Use double curly braces for variables: {'{{variable_name}}'}</li>
          <li>Deleting a prompt sets is_active to 0 (soft delete)</li>
          <li>Version numbers increment automatically on each update</li>
          <li>Model configuration is optional and should be valid JSON</li>
        </ul>
      </div>
    </div>
  );
}
