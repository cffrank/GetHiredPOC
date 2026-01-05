import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { Navigation } from '../components/Navigation';

interface Resume {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  is_primary: boolean;
  created_at: number;
  parsed_data: any;
}

export default function Resume() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch user's resumes
  const { data: resumes, isLoading } = useQuery<Resume[]>({
    queryKey: ['resumes'],
    queryFn: () => apiClient.request('/api/resumes')
  });

  // Upload resume mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isPrimary', 'false');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/resumes`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      setUploadError(null);
    },
    onError: (error: Error) => {
      setUploadError(error.message);
    }
  });

  // Delete resume mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.request(`/api/resumes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    }
  });

  // Set primary mutation
  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) => apiClient.request(`/api/resumes/${id}/primary`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    await uploadMutation.mutateAsync(file);
    setUploading(false);

    // Reset input
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">Loading resumes...</div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Resumes</h1>
          <p className="text-gray-600">Upload and manage your resumes</p>
        </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload New Resume</h2>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id="resume-upload"
          />
          <label
            htmlFor="resume-upload"
            className="cursor-pointer inline-block"
          >
            <div className="text-gray-600 mb-2">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploading ? (
                <span className="text-blue-600 font-medium">Uploading...</span>
              ) : (
                <>
                  <span className="text-blue-600 font-medium hover:underline">Click to upload</span>
                  <span className="text-gray-500"> or drag and drop</span>
                </>
              )}
            </div>
            <p className="text-sm text-gray-500">PDF only, max 10MB</p>
          </label>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {uploadError}
          </div>
        )}
      </div>

      {/* Resumes List */}
      <div className="space-y-4">
        {resumes && resumes.length > 0 ? (
          resumes.map((resume) => (
            <div key={resume.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{resume.file_name}</h3>
                    {resume.is_primary && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{formatFileSize(resume.file_size)}</span>
                    <span>•</span>
                    <span>Uploaded {formatDate(resume.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!resume.is_primary && (
                    <button
                      onClick={() => setPrimaryMutation.mutate(resume.id)}
                      disabled={setPrimaryMutation.isPending}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Set as Primary
                    </button>
                  )}
                  <a
                    href={resume.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    View
                  </a>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this resume?')) {
                        deleteMutation.mutate(resume.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-700 mb-1">No resumes yet</h3>
            <p className="text-gray-500">Upload your first resume to get started</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
