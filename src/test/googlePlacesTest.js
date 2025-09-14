// Quick test function for Google Places API that can be run in browser console

// Test function that can be copy-pasted into browser console
const testGooglePlacesAPI = async () => {
  try {
    console.log('🧪 Testing Google Places API integration...');

    // Test configuration
    const API_KEY = 'AIzaSyBASl19cUixNlE0TaapiIZuhQFalaq68_k';
    const BASE_URL = 'https://places.googleapis.com/v1/places';

    if (!API_KEY || API_KEY.length < 10) {
      console.error('❌ API key not configured properly');
      return false;
    }

    console.log('✅ API key configured');

    // Test 1: Autocomplete predictions
    console.log('\n1️⃣ Testing autocomplete predictions...');

    const requestBody = {
      input: 'Starbucks',
      includedPrimaryTypes: ['establishment'],
      regionCode: 'us',
      languageCode: 'en',
      includeQueryPredictions: true,
    };

    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}:autocomplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;
    console.log(`⏱️  Response time: ${responseTime}ms`);
    console.log(`📊 Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ API Error:', response.status, errorData);
      return false;
    }

    const data = await response.json();
    console.log('📥 Raw API Response:', data);

    // Process suggestions
    const suggestions = data.suggestions || [];
    const placePredictions = suggestions
      .filter((suggestion) => suggestion.placePrediction)
      .map((suggestion) => {
        const placePrediction = suggestion.placePrediction;
        return {
          text: placePrediction.text?.text || '',
          mainText: placePrediction.structuredFormat?.mainText?.text || '',
          secondaryText:
            placePrediction.structuredFormat?.secondaryText?.text || '',
          placeId: placePrediction.placeId,
        };
      });

    console.log(`✅ Found ${placePredictions.length} predictions:`);
    placePredictions.slice(0, 3).forEach((prediction, index) => {
      console.log(
        `   ${index + 1}. ${prediction.text} (ID: ${prediction.placeId})`
      );
    });

    // Test 2: Place details (if we got predictions)
    if (placePredictions.length > 0) {
      console.log('\n2️⃣ Testing place details...');
      const firstPrediction = placePredictions[0];

      const fieldMask = [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'types',
        'addressComponents',
      ].join(',');

      const detailsStartTime = Date.now();
      const detailsResponse = await fetch(
        `${BASE_URL}/${firstPrediction.placeId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': fieldMask,
          },
        }
      );

      const detailsResponseTime = Date.now() - detailsStartTime;
      console.log(`⏱️  Details response time: ${detailsResponseTime}ms`);
      console.log(`📊 Details response status: ${detailsResponse.status}`);

      if (detailsResponse.ok) {
        const placeDetails = await detailsResponse.json();
        console.log(
          '✅ Place details retrieved:',
          placeDetails.displayName?.text
        );
        console.log('📍 Address:', placeDetails.formattedAddress);
        console.log('🗺️  Location:', placeDetails.location);
      } else {
        console.error(
          '❌ Failed to get place details:',
          detailsResponse.status
        );
      }
    }

    console.log('\n🎉 Basic API test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
};

// Export for manual testing
console.log(`
📋 Google Places API Test Ready!

Copy and paste this into your browser console to test:

testGooglePlacesAPI();

Or run in Node.js environment with fetch polyfill.
`);

// Make available globally if in browser
if (typeof window !== 'undefined') {
  window.testGooglePlacesAPI = testGooglePlacesAPI;
}
