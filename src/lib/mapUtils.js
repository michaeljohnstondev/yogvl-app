import { Linking, Alert, Platform } from 'react-native';

export const mapUtils = {
  openMapsWithLocation(location, address) {
    if (!location && !address) {
      Alert.alert('No Location', 'This event does not have a location specified.');
      return;
    }

    try {
      const query = this.formatLocationQuery(location, address);
      const encodedQuery = encodeURIComponent(query);

      let mapsUrl;

      if (Platform.OS === 'ios') {
        // Use Apple Maps on iOS
        mapsUrl = `http://maps.apple.com/?q=${encodedQuery}`;
      } else {
        // Use Google Maps on Android
        mapsUrl = `https://maps.google.com/maps?q=${encodedQuery}`;
      }

      return Linking.openURL(mapsUrl);
    } catch (error) {
      console.error('[MapUtils] Error opening maps:', error);
      Alert.alert('Error', 'Unable to open maps application');
    }
  },

  formatLocationQuery(location, address) {
    if (!location && !address) {
      return '';
    }

    if (location && address) {
      return `${location}, ${address}`.trim();
    }

    return (location || address).trim();
  },

  async canOpenMaps() {
    try {
      const urls = [
        'http://maps.apple.com/',
        'https://maps.google.com/',
        'comgooglemaps://', // Google Maps app
      ];

      for (const url of urls) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('[MapUtils] Error checking map availability:', error);
      return false;
    }
  },

  openDirections(startLocation, endLocation, endAddress) {
    if (!endLocation && !endAddress) {
      Alert.alert('No Destination', 'Cannot provide directions without a destination.');
      return;
    }

    try {
      const destination = this.formatLocationQuery(endLocation, endAddress);
      const encodedDestination = encodeURIComponent(destination);

      let directionsUrl;

      if (Platform.OS === 'ios') {
        if (startLocation) {
          const encodedStart = encodeURIComponent(startLocation);
          directionsUrl = `http://maps.apple.com/?saddr=${encodedStart}&daddr=${encodedDestination}&dirflg=d`;
        } else {
          directionsUrl = `http://maps.apple.com/?daddr=${encodedDestination}&dirflg=d`;
        }
      } else {
        if (startLocation) {
          const encodedStart = encodeURIComponent(startLocation);
          directionsUrl = `https://maps.google.com/maps?saddr=${encodedStart}&daddr=${encodedDestination}`;
        } else {
          directionsUrl = `https://maps.google.com/maps?daddr=${encodedDestination}`;
        }
      }

      return Linking.openURL(directionsUrl);
    } catch (error) {
      console.error('[MapUtils] Error opening directions:', error);
      Alert.alert('Error', 'Unable to open directions');
    }
  },

  validateLocationData(location, address) {
    const errors = [];

    if (!location && !address) {
      errors.push('Either location or address is required');
    }

    if (location && typeof location !== 'string') {
      errors.push('Location must be a string');
    }

    if (address && typeof address !== 'string') {
      errors.push('Address must be a string');
    }

    if (location && location.length > 100) {
      errors.push('Location name is too long (max 100 characters)');
    }

    if (address && address.length > 200) {
      errors.push('Address is too long (max 200 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  formatLocationForDisplay(location, address, maxLength = 50) {
    const fullLocation = this.formatLocationQuery(location, address);

    if (!fullLocation) {
      return 'Location TBD';
    }

    if (fullLocation.length <= maxLength) {
      return fullLocation;
    }

    // Try to truncate address first, keep location name
    if (location && address) {
      if (location.length <= maxLength - 3) {
        const remainingLength = maxLength - location.length - 5; // Account for ", ..."
        if (remainingLength > 5) {
          return `${location}, ${address.substring(0, remainingLength)}...`;
        } else {
          return `${location}...`;
        }
      }
    }

    // If single field is too long, truncate it
    return fullLocation.substring(0, maxLength - 3) + '...';
  },

  parseCoordinates(coordinateString) {
    if (!coordinateString) {
      return null;
    }

    try {
      // Handle various coordinate formats
      const cleanString = coordinateString.trim();

      // Format: "lat,lng" or "lat, lng"
      const basicFormat = cleanString.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (basicFormat) {
        return {
          latitude: parseFloat(basicFormat[1]),
          longitude: parseFloat(basicFormat[2]),
        };
      }

      // Format: "latitude: xx, longitude: yy"
      const namedFormat = cleanString.match(/latitude:\s*(-?\d+\.?\d*),?\s*longitude:\s*(-?\d+\.?\d*)/i);
      if (namedFormat) {
        return {
          latitude: parseFloat(namedFormat[1]),
          longitude: parseFloat(namedFormat[2]),
        };
      }

      return null;
    } catch (error) {
      console.error('[MapUtils] Error parsing coordinates:', error);
      return null;
    }
  },

  openWithCoordinates(latitude, longitude, label = 'Event Location') {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      Alert.alert('Invalid Coordinates', 'Cannot open maps with invalid coordinates');
      return;
    }

    try {
      let mapsUrl;

      if (Platform.OS === 'ios') {
        mapsUrl = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(label)}`;
      } else {
        mapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}(${encodeURIComponent(label)})`;
      }

      return Linking.openURL(mapsUrl);
    } catch (error) {
      console.error('[MapUtils] Error opening maps with coordinates:', error);
      Alert.alert('Error', 'Unable to open maps application');
    }
  },

  getDistanceFromCoordinates(lat1, lon1, lat2, lon2) {
    // Calculate distance using Haversine formula
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    return distance;
  },

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  },

  formatDistance(distanceKm) {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m away`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km away`;
    } else {
      return `${Math.round(distanceKm)}km away`;
    }
  },
};