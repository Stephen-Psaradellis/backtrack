-- Backtrack Test Location Seed Data
-- Description: Sample location data at known distances from a center point for testing geospatial queries
-- Center Point: San Francisco Union Square (37.7879, -122.4074)
--
-- USAGE:
--   Run this script to populate test locations for geospatial query verification.
--   Use the verification queries at the bottom to confirm distances.
--
-- DISTANCES:
--   Locations are placed at approximately 0m, 500m, 1km, 2km, 5km, and 10km
--   from the center point in various cardinal directions.
--
-- COORDINATE CALCULATIONS (at latitude 37.79°):
--   1 km north/south ≈ 0.00899 degrees latitude
--   1 km east/west ≈ 0.01134 degrees longitude

-- ============================================================================
-- TEST CONSTANTS (for reference in test code)
-- ============================================================================
-- Center Point: 37.7879, -122.4074 (San Francisco Union Square)
-- Expected test locations: 12 total

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Clean up any existing test locations (using test_ prefix for safety)
DELETE FROM locations WHERE google_place_id LIKE 'test_%';

-- Center Location (0 km) - Union Square
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_center_0km',
  'Test Union Square',
  '333 Post St, San Francisco, CA 94108',
  37.7879,
  -122.4074,
  ARRAY['shopping_mall', 'point_of_interest']
);

-- ~500m North - Chinatown Gate
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_north_500m',
  'Test Chinatown Gate',
  'Grant Ave & Bush St, San Francisco, CA 94108',
  37.7924,  -- +0.0045 lat ≈ 500m north
  -122.4074,
  ARRAY['tourist_attraction', 'point_of_interest']
);

-- ~500m East - Financial District
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_east_500m',
  'Test Financial Coffee Shop',
  '200 Montgomery St, San Francisco, CA 94104',
  37.7879,
  -122.4017,  -- +0.0057 lon ≈ 500m east
  ARRAY['cafe', 'food']
);

-- ~1km South - South of Market
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_south_1km',
  'Test SoMa Gym',
  '450 Folsom St, San Francisco, CA 94105',
  37.7790,  -- -0.0089 lat ≈ 1km south
  -122.4074,
  ARRAY['gym', 'health']
);

-- ~1km West - Tenderloin
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_west_1km',
  'Test Tenderloin Market',
  '300 Hyde St, San Francisco, CA 94102',
  37.7879,
  -122.4188,  -- -0.0114 lon ≈ 1km west
  ARRAY['grocery_or_supermarket', 'food']
);

-- ~2km Northeast - North Beach
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_northeast_2km',
  'Test North Beach Pizzeria',
  '1556 Stockton St, San Francisco, CA 94133',
  37.8006,  -- +0.0127 lat ≈ 1.4km north
  -122.3914,  -- +0.0160 lon ≈ 1.4km east (combined ≈ 2km)
  ARRAY['restaurant', 'food']
);

-- ~2km Southwest - Hayes Valley
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_southwest_2km',
  'Test Hayes Valley Boutique',
  '450 Hayes St, San Francisco, CA 94102',
  37.7759,  -- -0.012 lat ≈ 1.3km south
  -122.4234,  -- -0.016 lon ≈ 1.4km west (combined ≈ 2km)
  ARRAY['clothing_store', 'store']
);

-- ~5km North - Marina District
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_north_5km',
  'Test Marina Fitness',
  '3120 Fillmore St, San Francisco, CA 94123',
  37.8328,  -- +0.0449 lat ≈ 5km north
  -122.4074,
  ARRAY['gym', 'health']
);

-- ~5km Southeast - Mission District
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_southeast_5km',
  'Test Mission Taqueria',
  '2889 Mission St, San Francisco, CA 94110',
  37.7561,  -- -0.0318 lat ≈ 3.5km south
  -122.3734,  -- +0.034 lon ≈ 3.5km east (combined ≈ 5km)
  ARRAY['restaurant', 'food']
);

-- ~10km Southwest - Daly City
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_southwest_10km',
  'Test Daly City Mall',
  '100 Serramonte Center, Daly City, CA 94015',
  37.7016,  -- -0.0863 lat ≈ 9.6km south
  -122.4440,  -- -0.0366 lon ≈ 3.2km west (combined ≈ 10km)
  ARRAY['shopping_mall', 'store']
);

-- ~10km North - Sausalito (across Golden Gate)
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_north_10km',
  'Test Sausalito Cafe',
  '660 Bridgeway, Sausalito, CA 94965',
  37.8777,  -- +0.0898 lat ≈ 10km north
  -122.4074,
  ARRAY['cafe', 'food']
);

-- ~15km (outside typical radius) - Oakland
INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_east_15km',
  'Test Oakland Bookstore',
  '1491 Shattuck Ave, Berkeley, CA 94709',
  37.8800,  -- +0.0921 lat ≈ 10.2km north
  -122.2700,  -- +0.1374 lon ≈ 12km east (combined ≈ 15km+)
  ARRAY['book_store', 'store']
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify distances from the center point (37.7879, -122.4074)

-- Query 1: Get all test locations with calculated distances
-- Expected: 12 locations with distances ranging from 0 to ~15km
/*
SELECT
  google_place_id,
  name,
  ST_Distance(
    ST_SetSRID(ST_MakePoint(-122.4074, 37.7879), 4326)::geography,
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) AS distance_meters
FROM locations
WHERE google_place_id LIKE 'test_%'
ORDER BY distance_meters ASC;
*/

-- Query 2: Test get_nearby_locations with 1km radius
-- Expected: 4 locations (center, north_500m, east_500m, south_1km or west_1km edge cases)
/*
SELECT name, distance_meters
FROM get_nearby_locations(37.7879, -122.4074, 1000, 50)
WHERE google_place_id LIKE 'test_%';
*/

-- Query 3: Test get_nearby_locations with 5km radius
-- Expected: 9 locations (all except 10km+ locations)
/*
SELECT name, distance_meters
FROM get_nearby_locations(37.7879, -122.4074, 5000, 50)
WHERE google_place_id LIKE 'test_%';
*/

-- Query 4: Test get_nearby_locations with 10km radius
-- Expected: 11 locations (all except 15km+ Oakland location)
/*
SELECT name, distance_meters
FROM get_nearby_locations(37.7879, -122.4074, 10000, 50)
WHERE google_place_id LIKE 'test_%';
*/

-- ============================================================================
-- EXPECTED RESULTS SUMMARY
-- ============================================================================
-- Location                    | Approximate Distance
-- ----------------------------|---------------------
-- test_center_0km            | 0 m
-- test_north_500m            | ~500 m
-- test_east_500m             | ~500 m
-- test_south_1km             | ~1,000 m
-- test_west_1km              | ~1,000 m
-- test_northeast_2km         | ~2,000 m
-- test_southwest_2km         | ~2,000 m
-- test_north_5km             | ~5,000 m
-- test_southeast_5km         | ~5,000 m
-- test_southwest_10km        | ~10,000 m
-- test_north_10km            | ~10,000 m
-- test_east_15km             | ~15,000+ m (outside standard radius)
