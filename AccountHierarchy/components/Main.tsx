import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { IInputs } from '../generated/ManifestTypes';
import OrgChartComponent from './OrgChartComponent';
import {
  Mapping,
  fieldDefinition,
  ChartNode,
} from '../EntitiesDefinition';
import { Button, Input } from '@fluentui/react-components';
import {
  ZoomInRegular,
  ZoomOutRegular,
  SearchRegular,
  PageFitRegular,
  ArrowNextRegular,
} from '@fluentui/react-icons';

// Extend the PCF Mode interface to expose contextInfo
interface ContextInfo {
  entityTypeName?: string;
  entityId?: string;
}
interface ExtendedMode extends ComponentFramework.Mode {
  contextInfo?: ContextInfo;
}

interface MainProps {
  context: ComponentFramework.Context<IInputs>;
  jsonMapping: string;
}

const Main: React.FC<MainProps> = ({ context, jsonMapping }) => {
  const [data, setData] = useState<ChartNode[]>([]);
  const [mappingControl, setMappingControl] = useState<Mapping | null>(null);

  // Handlers that will be wired up by OrgChartComponent
  const zoomHandler = useRef<(dir: string) => void>(() => {});
  const searchHandler = useRef<(term: string) => void>(() => {});
  const nextHandler = useRef<() => void>(() => {});

  // Parse mapping JSON only when it changes
  const mapping: Mapping = useMemo(
    () => JSON.parse(jsonMapping) as Mapping,
    [jsonMapping]
  );

  // Pull entity info out of context.mode.contextInfo
  const ctxInfo = (context.mode as ExtendedMode).contextInfo ?? {};
  mapping.entityName = ctxInfo.entityTypeName ?? '';
  if (ctxInfo.entityId) {
    mapping.recordIdValue = ctxInfo.entityId;
  }

  // Build the list of fields we need to fetch
  const fields: fieldDefinition[] = useMemo(() => {
    const base: fieldDefinition[] = [
      { name: mapping.recordIdField },
      { name: mapping.parentField },
      ...mapping.mapping.map((m) => ({ name: m })),
    ];
    if (mapping.lookupOtherTable) {
      base.push({ name: mapping.lookupOtherTable });
    }
    return base;
  }, [mapping]);

  // Load hierarchy data once on mount
  useEffect(() => {
    const load = async () => {
      // Retrieve metadata (you can use it in OrgChartComponent if needed)
      await context.utils.getEntityMetadata(mapping.entityName, fields.map(f => f.name));

      // Find top ancestor
      const parentResp = await context.webAPI.retrieveMultipleRecords(
        mapping.entityName,
        `?$filter=Microsoft.Dynamics.CRM.Above(PropertyName='${mapping.recordIdField}',PropertyValue='${mapping.recordIdValue}') and _${mapping.parentField}_value eq null`
      );
      const topId =
        parentResp.entities.length > 0
          ? parentResp.entities[0][mapping.recordIdField]
          : mapping.recordIdValue!;

      // Fetch full subtree
      const select = fields
        .filter(f => f.webapiName)
        .map(f => f.webapiName!)
        .join(',');
      const childrenResp = await context.webAPI.retrieveMultipleRecords(
        mapping.entityName,
        `?$filter=Microsoft.Dynamics.CRM.UnderOrEqual(PropertyName='${mapping.recordIdField}',PropertyValue='${topId}')&$select=${select},statecode`
      );

      // Format into ChartNode[]
      const formatted: ChartNode[] = childrenResp.entities.map(rec => {
        // first mapped field => node name, rest => attributes
        const name = {
          value: rec[mapping.mapping[0]] as string | null,
          statecode: rec.statecode,
        };
        const attrs = mapping.mapping.slice(1).map((fld) => ({
          value: (rec[fld] as string | null),
          displayName: fld,
          type: 'text',
        }));
        return {
          id: rec[mapping.recordIdField] as string,
          parentId: (rec[mapping.parentField] as string | null) ?? null,
          name,
          attributes: attrs,
        };
      });

      setMappingControl({ ...mapping });
      setData(formatted);
    };

    load();
  }, [context, fields, mapping]);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {mapping.properties?.showZoom && (
          <>
            <Button icon={<ZoomInRegular />} onClick={() => zoomHandler.current('in')} />
            <Button icon={<ZoomOutRegular />} onClick={() => zoomHandler.current('out')} />
            <Button icon={<PageFitRegular />} onClick={() => zoomHandler.current('fit')} />
          </>
        )}
        {mapping.properties?.showSearch && (
          <>
            <Input
              placeholder="Search"
              contentAfter={<SearchRegular />}
              onChange={(e) => searchHandler.current((e.target as HTMLInputElement).value)}
            />
            <Button icon={<ArrowNextRegular />} onClick={() => nextHandler.current()} />
          </>
        )}
      </div>

      {/* Chart */}
      <div
        style={{
          width: mapping.properties?.width ?? context.mode.allocatedWidth,
          height: mapping.properties?.height ?? context.mode.allocatedHeight,
        }}
      >
        {mappingControl && (
          <OrgChartComponent
            data={data}
            mapping={mappingControl}
            setZoom={(h) => { zoomHandler.current = h; }}
            setSearch={(h) => { searchHandler.current = h; }}
            setSearchNext={(h) => { nextHandler.current = h; }}
            context={context}
            size={{
              width: mapping.properties?.width ?? context.mode.allocatedWidth,
              height: mapping.properties?.height ?? context.mode.allocatedHeight,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Main;
