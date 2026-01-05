import { useState, FormEvent } from 'react';
import { Navigation } from '../components/Navigation';
import { useAuth } from '../context/AuthContext';
import { useUpdateProfile, useUpdateProfileWithFile } from '../hooks/useProfile';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { WorkExperience } from '../components/WorkExperience';
import { Education } from '../components/Education';

export default function Profile() {
  const { user } = useAuth();
  const updateProfileMutation = useUpdateProfile();
  const updateProfileWithFileMutation = useUpdateProfileWithFile();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [skills, setSkills] = useState(
    user?.skills ? (JSON.parse(user.skills) as string[]).join(', ') : ''
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (avatarFile) {
      const formData = new FormData();
      formData.append('full_name', fullName);
      formData.append('bio', bio);
      formData.append('location', location);
      formData.append('skills', JSON.stringify(skills.split(',').map(s => s.trim()).filter(Boolean)));
      formData.append('avatar', avatarFile);
      await updateProfileWithFileMutation.mutateAsync(formData);
    } else {
      await updateProfileMutation.mutateAsync({
        full_name: fullName,
        bio,
        location,
        skills: skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      });
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-8">Profile</h1>

          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="San Francisco, CA"
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
