import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/Button';

interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: number;
  message: string;
  byScraper?: {
    linkedin?: { imported: number; updated: number; errors: number };
    indeed?: { imported: number; updated: number; errors: number };
    dice?: { imported: number; updated: number; errors: number };
  };
}

export default function AdminJobs() {
  const [queries, setQueries] = useState('software engineer remote\nweb developer remote\nfrontend engineer remote');
  const [userId, setUserId] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedScrapers, setSelectedScrapers] = useState<string[]>(['linkedin', 'indeed', 'dice']);
  const [isImporting, setIsImporting] = useState(false);
  const [currentScraper, setCurrentScraper] = useState<string | null>(null);
  const [linkedinCookie, setLinkedinCookie] = useState('');
  const [cookieConfigured, setCookieConfigured] = useState(false);
  const [showCookieInput, setShowCookieInput] = useState(false);

  const bulkImportMutation = useMutation({
    mutationFn: (searchQueries: string[]) =>
      apiClient.request('/api/admin/import-jobs', {
        method: 'POST',
        body: JSON.stringify({ queries: searchQueries, scrapers: selectedScrapers }),
      }),
    onMutate: () => {
      setIsImporting(true);
    },
    onSuccess: (data) => {
      setImportResult(data);
      setIsImporting(false);
    },
    onError: () => {
      setIsImporting(false);
    },
  });

  const userImportMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      apiClient.request(`/api/admin/import-jobs-for-user/${targetUserId}`, {
        method: 'POST',
        body: JSON.stringify({ scrapers: selectedScrapers }),
      }),
    onMutate: () => {
      setIsImporting(true);
    },
    onSuccess: (data) => {
      setImportResult(data);
      setIsImporting(false);
    },
    onError: () => {
      setIsImporting(false);
    },
  });

  const updateCookieMutation = useMutation({
    mutationFn: (cookie: string) =>
      apiClient.request('/api/admin/linkedin-cookie', {
        method: 'PUT',
        body: JSON.stringify({ cookie }),
      }),
    onSuccess: () => {
      setCookieConfigured(true);
      setShowCookieInput(false);
      alert('LinkedIn cookie updated successfully');
    },
  });

  const deleteCookieMutation = useMutation({
    mutationFn: () =>
      apiClient.request('/api/admin/linkedin-cookie', {
        method: 'DELETE',
      }),
    onSuccess: () => {
      setCookieConfigured(false);
      setLinkedinCookie('');
      alert('LinkedIn cookie deleted successfully');
    },
  });

  const handleSaveCookie = () => {
    if (!linkedinCookie.trim()) {
      alert('Please enter a LinkedIn cookie');
      return;
    }
    updateCookieMutation.mutate(linkedinCookie);
  };

  // Check cookie status on component mount
  useEffect(() => {
    const checkCookieStatus = async () => {
      try {
        const response = await apiClient.request('/api/admin/linkedin-cookie/status', {
          method: 'GET',
        });
        setCookieConfigured(response.configured);
      } catch (error) {
        console.error('Failed to check cookie status:', error);
      }
    };
    checkCookieStatus();
  }, []);

  const handleBulkImport = () => {
    if (!queries.trim()) {
      alert('Please enter at least one search query');
      return;
    }

    const searchQueries = queries
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (searchQueries.length === 0) {
      alert('Please enter valid search queries');
      return;
    }

    if (confirm(`Import jobs with ${searchQueries.length} search queries?`)) {
      bulkImportMutation.mutate(searchQueries);
    }
  };

  const handleUserImport = () => {
    if (!userId.trim()) {
      alert('Please enter a user ID');
      return;
    }

    if (confirm(`Import jobs for user ${userId} based on their preferences?`)) {
      userImportMutation.mutate(userId);
    }
  };

  const isLoading = bulkImportMutation.isPending || userImportMutation.isPending;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Job Import Management</h1>
        <p className="text-gray-600 mt-2">Import jobs from LinkedIn, Indeed, and Dice</p>
      </div>

      {/* LinkedIn Cookie Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">LinkedIn Cookie Configuration</h2>
        <p className="text-sm text-gray-600 mb-4">
          LinkedIn scraper requires a valid cookie for better data quality. Use the Cookie-Editor Chrome extension to export your LinkedIn cookie.
        </p>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm ${
              cookieConfigured
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {cookieConfigured ? 'Configured' : 'Not Configured'}
            </span>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <Button
            onClick={() => setShowCookieInput(!showCookieInput)}
            variant="outline"
          >
            {showCookieInput ? 'Hide Cookie Input' : 'Configure Cookie'}
          </Button>
          {cookieConfigured && (
            <Button
              onClick={() => {
                if (confirm('Are you sure you want to delete the LinkedIn cookie?')) {
                  deleteCookieMutation.mutate();
                }
              }}
              variant="outline"
              disabled={deleteCookieMutation.isPending}
            >
              {deleteCookieMutation.isPending ? 'Deleting...' : 'Delete Cookie'}
            </Button>
          )}
        </div>

        {showCookieInput && (
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LinkedIn Cookie Value
            </label>
            <textarea
              value={linkedinCookie}
              onChange={(e) => setLinkedinCookie(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs"
              placeholder="Paste your LinkedIn cookie here (JSON format from Cookie-Editor extension)"
            />
            <p className="text-xs text-gray-500 mt-2 mb-4">
              Get your cookie: Install Cookie-Editor Chrome extension → Visit linkedin.com → Click extension → Export → Paste here
            </p>
            <Button
              onClick={handleSaveCookie}
              disabled={updateCookieMutation.isPending || !linkedinCookie.trim()}
            >
              {updateCookieMutation.isPending ? 'Saving...' : 'Save Cookie'}
            </Button>
          </div>
        )}
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
          {importResult?.byScraper && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2 text-sm">Results by Scraper:</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(importResult.byScraper).map(([scraper, stats]) => (
                  <div key={scraper} className="p-3 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold capitalize text-sm mb-2">{scraper}</h5>
                    <div className="text-xs space-y-1">
                      <p className="text-green-600">Imported: {stats.imported}</p>
                      <p className="text-blue-600">Updated: {stats.updated}</p>
                      {stats.errors > 0 && (
                        <p className="text-red-600">Errors: {stats.errors}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          Import jobs from LinkedIn, Indeed, and Dice using custom search queries. Enter one query per line.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Scrapers
          </label>
          <div className="flex gap-4">
            {['linkedin', 'indeed', 'dice'].map(scraper => (
              <label key={scraper} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedScrapers.includes(scraper)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedScrapers([...selectedScrapers, scraper]);
                    } else {
                      setSelectedScrapers(selectedScrapers.filter(s => s !== scraper));
                    }
                  }}
                  className="mr-2 h-4 w-4 rounded border-gray-300"
                />
                <span className="capitalize">{scraper}</span>
              </label>
            ))}
          </div>
        </div>

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

        <Button
          onClick={handleBulkImport}
          disabled={isLoading}
        >
          {bulkImportMutation.isPending ? 'Importing...' : 'Start Bulk Import'}
        </Button>

        {isImporting && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Importing jobs from {selectedScrapers.join(', ')}... This may take several minutes.
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
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

        <Button
          onClick={handleUserImport}
          disabled={isLoading}
          variant="outline"
        >
          {userImportMutation.isPending ? 'Importing...' : 'Import for User'}
        </Button>

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
          <li>Bulk import searches LinkedIn, Indeed, and Dice with the queries you provide</li>
          <li>User-specific import uses the user's preferences (job title, location, etc.) across all selected scrapers</li>
          <li>User-specific imports are rate-limited to once every 24 hours per user</li>
          <li>Duplicate jobs are automatically detected and updated instead of creating new entries</li>
          <li>Jobs are deduplicated by external ID to prevent duplicates</li>
          <li>Import operations are logged in the audit log</li>
        </ul>
      </div>
    </div>
  );
}
