const { fetchNIHPolicyNotices } = require('./fetch_external_sources');

async function testNIHFetch() {
  console.log('Testing NIH policy notice fetcher...');
  
  // For testing, set environment to ensure sample data is used
  process.env.USE_SAMPLE_DATA = 'true';
  
  try {
    const result = await fetchNIHPolicyNotices();
    console.log(`Found ${result.length} NIH policy notices`);
    
    if (result.length > 0) {
      console.log('Sample of NIH policy notice data:');
      console.log(JSON.stringify(result[0], null, 2));
    }
    
    console.log('NIH fetcher test complete');
  } catch (err) {
    console.error('Error in NIH fetcher test:', err);
  }
}

testNIHFetch();
