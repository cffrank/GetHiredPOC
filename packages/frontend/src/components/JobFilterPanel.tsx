import { useState, useEffect } from 'react';
import { X, Search, DollarSign, MapPin, Briefcase, Code } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

export interface JobFilters {
  keywords: string[];
  locations: string[];
  salary_min?: number;
  salary_max?: number;
  experience_level: string[];
  remote?: 'remote' | 'hybrid' | 'onsite' | 'any';
  required_skills: string[];
  job_type: string[];
}

interface JobFilterPanelProps {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  onSearch: () => void;
  isSearching?: boolean;
}

const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead', 'Staff', 'Principal'];
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];
const COMMON_SKILLS = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java',
  'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
  'Git', 'CI/CD', 'Agile', 'Scrum', 'REST API', 'GraphQL'
];

export function JobFilterPanel({ filters, onChange, onSearch, isSearching = false }: JobFilterPanelProps) {
  const [keywordInput, setKeywordInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  // Update filters from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFilters: Partial<JobFilters> = {};

    if (params.has('keywords')) {
      urlFilters.keywords = params.get('keywords')!.split(',');
    }
    if (params.has('locations')) {
      urlFilters.locations = params.get('locations')!.split(',');
    }
    if (params.has('salary_min')) {
      urlFilters.salary_min = parseInt(params.get('salary_min')!);
    }
    if (params.has('salary_max')) {
      urlFilters.salary_max = parseInt(params.get('salary_max')!);
    }
    if (params.has('experience')) {
      urlFilters.experience_level = params.get('experience')!.split(',');
    }
    if (params.has('remote')) {
      urlFilters.remote = params.get('remote') as any;
    }
    if (params.has('skills')) {
      urlFilters.required_skills = params.get('skills')!.split(',');
    }
    if (params.has('type')) {
      urlFilters.job_type = params.get('type')!.split(',');
    }

    if (Object.keys(urlFilters).length > 0) {
      onChange({ ...filters, ...urlFilters });
    }
  }, []);

  // Sync filters to URL
  const syncToUrl = (newFilters: JobFilters) => {
    const params = new URLSearchParams();

    if (newFilters.keywords.length > 0) {
      params.set('keywords', newFilters.keywords.join(','));
    }
    if (newFilters.locations.length > 0) {
      params.set('locations', newFilters.locations.join(','));
    }
    if (newFilters.salary_min) {
      params.set('salary_min', newFilters.salary_min.toString());
    }
    if (newFilters.salary_max) {
      params.set('salary_max', newFilters.salary_max.toString());
    }
    if (newFilters.experience_level.length > 0) {
      params.set('experience', newFilters.experience_level.join(','));
    }
    if (newFilters.remote && newFilters.remote !== 'any') {
      params.set('remote', newFilters.remote);
    }
    if (newFilters.required_skills.length > 0) {
      params.set('skills', newFilters.required_skills.join(','));
    }
    if (newFilters.job_type.length > 0) {
      params.set('type', newFilters.job_type.join(','));
    }

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  };

  const updateFilters = (updates: Partial<JobFilters>) => {
    const newFilters = { ...filters, ...updates };
    onChange(newFilters);
    syncToUrl(newFilters);
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !filters.keywords.includes(keywordInput.trim())) {
      updateFilters({ keywords: [...filters.keywords, keywordInput.trim()] });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    updateFilters({ keywords: filters.keywords.filter(k => k !== keyword) });
  };

  const addLocation = () => {
    if (locationInput.trim() && !filters.locations.includes(locationInput.trim())) {
      updateFilters({ locations: [...filters.locations, locationInput.trim()] });
      setLocationInput('');
    }
  };

  const removeLocation = (location: string) => {
    updateFilters({ locations: filters.locations.filter(l => l !== location) });
  };

  const addSkill = (skill: string) => {
    if (!filters.required_skills.includes(skill)) {
      updateFilters({ required_skills: [...filters.required_skills, skill] });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    updateFilters({ required_skills: filters.required_skills.filter(s => s !== skill) });
  };

  const toggleExperienceLevel = (level: string) => {
    const updated = filters.experience_level.includes(level)
      ? filters.experience_level.filter(l => l !== level)
      : [...filters.experience_level, level];
    updateFilters({ experience_level: updated });
  };

  const toggleJobType = (type: string) => {
    const updated = filters.job_type.includes(type)
      ? filters.job_type.filter(t => t !== type)
      : [...filters.job_type, type];
    updateFilters({ job_type: updated });
  };

  const clearAllFilters = () => {
    const emptyFilters: JobFilters = {
      keywords: [],
      locations: [],
      salary_min: undefined,
      salary_max: undefined,
      experience_level: [],
      remote: 'any',
      required_skills: [],
      job_type: []
    };
    onChange(emptyFilters);
    syncToUrl(emptyFilters);
  };

  const hasActiveFilters =
    filters.keywords.length > 0 ||
    filters.locations.length > 0 ||
    filters.salary_min !== undefined ||
    filters.salary_max !== undefined ||
    filters.experience_level.length > 0 ||
    (filters.remote && filters.remote !== 'any') ||
    filters.required_skills.length > 0 ||
    filters.job_type.length > 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Advanced Search Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-sm"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Search className="w-4 h-4 inline mr-1" />
            Keywords
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              placeholder="e.g., senior react engineer"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <Button onClick={addKeyword} size="sm">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {keyword}
                <button onClick={() => removeKeyword(keyword)} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Locations
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addLocation()}
              placeholder="e.g., San Francisco, CA"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <Button onClick={addLocation} size="sm">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.locations.map((location) => (
              <span
                key={location}
                className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {location}
                <button onClick={() => removeLocation(location)} className="hover:text-green-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Salary Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            Salary Range
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="number"
                placeholder="Min"
                value={filters.salary_min || ''}
                onChange={(e) => updateFilters({ salary_min: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Max"
                value={filters.salary_max || ''}
                onChange={(e) => updateFilters({ salary_max: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* Remote Work Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Location Type
          </label>
          <div className="flex gap-2">
            {(['any', 'remote', 'hybrid', 'onsite'] as const).map((type) => (
              <button
                key={type}
                onClick={() => updateFilters({ remote: type })}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filters.remote === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Briefcase className="w-4 h-4 inline mr-1" />
            Experience Level
          </label>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => toggleExperienceLevel(level)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filters.experience_level.includes(level)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Code className="w-4 h-4 inline mr-1" />
            Required Skills
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && skillInput.trim() && addSkill(skillInput.trim())}
              placeholder="Type or select from common skills"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <Button onClick={() => skillInput.trim() && addSkill(skillInput.trim())} size="sm">
              Add
            </Button>
          </div>
          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-1">Common skills:</p>
            <div className="flex flex-wrap gap-1">
              {COMMON_SKILLS.filter(s => !filters.required_skills.includes(s)).map((skill) => (
                <button
                  key={skill}
                  onClick={() => addSkill(skill)}
                  className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs hover:bg-gray-100"
                >
                  + {skill}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.required_skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
              >
                {skill}
                <button onClick={() => removeSkill(skill)} className="hover:text-indigo-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Job Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Type
          </label>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => toggleJobType(type)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filters.job_type.includes(type)
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Search Button */}
        <div className="pt-4">
          <Button
            onClick={onSearch}
            className="w-full"
            disabled={isSearching || !hasActiveFilters}
          >
            {isSearching ? 'Searching...' : 'Search Jobs'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
