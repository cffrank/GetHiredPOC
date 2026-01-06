// Test script to import Wisconsin jobs
// This tests the Adzuna import with Wisconsin-specific queries

const wisconsinQueries = [
  'software engineer Wisconsin',
  'software engineer Madison',
  'web developer Wisconsin',
  'web developer Madison',
  'frontend engineer Wisconsin',
  'frontend developer Madison',
  'backend engineer Wisconsin',
  'full stack developer Wisconsin',
  'full stack developer Madison',
  'devops engineer Wisconsin',
  'data engineer Wisconsin'
];

console.log('Testing Wisconsin job import...');
console.log(`Will test ${wisconsinQueries.length} queries:\n`);

wisconsinQueries.forEach((q, i) => {
  console.log(`  ${i + 1}. ${q}`);
});

console.log('\n📍 This demonstrates the queries that will be used.');
console.log('📍 The scheduled worker runs daily at 1 AM UTC.');
console.log('📍 When it runs, it will generate location-specific queries from user preferences.');
console.log('📍 Since users have "Madison, WI" in their preferences, Wisconsin jobs will be imported automatically.\n');

console.log('✅ To manually trigger an import now, you can:');
console.log('   1. Use the admin dashboard (when Phase 5 is complete)');
console.log('   2. Call POST /api/admin/import-jobs with these queries');
console.log('   3. Wait for the nightly scheduled job at 1 AM UTC\n');

console.log('Example curl command (requires admin authentication):');
console.log(`
curl -X POST https://gethiredpoc-api.carl-f-frank.workers.dev/api/admin/import-jobs \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session=YOUR_ADMIN_SESSION_COOKIE" \\
  -d '{
    "queries": ${JSON.stringify(wisconsinQueries, null, 4)}
  }'
`);
