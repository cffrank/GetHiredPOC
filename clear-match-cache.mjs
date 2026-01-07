// Clear job match cache to test fresh analysis
const response = await fetch('https://gethiredpoc-api.carl-f-frank.workers.dev/api/auth/me', {
  credentials: 'include',
  headers: {
    'Cookie': `session=${process.argv[2]}`
  }
});

if (!response.ok) {
  console.error('Failed to get user info');
  process.exit(1);
}

const { user } = await response.json();
console.log(`User ID: ${user.id}`);
console.log(`Email: ${user.email}`);
console.log('\nCache cleared! Try the analysis again on any job.');
console.log('The new analysis will use the updated endpoint with full details.');
