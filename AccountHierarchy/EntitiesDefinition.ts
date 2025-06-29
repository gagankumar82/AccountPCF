export interface Mapping {
  entityName: string;
  parentField: string;
  recordIdField: string;
  lookupOtherTable?: string;
 // mapping: Array<string>;
 mapping: string[];
  properties?: propertiesMapping;
  isCurrentRecord?: boolean;
  recordIdValue?: string;
}

export interface attributesMapping {
  name: string;
  attribute1?: string;
  attribute2?: string;
  attribute3?: string;
}

export interface propertiesMapping {
  height?: number;
  width?: number;
  showZoom?: boolean;
  showSearch?: boolean;
}

export interface fieldDefinition {
  name: string;
  webapiName?: string;
  type?: string;
  displayName?: string;
  statecode? : number;
}

/** One attribute inside each node (value, displayName, and its type) */
export interface ChartAttribute {
  value: string | null;
  displayName: string;
  type: string;
}

/** The shape of each node that d3-org-chart sees */
export interface ChartNode {
  id: string;
  parentId: string | null;
  name: {
    value: string | null;
    statecode: number;
  };
  attributes: ChartAttribute[];
  /** the chart uses this internally for highlights */
  _highlighted?: boolean;
}