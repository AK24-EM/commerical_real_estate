-- Floor Plans Table Migration
-- Creates table for storing floor plan data with measurements and room details

CREATE TABLE IF NOT EXISTS floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  type VARCHAR(50) DEFAULT 'raster' CHECK (type IN ('raster', 'vector')),
  measurements JSONB DEFAULT '[]',
  rooms JSONB DEFAULT '[]',
  scale DECIMAL(10, 4) NOT NULL DEFAULT 1.0,
  image_width DECIMAL(10, 2) NOT NULL,
  image_height DECIMAL(10, 2) NOT NULL,
  total_area DECIMAL(10, 2) NOT NULL,
  floor_label VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_floor_plans_property_id ON floor_plans(property_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_created_at ON floor_plans(created_at);

-- GIN index for JSONB columns to enable fast searches
CREATE INDEX IF NOT EXISTS idx_floor_plans_measurements ON floor_plans USING GIN (measurements);
CREATE INDEX IF NOT EXISTS idx_floor_plans_rooms ON floor_plans USING GIN (rooms);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_floor_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_floor_plans_updated_at
  BEFORE UPDATE ON floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_floor_plans_updated_at();

-- Sample data insert (optional - for demo/testing)
/*
INSERT INTO floor_plans (
  property_id,
  image_url,
  type,
  scale,
  image_width,
  image_height,
  total_area,
  floor_label,
  measurements,
  rooms
) VALUES (
  (SELECT id FROM properties LIMIT 1), -- Replace with actual property ID
  'https://via.placeholder.com/800x600/f0f0f0/333333?text=Floor+Plan',
  'raster',
  10.0,
  800,
  600,
  2500,
  '3rd Floor',
  '[
    {
      "id": "m1",
      "label": "Width",
      "startPoint": {"x": 100, "y": 100},
      "endPoint": {"x": 700, "y": 100},
      "lengthFeet": 60,
      "labelPosition": "top",
      "type": "horizontal"
    },
    {
      "id": "m2",
      "label": "Length",
      "startPoint": {"x": 100, "y": 100},
      "endPoint": {"x": 100, "y": 500},
      "lengthFeet": 40,
      "labelPosition": "left",
      "type": "vertical"
    }
  ]'::jsonb,
  '[
    {
      "id": "r1",
      "name": "Reception",
      "type": "reception",
      "position": {"x": 100, "y": 200},
      "widthFeet": 15,
      "heightFeet": 20,
      "areaSqFt": 300,
      "features": {"doors": 2, "windows": 1}
    },
    {
      "id": "r2",
      "name": "Open Work Area",
      "type": "office",
      "position": {"x": 250, "y": 100},
      "widthFeet": 40,
      "heightFeet": 30,
      "areaSqFt": 1200,
      "features": {"windows": 4, "outlets": 20}
    }
  ]'::jsonb
);
*/

COMMENT ON TABLE floor_plans IS 'Stores floor plan images and measurements for commercial properties';
COMMENT ON COLUMN floor_plans.scale IS 'Conversion factor from pixels to feet (e.g., 10 means 10 pixels = 1 foot)';
COMMENT ON COLUMN floor_plans.measurements IS 'Array of measurement lines with coordinates and dimensions';
COMMENT ON COLUMN floor_plans.rooms IS 'Array of room/area definitions with boundaries and features';
COMMENT ON COLUMN floor_plans.type IS 'Floor plan type: raster (image) or vector (SVG/CAD)';
