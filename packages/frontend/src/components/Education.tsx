import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface Education {
  id: string;
  school: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  gpa: string;
}

export function Education() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    school: '',
    degree: '',
    field_of_study: '',
    start_date: '',
    end_date: '',
    gpa: ''
  });

  const { data: educations, isLoading } = useQuery<Education[]>({
    queryKey: ['education'],
    queryFn: () => apiClient.request('/api/education')
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiClient.request('/api/education', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) =>
      apiClient.request(`/api/education/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.request(`/api/education/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education'] });
    }
  });

  const resetForm = () => {
    setFormData({
      school: '',
      degree: '',
      field_of_study: '',
      start_date: '',
      end_date: '',
      gpa: ''
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (edu: Education) => {
    // Convert YYYY format to YYYY-MM-DD for date inputs
    const formatDateForInput = (dateStr: string) => {
      if (!dateStr) return '';
      // If already in YYYY-MM-DD format, return as is
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
      // If in YYYY format, convert to YYYY-01-01
      if (dateStr.match(/^\d{4}$/)) return `${dateStr}-01-01`;
      // If in YYYY-MM format, add -01
      if (dateStr.match(/^\d{4}-\d{2}$/)) return `${dateStr}-01`;
      return dateStr;
    };

    setFormData({
      school: edu.school,
      degree: edu.degree,
      field_of_study: edu.field_of_study,
      start_date: formatDateForInput(edu.start_date),
      end_date: formatDateForInput(edu.end_date),
      gpa: edu.gpa || ''
    });
    setEditingId(edu.id);
    setIsAdding(true);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Present';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading education...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Education</CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              Add Education
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school">School/University *</Label>
                <Input
                  id="school"
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  required
                  placeholder="Stanford University"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="degree">Degree *</Label>
                <Input
                  id="degree"
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  required
                  placeholder="Bachelor of Science"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field_of_study">Field of Study *</Label>
              <Input
                id="field_of_study"
                value={formData.field_of_study}
                onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                required
                placeholder="Computer Science"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  placeholder="Leave blank if current"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gpa">GPA / Additional Info</Label>
              <Input
                id="gpa"
                value={formData.gpa}
                onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                placeholder="3.8/4.0, Dean's List, etc."
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? 'Update' : 'Add'} Education
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {educations && educations.length > 0 ? (
          <div className="space-y-4">
            {educations.map((edu) => (
              <div key={edu.id} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{edu.degree}</h3>
                    <p className="text-gray-700">{edu.school}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(edu)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this education?')) {
                          deleteMutation.mutate(edu.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {edu.field_of_study} • {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                </p>
                {edu.gpa && (
                  <p className="text-gray-700 text-sm">{edu.gpa}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          !isAdding && (
            <div className="text-center py-8 text-gray-500">
              <p>No education added yet.</p>
              <p className="text-sm mt-1">Click "Add Education" to get started.</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
