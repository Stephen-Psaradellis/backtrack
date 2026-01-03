// Empty mock module for react-native-maps on iOS
// Metro resolves react-native-maps imports to this file on iOS platform
// This prevents the app from trying to access native modules that don't exist

// Export null implementations for all react-native-maps exports
module.exports = {
  // Default export (the MapView component)
  default: function EmptyMapView() { return null; },

  // Named exports
  MapView: function EmptyMapView() { return null; },
  Marker: function EmptyMarker() { return null; },
  Callout: function EmptyCallout() { return null; },
  Polygon: function EmptyPolygon() { return null; },
  Polyline: function EmptyPolyline() { return null; },
  Circle: function EmptyCircle() { return null; },
  Overlay: function EmptyOverlay() { return null; },
  Heatmap: function EmptyHeatmap() { return null; },
  Geojson: function EmptyGeojson() { return null; },

  // Constants
  PROVIDER_GOOGLE: null,
  PROVIDER_DEFAULT: null,
  MAP_TYPES: {},

  // Types (for TypeScript compatibility)
  AnimatedRegion: function() {},
  UrlTile: function EmptyUrlTile() { return null; },
  WMSTile: function EmptyWMSTile() { return null; },
  LocalTile: function EmptyLocalTile() { return null; },
};
