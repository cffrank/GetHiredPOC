import { useState, FormEvent, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { useAuth } from '../context/AuthContext';
import { useUpdateProfile, useUpdateProfileWithFile } from '../hooks/useProfile';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { WorkExperience } from '../components/WorkExperience';
import { Education } from '../components/Education';
import { Linkedin, FileText, Upload, Copy, Edit, X } from 'lucide-react';
import { apiClient } from '../lib/api-client';

export default function Profile() {
  const { user } = useAuth();
  const updateProfileMutation = useUpdateProfile();
  const updateProfileWithFileMutation = useUpdateProfileWithFile();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [address, setAddress] = useState(user?.address || '');
  const [linkedInUrl, setLinkedInUrl] = useState(user?.linkedin_url || '');
  const [skills, setSkills] = useState(
    user?.skills ? (JSON.parse(user.skills) as string[]).join(', ') : ''
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [linkedInMessage, setLinkedInMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // LinkedIn paste modal state
  const [showLinkedInPaste, setShowLinkedInPaste] = useState(false);
  const [linkedInText, setLinkedInText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Resume upload state
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  // Check for LinkedIn OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'linkedin_imported') {
      setLinkedInMessage({ type: 'success', text: 'Successfully imported profile from LinkedIn!' });
      // Clear the URL parameters
      searchParams.delete('success');
      setSearchParams(searchParams);
      // Clear message after 5 seconds
      setTimeout(() => setLinkedInMessage(null), 5000);
    } else if (error) {
      let errorText = 'Failed to import from LinkedIn';
      if (error === 'linkedin_auth_failed') errorText = 'LinkedIn authorization failed';
      else if (error === 'import_failed') errorText = 'Failed to import profile data';
      else if (error === 'linkedin_not_configured') errorText = 'LinkedIn OAuth is not configured';

      setLinkedInMessage({ type: 'error', text: errorText });
      // Clear the URL parameters
      searchParams.delete('error');
      setSearchParams(searchParams);
      // Clear message after 5 seconds
      setTimeout(() => setLinkedInMessage(null), 5000);
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (avatarFile) {
      const formData = new FormData();
      formData.append('full_name', fullName);
      formData.append('bio', bio);
      formData.append('location', location);
      formData.append('address', address);
      formData.append('linkedin_url', linkedInUrl);
      formData.append('skills', JSON.stringify(skills.split(',').map(s => s.trim()).filter(Boolean)));
      formData.append('avatar', avatarFile);
      await updateProfileWithFileMutation.mutateAsync(formData);
    } else {
      await updateProfileMutation.mutateAsync({
        full_name: fullName,
        bio,
        location,
        address,
        linkedin_url: linkedInUrl,
        skills: skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      });
    }

    setIsEditing(false);
  };

  const handleLinkedInImport = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
    window.location.href = `${apiUrl}/api/linkedin/initiate`;
  };

  const handleLinkedInPaste = async () => {
    if (!linkedInText.trim()) {
      setLinkedInMessage({ type: 'error', text: 'Please paste your LinkedIn profile text' });
      return;
    }

    setIsParsing(true);
    try {
      await apiClient.request('/api/linkedin/parse', {
        method: 'POST',
        body: JSON.stringify({ profileText: linkedInText })
      });

      setLinkedInMessage({ type: 'success', text: 'Successfully imported profile from LinkedIn!' });
      setShowLinkedInPaste(false);
      setLinkedInText('');

      // Reload page to show updated data
      window.location.reload();
    } catch (error: any) {
      setLinkedInMessage({ type: 'error', text: error.message || 'Failed to parse LinkedIn profile' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      setLinkedInMessage({ type: 'error', text: 'Please select a resume file' });
      return;
    }

    setIsUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append('file', resumeFile);
      formData.append('isPrimary', 'false');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
      const response = await fetch(`${apiUrl}/api/resumes`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      setLinkedInMessage({ type: 'success', text: 'Successfully imported profile from resume!' });
      setShowResumeUpload(false);
      setResumeFile(null);

      // Reload page to show updated data
      window.location.reload();
    } catch (error: any) {
      setLinkedInMessage({ type: 'error', text: error.message || 'Failed to upload resume' });
    } finally {
      setIsUploadingResume(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-8">Profile</h1>

          {/* LinkedIn Import Message */}
          {linkedInMessage && (
            <div className={`mb-4 p-4 rounded-lg ${
              linkedInMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {linkedInMessage.text}
            </div>
          )}

          {/* Import Profile Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Import</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Import your profile information from LinkedIn or your resume to get started quickly
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* LinkedIn OAuth */}
                <button
                  onClick={handleLinkedInImport}
                  className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <Linkedin className="w-8 h-8 text-[#0077B5] mb-2" />
                  <span className="font-medium text-sm">Connect LinkedIn</span>
                  <span className="text-xs text-gray-500 mt-1 text-center">Official OAuth integration</span>
                </button>

                {/* Paste LinkedIn */}
                <button
                  onClick={() => setShowLinkedInPaste(true)}
                  className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
                >
                  <Copy className="w-8 h-8 text-green-600 mb-2" />
                  <span className="font-medium text-sm">Paste Profile</span>
                  <span className="text-xs text-gray-500 mt-1 text-center">Copy & paste LinkedIn text</span>
                </button>

                {/* Upload Resume */}
                <button
                  onClick={() => setShowResumeUpload(true)}
                  className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
                >
                  <FileText className="w-8 h-8 text-purple-600 mb-2" />
                  <span className="font-medium text-sm">Upload Resume</span>
                  <span className="text-xs text-gray-500 mt-1 text-center">Import from PDF</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* LinkedIn Paste Modal */}
          {showLinkedInPaste && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Paste LinkedIn Profile</h2>
                  <p className="text-gray-600 mb-4">
                    Copy your LinkedIn profile text (go to your LinkedIn profile, select all text, and paste here)
                  </p>
                  <textarea
                    value={linkedInText}
                    onChange={(e) => setLinkedInText(e.target.value)}
                    className="w-full h-64 border border-gray-300 rounded-lg p-3 text-sm"
                    placeholder="Paste your LinkedIn profile text here..."
                  />
                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={handleLinkedInPaste}
                      disabled={isParsing || !linkedInText.trim()}
                      className="flex-1"
                    >
                      {isParsing ? 'Parsing...' : 'Import Profile'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowLinkedInPaste(false);
                        setLinkedInText('');
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400"
                      disabled={isParsing}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resume Upload Modal */}
          {showResumeUpload && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Upload Resume</h2>
                  <p className="text-gray-600 mb-4">
                    Upload your resume PDF and we'll automatically extract your work experience and education
                  </p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="resume-file"
                    />
                    <label htmlFor="resume-file" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      {resumeFile ? (
                        <span className="text-sm font-medium text-gray-700">{resumeFile.name}</span>
                      ) : (
                        <>
                          <span className="text-blue-600 font-medium hover:underline">Click to upload</span>
                          <p className="text-sm text-gray-500 mt-1">PDF only, max 10MB</p>
                        </>
                      )}
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleResumeUpload}
                      disabled={isUploadingResume || !resumeFile}
                      className="flex-1"
                    >
                      {isUploadingResume ? 'Uploading...' : 'Import Resume'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowResumeUpload(false);
                        setResumeFile(null);
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400"
                      disabled={isUploadingResume}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Information</CardTitle>
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      // Reset to user data
                      setFullName(user?.full_name || '');
                      setBio(user?.bio || '');
                      setLocation(user?.location || '');
                      setAddress(user?.address || '');
                      setLinkedInUrl(user?.linkedin_url || '');
                      setSkills(user?.skills ? (JSON.parse(user.skills) as string[]).join(', ') : '');
                      setAvatarFile(null);
                    }}
                    className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isEditing ? (
                // Read-only view
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-500 text-sm">Email</Label>
                    <p className="text-gray-900 font-medium">{user?.email || 'Not set'}</p>
                  </div>

                  <div>
                    <Label className="text-gray-500 text-sm">Full Name</Label>
                    <p className="text-gray-900 font-medium">{fullName || 'Not set'}</p>
                  </div>

                  <div>
                    <Label className="text-gray-500 text-sm">Bio</Label>
                    <p className="text-gray-900">{bio || 'Not set'}</p>
                  </div>

                  <div>
                    <Label className="text-gray-500 text-sm">Location (City, State)</Label>
                    <p className="text-gray-900">{location || 'Not set'}</p>
                  </div>

                  <div>
                    <Label className="text-gray-500 text-sm">Full Address</Label>
                    <p className="text-gray-900">{address || 'Not set'}</p>
                  </div>

                  <div>
                    <Label className="text-gray-500 text-sm">LinkedIn Profile URL</Label>
                    {linkedInUrl ? (
                      <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {linkedInUrl}
                      </a>
                    ) : (
                      <p className="text-gray-900">Not set</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-gray-500 text-sm">Skills</Label>
                    <p className="text-gray-900">{skills || 'Not set'}</p>
                  </div>
                </div>
              ) : (
                // Edit mode
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location (City, State)</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="San Francisco, CA"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Full Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main St, Apt 4B, San Francisco, CA 94102"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedInUrl">LinkedIn Profile URL</Label>
                    <Input
                      id="linkedInUrl"
                      value={linkedInUrl}
                      onChange={(e) => setLinkedInUrl(e.target.value)}
                      placeholder="https://www.linkedin.com/in/yourprofile"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma-separated)</Label>
                    <Input
                      id="skills"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="React, TypeScript, Node.js"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar">Profile Picture</Label>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    {updateProfileMutation.isPending || updateProfileWithFileMutation.isPending
                      ? 'Saving...'
                      : 'Save Changes'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Work Experience Section */}
          <div className="mt-8">
            <WorkExperience />
          </div>

          {/* Education Section */}
          <div className="mt-8">
            <Education />
          </div>
        </div>
      </div>
    </>
  );
}
