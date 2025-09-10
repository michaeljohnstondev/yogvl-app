# Google Places API (New) Integration

This document explains the **Google Places API (New)** integration for automatic address lookup in the BVS app.

## Overview

The integration uses the **latest Google Places API (New)** which provides:
- **30-47% cost savings** compared to the legacy API
- **Better performance** and more accurate results
- **Field masking** to minimize costs
- **Modern JSON-based requests** with improved error handling

### Fallback Strategy
1. **Google Places API (New)** - Primary source for public locations
2. **Firebase Venues Database** - Cached popular venues  
3. **Local Hardcoded Database** - Greenville area locations
4. **Manual Entry** - Fallback for personal/unknown locations

## Setup Instructions

### 1. Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Places API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Restrict the API key to:
   - **Application restrictions**: HTTP referrers or Android apps
   - **API restrictions**: Places API

### 2. Configure API Key

Add your API key to the configuration:

**Option A: Environment Variable (Recommended for production)**
```bash
export EXPO_PUBLIC_GOOGLE_PLACES_API_KEY="your_api_key_here"
```

**Option B: Direct Configuration (Development only)**
Update `src/config/googlePlaces.js`:
```javascript
export const GOOGLE_PLACES_API_KEY = 'your_api_key_here';
```

### 3. Set Up Billing

Google Places API requires billing to be enabled:
1. Go to **Billing** in Google Cloud Console
2. Link a payment method
3. Set up billing alerts at $50 and $100

## Usage

The integration works automatically in the event creation form:

```javascript
// In CreateEventScreen or EditEventScreen
const {
  handleFieldChange,
  handleSuggestionSelect,
  getFieldData,
} = useSmartAutoComplete(
  {
    location: {
      enableLocationLookup: true,
      showSuggestionsOnFocus: true,
      showSuggestionsOnChange: true,
      minCharsForSuggestions: 3,
    }
  },
  handleGooglePlaceSelection // Callback when place is selected
);
```

## API Usage and Costs

### Request Types and Pricing (as of 2024)
- **Autocomplete**: $2.83 per 1000 requests
- **Place Details**: $17.00 per 1000 requests  
- **Nearby Search**: $32.00 per 1000 requests

### Usage Optimization
- **Caching**: Results cached for 1 hour (configurable)
- **Rate Limiting**: 300ms minimum between requests
- **Debouncing**: Search triggered after user stops typing
- **Fallbacks**: Reduces API usage when places not found

### Monitoring Usage
```javascript
import { LocationAnalytics } from '../lib/locationAnalytics';

// Get usage statistics
const stats = await LocationAnalytics.getUsageStats(30); // Last 30 days
console.log('Google Places usage:', stats.googlePlacesQuota);
```

## Configuration

### Environment-Specific Settings

**Development:**
```javascript
// config/googlePlaces.js
const developmentConfig = {
  minRequestInterval: 300,     // 300ms between requests
  cacheDuration: 900000,       // 15 minutes cache
  maxAutocompleteResults: 5,
  debounceDelay: 300
};
```

**Production:**
```javascript
const productionConfig = {
  minRequestInterval: 500,     // 500ms between requests (slower)
  cacheDuration: 7200000,      // 2 hours cache
  maxAutocompleteResults: 3,   // Fewer results to save costs
  debounceDelay: 500
};
```

### Search Options
```javascript
// Default autocomplete options
const options = {
  types: 'establishment',      // Focus on businesses
  components: 'country:us',    // Limit to US
  language: 'en',
  region: 'us'
};
```

## Error Handling

The integration includes comprehensive error handling:

### Error Types
- **API_KEY_ERROR**: Invalid or missing API key
- **QUOTA_EXCEEDED**: Daily/monthly limits reached
- **NETWORK_ERROR**: Connection issues
- **INVALID_REQUEST**: Malformed request
- **ZERO_RESULTS**: No places found

### Fallback Strategy
```
Google Places API fails
    ↓
Firebase Venues Database
    ↓
Local Hardcoded Database
    ↓
Manual Address Entry
```

### User Messages
- ✅ **Success**: Address auto-populated
- ⚠️ **Fallback**: "Using local database"
- ❌ **Error**: "Please enter address manually"

## Privacy and Personal Locations

The system automatically detects and skips API calls for personal locations:

### Personal Location Patterns
- "my house", "friend's place"
- "home", "apartment"
- Street addresses without business names
- Possessive indicators ("mom's house")

These locations bypass Google Places to protect user privacy.

## Files Structure

```
src/
├── config/
│   └── googlePlaces.js          # API configuration
├── services/
│   ├── GooglePlacesService.js   # Main API service
│   └── VenueService.js          # Firebase venues fallback
├── lib/
│   ├── locationUtils.js         # Location handling utilities
│   ├── locationErrorHandler.js  # Error handling
│   └── locationAnalytics.js     # Usage tracking
├── events/
│   ├── hooks/
│   │   └── useSmartAutoComplete.js # Autocomplete hook
│   └── components/where/
│       └── Where.js             # Location input component
```

## Testing

### Manual Testing
1. Enter "Starbucks" in location field
2. Select from autocomplete suggestions
3. Verify address auto-populates
4. Test with personal location ("my house") - should not trigger API

### Error Testing
1. Set invalid API key → should fallback gracefully
2. Disconnect network → should show appropriate error
3. Enter unknown location → should fallback to manual entry

### Performance Testing
```javascript
import { LocationAnalytics } from '../lib/locationAnalytics';

// Check performance metrics
const metrics = await LocationAnalytics.getPerformanceMetrics();
console.log('Cache hit rate:', metrics.cacheHitRate + '%');
console.log('Average response time:', metrics.averageResponseTimes);
```

## Troubleshooting

### Common Issues

**1. "Location search is temporarily unavailable"**
- Check API key configuration
- Verify billing is enabled
- Check API restrictions

**2. No suggestions appearing**
- Ensure minimum 3 characters entered
- Check network connection
- Verify Places API is enabled

**3. Quota exceeded warnings**
- Check usage in Google Cloud Console
- Review analytics: `LocationAnalytics.getUsageStats()`
- Consider increasing rate limiting delays

### Debug Logging
Enable detailed logging in development:
```javascript
// In GooglePlacesService.js
console.log('[GooglePlacesService] API request:', { input, options });
console.log('[GooglePlacesService] API response:', data);
```

### Analytics Dashboard
View usage analytics:
```javascript
const stats = await LocationAnalytics.getUsageStats(7);
console.table(stats.serviceBreakdown);
```

## Security Best Practices

1. **API Key Security**
   - Use environment variables in production
   - Restrict API key to specific domains/apps
   - Enable HTTP referrer restrictions

2. **Rate Limiting**
   - Implement request delays
   - Use client-side debouncing
   - Cache results aggressively

3. **Privacy Protection**
   - Skip API calls for personal locations
   - Don't log sensitive location data
   - Allow manual address entry

## Future Enhancements

### Planned Features
- [ ] Nearby places suggestions
- [ ] Place photos integration
- [ ] Opening hours display
- [ ] Distance calculations
- [ ] Favorite locations caching
- [ ] Offline location suggestions

### Optimization Opportunities
- [ ] Implement request batching
- [ ] Add more specific place types
- [ ] Improve caching strategy
- [ ] Add A/B testing for UI

---

For questions or issues, check the console logs and analytics data first, then refer to Google Places API documentation.