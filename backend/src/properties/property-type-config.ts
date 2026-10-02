export interface PropertyTypeFilterConfig {
  type: string;
  displayName: string;
  attributes: AttributeConfig[];
}

export interface AttributeConfig {
  key: string;
  displayName: string;
  type: 'number' | 'boolean' | 'string' | 'range' | 'select';
  filterable: boolean;
  required?: boolean;
  options?: string[]; // For select type
  min?: number; // For range type
  max?: number; // For range type
  unit?: string; // Display unit for numbers
}

export const PROPERTY_TYPE_CONFIGS: PropertyTypeFilterConfig[] = [
  {
    type: 'office',
    displayName: 'Office Space',
    attributes: [
      {
        key: 'floorPlateSize',
        displayName: 'Floor Plate Size',
        type: 'range',
        filterable: true,
        min: 500,
        max: 50000,
        unit: 'sq ft',
      },
      {
        key: 'elevatorCount',
        displayName: 'Elevator Count',
        type: 'number',
        filterable: true,
        min: 0,
        max: 20,
      },
      {
        key: 'hasCentralAc',
        displayName: 'Central AC',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'hasFireSuppression',
        displayName: 'Fire Suppression',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'floorNumber',
        displayName: 'Floor Number',
        type: 'select',
        filterable: true,
        options: ['Ground', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'],
      },
      {
        key: 'parkingSpaces',
        displayName: 'Parking Spaces',
        type: 'number',
        filterable: true,
        min: 0,
        max: 100,
      },
    ],
  },
  {
    type: 'retail',
    displayName: 'Retail Outlet',
    attributes: [
      {
        key: 'frontageWidth',
        displayName: 'Frontage Width',
        type: 'range',
        filterable: true,
        min: 10,
        max: 200,
        unit: 'ft',
      },
      {
        key: 'footfall',
        displayName: 'Footfall',
        type: 'range',
        filterable: true,
        min: 100,
        max: 100000,
        unit: 'visitors/day',
      },
      {
        key: 'hasCornerLocation',
        displayName: 'Corner Location',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'anchorTenant',
        displayName: 'Anchor Tenant Nearby',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'storefrontType',
        displayName: 'Storefront Type',
        type: 'select',
        filterable: true,
        options: ['Mall', 'High Street', 'Community Center', 'Standalone'],
      },
    ],
  },
  {
    type: 'warehouse',
    displayName: 'Warehouse',
    attributes: [
      {
        key: 'dockHeight',
        displayName: 'Dock Height',
        type: 'range',
        filterable: true,
        min: 8,
        max: 40,
        unit: 'ft',
      },
      {
        key: 'loadingDocks',
        displayName: 'Loading Docks',
        type: 'number',
        filterable: true,
        min: 0,
        max: 20,
      },
      {
        key: 'hasSprinklerSystem',
        displayName: 'Sprinkler System',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'hasColdStorage',
        displayName: 'Cold Storage',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'truckTurningRadius',
        displayName: 'Truck Turning Radius',
        type: 'range',
        filterable: true,
        min: 20,
        max: 100,
        unit: 'ft',
      },
      {
        key: 'ceilingHeight',
        displayName: 'Ceiling Height',
        type: 'range',
        filterable: true,
        min: 15,
        max: 60,
        unit: 'ft',
      },
    ],
  },
  {
    type: 'industrial',
    displayName: 'Industrial Hub',
    attributes: [
      {
        key: 'powerCapacity',
        displayName: 'Power Capacity',
        type: 'range',
        filterable: true,
        min: 50,
        max: 1000,
        unit: 'KVA',
      },
      {
        key: 'hasHeavyMachineryAccess',
        displayName: 'Heavy Machinery Access',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'hasEffluentTreatment',
        displayName: 'Effluent Treatment',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'zoneType',
        displayName: 'Zone Type',
        type: 'select',
        filterable: true,
        options: ['SEZ', 'Industrial Zone', 'Mixed Use', 'Residential'],
      },
      {
        key: 'craneCapacity',
        displayName: 'Crane Capacity',
        type: 'range',
        filterable: true,
        min: 0,
        max: 50,
        unit: 'tons',
      },
    ],
  },
  {
    type: 'coworking',
    displayName: 'Co-Working',
    attributes: [
      {
        key: 'privateCabins',
        displayName: 'Private Cabins',
        type: 'number',
        filterable: true,
        min: 0,
        max: 50,
      },
      {
        key: 'hotDesks',
        displayName: 'Hot Desks',
        type: 'number',
        filterable: true,
        min: 0,
        max: 200,
      },
      {
        key: 'meetingRooms',
        displayName: 'Meeting Rooms',
        type: 'number',
        filterable: true,
        min: 0,
        max: 20,
      },
      {
        key: 'hasPhoneBooths',
        displayName: 'Phone Booths',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'hasEventSpace',
        displayName: 'Event Space',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'includedAmenities',
        displayName: 'Included Amenities',
        type: 'select',
        filterable: true,
        options: ['Coffee', 'Snacks', 'Printing', 'Reception', 'Security'],
      },
    ],
  },
  {
    type: 'showroom',
    displayName: 'Showroom',
    attributes: [
      {
        key: 'displayArea',
        displayName: 'Display Area',
        type: 'range',
        filterable: true,
        min: 500,
        max: 50000,
        unit: 'sq ft',
      },
      {
        key: 'hasGlassFrontage',
        displayName: 'Glass Frontage',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'hasBasement',
        displayName: 'Basement',
        type: 'boolean',
        filterable: true,
      },
      {
        key: 'parkingRatio',
        displayName: 'Parking Ratio',
        type: 'range',
        filterable: true,
        min: 0,
        max: 5,
        unit: 'spaces/1000 sq ft',
      },
      {
        key: 'showroomType',
        displayName: 'Showroom Type',
        type: 'select',
        filterable: true,
        options: ['Automotive', 'Furniture', 'Electronics', 'Fashion', 'General'],
      },
    ],
  },
];

export function getPropertyTypeConfig(type: string): PropertyTypeFilterConfig | undefined {
  return PROPERTY_TYPE_CONFIGS.find(config => config.type.toLowerCase() === type.toLowerCase());
}

export function getAllPropertyTypes(): string[] {
  return PROPERTY_TYPE_CONFIGS.map(config => config.type);
}
