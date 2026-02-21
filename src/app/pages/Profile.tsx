// SECURITY: Resume fields rendered via React JSX expressions — React auto-escapes HTML entities (render-time sanitization)
"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/app/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Label } from "@/app/components/ui/Label";
import { Badge } from "@/app/components/ui/Badge";
import { ErrorBoundary, ErrorFallback } from "@/app/components/ErrorBoundary";
import { toast } from "@/app/components/Toast";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  skills: string | null;
  avatar_url: string | null;
}

function ProfileContent() {
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsedResume, setParsedResume] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const response = await fetch("/api/profile");
    if (response.ok) {
      const data = await response.json();
      const profile = data.profile;
      setUser(profile);
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      const skills = profile.skills ? JSON.parse(profile.skills) : [];
      setSkillsInput(skills.join(", "));
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        bio,
        location,
        skills: JSON.stringify(skills),
      }),
    });

    if (response.ok) {
      await loadProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  const handleLinkedInImport = () => {
    window.location.href = "/api/linkedin/initiate";
  };

  const handleResumeUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resumeFile) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("resume", resumeFile);

    try {
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setParsedResume(data.data);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to parse resume", {
          duration: 5000,
          action: { label: "Retry", onClick: () => handleResumeUpload() },
        });
      }
    } catch (error) {
      toast.error("Failed to upload resume", { duration: 5000 });
    }
    setImporting(false);
  };

  const handleConfirmResume = async () => {
    if (!parsedResume) return;

    setImporting(true);
    try {
      const response = await fetch("/api/resume/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedResume }),
      });

      if (response.ok) {
        setShowResumeModal(false);
        setParsedResume(null);
        setResumeFile(null);
        await loadProfile();
        toast.success("Resume data imported successfully!", { duration: 3000 });
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save resume data", { duration: 5000 });
      }
    } catch (error) {
      toast.error("Failed to save resume data", { duration: 5000 });
    }
    setImporting(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-96 animate-pulse bg-[hsl(var(--muted))] rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">Please log in to view your profile</p>
        <a href="/login">
          <Button className="mt-4">Log in</Button>
        </a>
      </div>
    );
  }

  const skills = user.skills ? JSON.parse(user.skills) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl">{user.full_name || "Complete Your Profile"}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
            <div className="flex gap-2">
              {!editing && (
                <>
                  <Button onClick={handleLinkedInImport} variant="outline" size="sm">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    Import from LinkedIn
                  </Button>
                  <Button onClick={() => setShowResumeModal(true)} variant="outline" size="sm">
                    Import Resume
                  </Button>
                  <Button onClick={() => setEditing(true)}>Edit Profile</Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="flex w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))]"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <Input
                  id="skills"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="Comma-separated (e.g. React, Node.js, Python)"
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Used for AI job matching analysis
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    loadProfile();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {user.bio && (
                <div>
                  <h3 className="font-semibold mb-2">Bio</h3>
                  <p className="text-[hsl(var(--muted-foreground))]">{user.bio}</p>
                </div>
              )}

              {user.location && (
                <div>
                  <h3 className="font-semibold mb-2">Location</h3>
                  <p className="text-[hsl(var(--muted-foreground))]">{user.location}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Skills</h3>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill: string, i: number) => (
                      <Badge key={i} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-[hsl(var(--muted-foreground))] text-sm">
                    No skills added yet. Add skills to get better job matches!
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resume Upload Modal */}
      {showResumeModal && (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Import Resume</CardTitle>
                <CardDescription>
                  Upload your resume (PDF, TXT, DOC, or DOCX) and we'll extract your information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!parsedResume ? (
                  <form onSubmit={handleResumeUpload} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resume">Resume File</Label>
                      <Input
                        id="resume"
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        required
                      />
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Maximum file size: 5MB
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={!resumeFile || importing}>
                        {importing ? "Parsing..." : "Parse Resume"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowResumeModal(false);
                          setResumeFile(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-[hsl(var(--muted))] rounded-lg">
                      <h4 className="font-semibold mb-2">Parsed Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Name:</strong> {parsedResume.name}</p>
                        <p><strong>Email:</strong> {parsedResume.email}</p>
                        <p><strong>Location:</strong> {parsedResume.location}</p>
                        <p><strong>Headline:</strong> {parsedResume.headline}</p>
                        <div>
                          <strong>Work Experience:</strong> {parsedResume.workExperience?.length || 0} positions
                        </div>
                        <div>
                          <strong>Education:</strong> {parsedResume.education?.length || 0} degrees
                        </div>
                        <div>
                          <strong>Skills:</strong> {parsedResume.skills?.join(", ")}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleConfirmResume} disabled={importing}>
                        {importing ? "Saving..." : "Confirm & Import"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setParsedResume(null);
                          setResumeFile(null);
                        }}
                      >
                        Re-upload
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowResumeModal(false);
                          setParsedResume(null);
                          setResumeFile(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}

export function Profile() {
  return (
    <>
      <Navigation />
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ProfileContent />
      </ErrorBoundary>
    </>
  );
}
