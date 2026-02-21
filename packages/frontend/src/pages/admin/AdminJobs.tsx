import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/Button';
import { toast } from 'sonner';

interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: number;
  message: string;
}

export default function AdminJobs() {
  const [queries, setQueries] = useState('software engineer remote\nweb developer remote\nfrontend engineer remote');
  const [userId, setUserId] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [confirmingBulkImport, setConfirmingBulkImport] = useState(false);
  const [confirmingUserImport, setConfirmingUserImport] = useState(false);

  const bulkImportMutation = useMutation({
    mutationFn: (searchQueries: string[]) =>
      apiClient.request('/api/admin/import-jobs', {
        method: 'POST',
        body: JSON.stringify({ queries: searchQueries }),
      }),
    onSuccess: (data) => {
      setImportResult(data);
      setConfirmingBulkImport(false);
    },
    onError: (err: Error) => {
      toast.error(`Import failed: ${err.message}`, { duration: 5000 });
      setConfirmingBulkImport(false);
    },
  });

  const userImportMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      apiClient.request(`/api/admin/import-jobs-for-user/${targetUserId}`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      setImportResult(data);
      setConfirmingUserImport(false);
    },
    onError: (err: Error) => {
      toast.error(`Import failed: ${err.message}`, { duration: 5000 });
      setConfirmingUserImport(false);
    },
  });

  const handleBulkImport = () => {
    if (!queries.trim()) {
      toast.error('Please enter at least one search query', { duration: 5000 });
      return;
    }

    const searchQueries = queries
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (searchQueries.length === 0) {
      toast.error('Please enter valid search queries', { duration: 5000 });
      return;
    }

    setConfirmingBulkImport(true);
  };

  const handleBulkImportConfirm = () => {
    const searchQueries = queries
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);
    bulkImportMutation.mutate(searchQueries);
  };

  const handleUserImport = () => {
    if (!userId.trim()) {
      toast.error('Please enter a user ID', { duration: 5000 });
      return;
    }

    setConfirmingUserImport(true);
  };

  const isLoading = bulkImportMutation.isPending || userImportMutation.isPending;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Job Import Management</h1>
        <p className="text-gray-600 mt-2">Import jobs from Adzuna API</p>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className={`mb-6 p-4 rounded-lg border ${
          importResult.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <h3 className={`font-semibold ${
            importResult.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {importResult.success ? 'Import Successful' : 'Import Failed'}
          </h3>
          <p className={`text-sm mt-1 ${
            importResult.success ? 'text-green-700' : 'text-red-700'
          }`}>
            {importResult.message}
          </p>
          <div className="mt-2 text-sm">
            <ul className="list-disc list-inside space-y-1">
              <li className="text-green-700">Imported: {importResult.imported} jobs</li>
              <li className="text-blue-700">Updated: {importResult.updated} jobs</li>
              {importResult.errors > 0 && (
                <li className="text-red-700">Errors: {importResult.errors}</li>
              )}
            </ul>
          </div>
          <button
            onClick={() => setImportResult(null)}
            className="mt-3 text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bulk Import Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Bulk Job Import</h2>
        <p className="text-sm text-gray-600 mb-4">
          Import jobs from Adzuna using custom search queries. Enter one query per line.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Queries (one per line)
          </label>
          <textarea
            value={queries}
            onChange={(e) => setQueries(e.target.value)}
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="software engineer remote&#10;web developer remote&#10;frontend engineer remote"
          />
          <p className="text-xs text-gray-500 mt-1">
            {queries.split('\n').filter(q => q.trim()).length} queries
          </p>
        </div>

        {confirmingBulkImport ? (
          <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-sm text-gray-700">
              Import jobs with {queries.split('\n').filter(q => q.trim()).length} search queries?
            </span>
            <button
              onClick={handleBulkImportConfirm}
              disabled={isLoading}
              className="text-sm text-green-700 font-medium hover:text-green-900 disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmingBulkImport(false)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <Button
            onClick={handleBulkImport}
            disabled={isLoading}
          >
            {bulkImportMutation.isPending ? 'Importing...' : 'Start Bulk Import'}
          </Button>
        )}

        {bulkImportMutation.isPending && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Importing jobs... This may take a few minutes.
            </p>
          </div>
        )}
      </div>

      {/* User-Specific Import Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">User-Specific Job Import</h2>
        <p className="text-sm text-gray-600 mb-4">
          Import jobs based on a specific user's job search preferences and profile.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID (e.g., usr_...)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            This will use the user's job preferences to search for relevant jobs.
          </p>
        </div>

        {confirmingUserImport ? (
          <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-sm text-gray-700">
              Import jobs for user {userId} based on their preferences?
            </span>
            <button
              onClick={() => userImportMutation.mutate(userId)}
              disabled={isLoading}
              className="text-sm text-green-700 font-medium hover:text-green-900 disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmingUserImport(false)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <Button
            onClick={handleUserImport}
            disabled={isLoading}
            variant="outline"
          >
            {userImportMutation.isPending ? 'Importing...' : 'Import for User'}
          </Button>
        )}

        {userImportMutation.isPending && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Importing jobs for user... This may take a minute.
            </p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">How Job Import Works</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Bulk import searches Adzuna with the queries you provide</li>
          <li>User-specific import uses the user's preferences (job title, location, etc.)</li>
          <li>Duplicate jobs are automatically detected and updated instead of creating new entries</li>
          <li>Jobs are deduplicated by Adzuna ID to prevent duplicates</li>
          <li>Import operations are logged in the audit log</li>
        </ul>
      </div>
    </div>
  );
}
