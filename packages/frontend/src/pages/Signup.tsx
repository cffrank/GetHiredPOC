import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigation } from '../components/Navigation';
import { Button3D } from '../components/ui/Button3D';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { FloatingShapesBackground } from '../components/effects/FloatingShapesBackground';
import { US_STATES, validatePhone, validateZipCode } from '../lib/constants';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedToS, setAcceptedToS] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!validatePhone(phone)) {
      setError('Please enter a valid phone number (10 or 11 digits)');
      return;
    }

    if (!validateZipCode(zipCode)) {
      setError('Please enter a valid zip code (12345 or 12345-6789)');
      return;
    }

    if (!state) {
      setError('Please select a state');
      return;
    }

    setIsLoading(true);

    try {
      await signup(
        email,
        password,
        firstName,
        lastName,
        phone,
        streetAddress,
        city,
        state,
        zipCode
      );
      navigate('/profile');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <FloatingShapesBackground />
      <div className="relative z-10 min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-3xl rounded-3xl shadow-card-soft border-2 border-gray-100">
          <CardHeader>
            <CardTitle className="text-3xl font-extrabold text-purple-deep">Create Account 🚀</CardTitle>
            <CardDescription className="text-lg">Start your 14-day FREE PRO trial - no credit card required</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Trial Banner */}
            <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl shadow-3d-sm">
              <div className="flex items-center gap-3 text-green-800 font-bold mb-2 text-lg">
                <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center text-white">
                  ✓
                </div>
                14-Day FREE PRO Trial Included
              </div>
              <p className="text-sm text-green-700 font-medium">
                Get unlimited access to all features. No payment required to start!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
              )}

              {/* Two-column grid for form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="John"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Doe"
                  />
                </div>

                {/* Email - Full width */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </div>

                {/* Password - Full width */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={8}
                  />
                  <p className="text-xs text-gray-500">Minimum 8 characters</p>
                </div>

                {/* Phone - Full width */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="(555) 123-4567"
                  />
                  <p className="text-xs text-gray-500">10 or 11 digits</p>
                </div>

                {/* Street Address - Full width */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="streetAddress">Street Address *</Label>
                  <Input
                    id="streetAddress"
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    required
                    placeholder="123 Main St"
                  />
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    placeholder="San Francisco"
                  />
                </div>

                {/* State */}
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
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

                {/* Zip Code */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="zipCode">Zip Code *</Label>
                  <Input
                    id="zipCode"
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required
                    placeholder="94102"
                    pattern="^\d{5}(-\d{4})?$"
                  />
                  <p className="text-xs text-gray-500">5 digits or 5+4 format (e.g., 12345 or 12345-6789)</p>
                </div>
              </div>

              {/* Terms and Privacy Checkboxes */}
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <input
                    id="accept-tos"
                    type="checkbox"
                    checked={acceptedToS}
                    onChange={(e) => setAcceptedToS(e.target.checked)}
                    className="mt-1 h-5 w-5 text-violet border-gray-300 rounded-md focus:ring-violet"
                    required
                  />
                  <label htmlFor="accept-tos" className="text-sm text-gray-700 font-medium">
                    I agree to the{' '}
                    <Link to="/terms-of-service" target="_blank" className="text-violet hover:underline font-bold">
                      Terms of Service
                    </Link>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    id="accept-privacy"
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="mt-1 h-5 w-5 text-violet border-gray-300 rounded-md focus:ring-violet"
                    required
                  />
                  <label htmlFor="accept-privacy" className="text-sm text-gray-700 font-medium">
                    I agree to the{' '}
                    <Link to="/privacy-policy" target="_blank" className="text-violet hover:underline font-bold">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button3D
                  onClick={(e) => {
                    e?.preventDefault();
                    handleSubmit(e as any);
                  }}
                  variant="primary"
                  icon="🎉"
                  disabled={isLoading || !acceptedToS || !acceptedPrivacy}
                >
                  {isLoading ? 'Creating account...' : 'Start Free Trial'}
                </Button3D>
              </div>
              <p className="text-sm text-center text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-violet hover:underline font-bold">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
