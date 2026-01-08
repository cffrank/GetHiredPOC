import { useState, FormEvent, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUpdateProfile, useUpdateProfileWithFile } from '../hooks/useProfile';
import { useGamification } from '../hooks/useGamification';
import { Button } from '../components/ui/Button';
import { Button3D } from '../components/ui/Button3D';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { FloatingShapesBackground } from '../components/effects/FloatingShapesBackground';
import { ProgressGamification } from '../components/gamification/ProgressGamification';
import { SuccessCelebration } from '../components/SuccessCelebration';
import { WorkExperience } from '../components/WorkExperience';
import { Education } from '../components/Education';
import { InterviewQuestions } from '../components/InterviewQuestions';
import { SettingsTab } from '../components/SettingsTab';
import { ResumeTab } from '../components/ResumeTab';
import { Linkedin, FileText, Upload, Copy, Edit, X, User, Briefcase, GraduationCap, FileCheck, MessageSquare, Settings } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { US_STATES } from '../lib/constants';

export default function Profile() {
  const { user } = useAuth();
  const updateProfileMutation = useUpdateProfile();
  const updateProfileWithFileMutation = useUpdateProfileWithFile();
  const { data: gamificationData } = useGamification();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isEditing, setIsEditing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  // Updated profile form fields using new schema
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [streetAddress, setStreetAddress] = useState(user?.street_address || '');
  const [city, setCity] = useState(user?.city || '');
  const [state, setState] = useState(user?.state || '');
  const [zipCode, setZipCode] = useState(user?.zip_code || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
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

  // Update local state when user data changes
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
      setStreetAddress(user.street_address || '');
      setCity(user.city || '');
      setState(user.state || '');
      setZipCode(user.zip_code || '');
      setBio(user.bio || '');
      setLocation(user.location || '');
      setLinkedInUrl(user.linkedin_url || '');
      setSkills(user.skills ? (JSON.parse(user.skills) as string[]).join(', ') : '');
    }
  }, [user]);

  // Check for LinkedIn OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'linkedin_imported') {
      setLinkedInMessage({ type: 'success', text: 'Successfully imported profile from LinkedIn!' });
      searchParams.delete('success');
      setSearchParams(searchParams);
      setTimeout(() => setLinkedInMessage(null), 5000);
    } else if (error) {
      let errorText = 'Failed to import from LinkedIn';
      if (error === 'linkedin_auth_failed') errorText = 'LinkedIn authorization failed';
      else if (error === 'import_failed') errorText = 'Failed to import profile data';
      else if (error === 'linkedin_not_configured') errorText = 'LinkedIn OAuth is not configured';

      setLinkedInMessage({ type: 'error', text: errorText });
      searchParams.delete('error');
      setSearchParams(searchParams);
      setTimeout(() => setLinkedInMessage(null), 5000);
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Calculate fields updated for XP determination
    const fieldsUpdated = [firstName, lastName, phone, streetAddress, city, state, zipCode, bio, location, linkedInUrl, skills].filter(f => f && f.toString().trim()).length;

    if (avatarFile) {
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('phone', phone);
      formData.append('street_address', streetAddress);
      formData.append('city', city);
      formData.append('state', state);
      formData.append('zip_code', zipCode);
      formData.append('bio', bio);
      formData.append('location', location);
      formData.append('linkedin_url', linkedInUrl);
      formData.append('skills', JSON.stringify(skills.split(',').map(s => s.trim()).filter(Boolean)));
      formData.append('avatar', avatarFile);
      await updateProfileWithFileMutation.mutateAsync(formData);
    } else {
      await updateProfileMutation.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        phone,
        street_address: streetAddress,
        city,
        state,
        zip_code: zipCode,
        bio,
        location,
        linkedin_url: linkedInUrl,
        skills: skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      });
    }

    setIsEditing(false);

    // Show celebration with XP (100 XP for substantial updates, 25 XP for minor)
    const xp = fieldsUpdated >= 3 ? 100 : 25;
    setXpEarned(xp);
    setShowCelebration(true);
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
      window.location.reload();
    } catch (error: any) {
      setLinkedInMessage({ type: 'error', text: error.message || 'Failed to upload resume' });
    } finally {
      setIsUploadingResume(false);
    }
  };

  return (
    <>
      <FloatingShapesBackground />
      <div className="relative z-10 min-h-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-purple-deep mb-8">Your Profile 👤</h1>

          {/* Gamification Progress */}
          {gamificationData && (
            <ProgressGamification
              level={gamificationData.level}
              xp={gamificationData.xp}
              xpMax={gamificationData.xpMax}
              achievements={gamificationData.achievements}
            />
          )}

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
        <Card className="mb-8 rounded-3xl shadow-card-soft border-2 border-gray-100">
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold text-purple-deep">Quick Import ⚡</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-6">
              Import your profile information from LinkedIn or your resume to get started quickly
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleLinkedInImport}
                className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-2xl hover:border-violet hover:bg-violet/5 hover:-translate-y-1 transition-all shadow-3d-sm"
              >
                <Linkedin className="w-10 h-10 text-[#0077B5] mb-3" />
                <span className="font-bold text-sm text-purple-deep">Connect LinkedIn</span>
                <span className="text-xs text-gray-500 mt-1 text-center">Official OAuth integration</span>
              </button>

              <button
                onClick={() => setShowLinkedInPaste(true)}
                className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-2xl hover:border-teal hover:bg-teal/5 hover:-translate-y-1 transition-all shadow-3d-sm"
              >
                <Copy className="w-10 h-10 text-teal mb-3" />
                <span className="font-bold text-sm text-purple-deep">Paste Profile</span>
                <span className="text-xs text-gray-500 mt-1 text-center">Copy & paste LinkedIn text</span>
              </button>

              <button
                onClick={() => setShowResumeUpload(true)}
                className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-2xl hover:border-coral hover:bg-coral/5 hover:-translate-y-1 transition-all shadow-3d-sm"
              >
                <FileText className="w-10 h-10 text-coral mb-3" />
                <span className="font-bold text-sm text-purple-deep">Upload Resume</span>
                <span className="text-xs text-gray-500 mt-1 text-center">Import from PDF</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* LinkedIn Paste Modal */}
        {showLinkedInPaste && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.3s]">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-3d-lg animate-bounce-in">
              <div className="p-8">
                <h2 className="text-3xl font-extrabold text-purple-deep mb-4">Paste LinkedIn Profile 📋</h2>
                <p className="text-gray-600 mb-6">
                  Copy your LinkedIn profile text (go to your LinkedIn profile, select all text, and paste here)
                </p>
                <textarea
                  value={linkedInText}
                  onChange={(e) => setLinkedInText(e.target.value)}
                  className="w-full h-64 border-2 border-gray-300 rounded-2xl p-4 text-sm focus:border-violet focus:ring-2 focus:ring-violet/20 transition-all"
                  placeholder="Paste your LinkedIn profile text here..."
                />
                <div className="flex gap-4 mt-6">
                  <Button3D
                    onClick={handleLinkedInPaste}
                    disabled={isParsing || !linkedInText.trim()}
                    variant="primary"
                    icon="🚀"
                  >
                    {isParsing ? 'Parsing...' : 'Import Profile'}
                  </Button3D>
                  <Button3D
                    onClick={() => {
                      setShowLinkedInPaste(false);
                      setLinkedInText('');
                    }}
                    variant="secondary"
                    disabled={isParsing}
                  >
                    Cancel
                  </Button3D>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resume Upload Modal */}
        {showResumeUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.3s]">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-3d-lg animate-bounce-in">
              <div className="p-8">
                <h2 className="text-3xl font-extrabold text-purple-deep mb-4">Upload Resume 📄</h2>
                <p className="text-gray-600 mb-6">
                  Upload your resume PDF and we'll automatically extract your work experience and education
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center mb-6 hover:border-violet transition-all">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="resume-file"
                  />
                  <label htmlFor="resume-file" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-3 text-violet" />
                    {resumeFile ? (
                      <span className="text-sm font-bold text-purple-deep">{resumeFile.name}</span>
                    ) : (
                      <>
                        <span className="text-violet font-bold hover:underline">Click to upload</span>
                        <p className="text-sm text-gray-500 mt-1">PDF only, max 10MB</p>
                      </>
                    )}
                  </label>
                </div>
                <div className="flex gap-4">
                  <Button3D
                    onClick={handleResumeUpload}
                    disabled={isUploadingResume || !resumeFile}
                    variant="primary"
                    icon="📤"
                  >
                    {isUploadingResume ? 'Uploading...' : 'Import Resume'}
                  </Button3D>
                  <Button3D
                    onClick={() => {
                      setShowResumeUpload(false);
                      setResumeFile(null);
                    }}
                    variant="secondary"
                    disabled={isUploadingResume}
                  >
                    Cancel
                  </Button3D>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabbed Interface */}
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="w-4 h-4" />
              Profile Info
            </TabsTrigger>
            <TabsTrigger value="experience">
              <Briefcase className="w-4 h-4" />
              Experience
            </TabsTrigger>
            <TabsTrigger value="education">
              <GraduationCap className="w-4 h-4" />
              Education
            </TabsTrigger>
            <TabsTrigger value="resume">
              <FileCheck className="w-4 h-4" />
              Resume
            </TabsTrigger>
            <TabsTrigger value="interview">
              <MessageSquare className="w-4 h-4" />
              Interview Prep
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Profile Info Tab */}
          <TabsContent value="profile">
            <Card className="rounded-3xl shadow-card-soft border-2 border-gray-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-extrabold text-purple-deep">Your Information 📝</CardTitle>
                  {!isEditing ? (
                    <Button3D
                      onClick={() => setIsEditing(true)}
                      variant="secondary"
                      icon={<Edit className="w-4 h-4" />}
                    >
                      Edit
                    </Button3D>
                  ) : (
                    <Button3D
                      onClick={() => {
                        setIsEditing(false);
                        // Reset to user data
                        setFirstName(user?.first_name || '');
                        setLastName(user?.last_name || '');
                        setPhone(user?.phone || '');
                        setStreetAddress(user?.street_address || '');
                        setCity(user?.city || '');
                        setState(user?.state || '');
                        setZipCode(user?.zip_code || '');
                        setBio(user?.bio || '');
                        setLocation(user?.location || '');
                        setLinkedInUrl(user?.linkedin_url || '');
                        setSkills(user?.skills ? (JSON.parse(user.skills) as string[]).join(', ') : '');
                        setAvatarFile(null);
                      }}
                      variant="secondary"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button3D>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-500 text-sm">First Name</Label>
                        <p className="text-gray-900 font-medium">{firstName || 'Not set'}</p>
                      </div>

                      <div>
                        <Label className="text-gray-500 text-sm">Last Name</Label>
                        <p className="text-gray-900 font-medium">{lastName || 'Not set'}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-500 text-sm">Phone</Label>
                      <p className="text-gray-900">{phone || 'Not set'}</p>
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
                      <p className="text-gray-900">
                        {streetAddress && city && state && zipCode
                          ? `${streetAddress}, ${city}, ${state} ${zipCode}`
                          : 'Not set'}
                      </p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
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
                      <Label htmlFor="streetAddress">Street Address</Label>
                      <Input
                        id="streetAddress"
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        placeholder="123 Main St"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="San Francisco"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <select
                          id="state"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select State</option>
                          {US_STATES.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="zipCode">Zip Code</Label>
                        <Input
                          id="zipCode"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          placeholder="94102"
                        />
                      </div>
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

                    <div className="flex justify-center pt-4">
                      <Button3D
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          handleSubmit(e as any);
                        }}
                        variant="primary"
                        icon="💾"
                        disabled={updateProfileMutation.isPending || updateProfileWithFileMutation.isPending}
                      >
                        {updateProfileMutation.isPending || updateProfileWithFileMutation.isPending
                          ? 'Saving...'
                          : 'Save Changes'}
                      </Button3D>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Experience Tab */}
          <TabsContent value="experience">
            <WorkExperience />
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education">
            <Education />
          </TabsContent>

          {/* Resume Tab */}
          <TabsContent value="resume">
            <ResumeTab />
          </TabsContent>

          {/* Interview Prep Tab */}
          <TabsContent value="interview">
            <InterviewQuestions />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
        </div>
      </div>

      <SuccessCelebration
        show={showCelebration}
        message="Profile Updated!"
        xpGained={xpEarned}
        onClose={() => setShowCelebration(false)}
      />
    </>
  );
}
