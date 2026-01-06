// Temporary script to import Wisconsin jobs
// Run with: node import-wisconsin-jobs.js

const searchQueries = [
  'software engineer Wisconsin',
  'software engineer Madison',
  'web developer Wisconsin',
  'web developer Madison',
  'frontend engineer Wisconsin',
  'backend engineer Wisconsin',
  'full stack developer Wisconsin',
  'devops engineer Wisconsin',
  'data analyst Wisconsin',
  'software developer Madison WI'
];

async function importWisconsinJobs() {
  console.log('Starting Wisconsin job import...');
  console.log(`Will search for ${searchQueries.length} queries:`);
  searchQueries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

  for (const query of searchQueries) {
    try {
      console.log(`\n📍 Searching: "${query}"`);

      const response = await fetch(
        `https://gethiredpoc-api.carl-f-frank.workers.dev/api/admin/import-jobs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            queries: [query]
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${result.imported || 0} imported, ${result.updated || 0} updated`);
      } else {
        const error = await response.text();
        console.log(`❌ Error: ${error}`);
      }

      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
    }
  }

  console.log('\n✅ Import process complete!');
}

importWisconsinJobs().catch(console.error);
