-- Insert test location for check-in testing
-- This location is at Union Square, San Francisco

INSERT INTO locations (google_place_id, name, address, latitude, longitude, place_types)
VALUES (
  'test_union_square_checkin',
  'Test Union Square',
  '333 Post St, San Francisco, CA 94108',
  37.7879,
  -122.4074,
  ARRAY['shopping_mall', 'point_of_interest']
)
ON CONFLICT (google_place_id) DO NOTHING;
