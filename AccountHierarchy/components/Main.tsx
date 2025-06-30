import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { IInputs } from "../generated/ManifestTypes";
import OrgChartComponent from "./OrgChartComponent";
import {
  fieldDefinition,
  Mapping,
  ChartNode,
  ChartAttribute,
} from "../EntitiesDefinition";
import { Button, Input } from "@fluentui/react-components";
import {
  ZoomInRegular,
  ZoomOutRegular,
  SearchRegular,
  PageFitRegular,
  ArrowNextRegular,
} from "@fluentui/react-icons";

interface ContextInfo {
  entityTypeName?: string;
  entityId?: string;
}

interface ExtendedMode extends ComponentFramework.Mode {
  contextInfo?: ContextInfo;
}

interface AppProps {
  context: ComponentFramework.Context<IInputs>;
  jsonMapping: string;
}

const App: React.FC<AppProps> = ({ context, jsonMapping }) => {
  const [data, setData] = useState<ChartNode[]>([]);
  const [mappingControl, setMappingControl] = useState<Mapping | null>(null);

  // Handlers provided by OrgChartComponent
 // let zoomHandler: (direction: string) => void = () => {};
  //let searchHandler: (term: string) => void = () => {};
 // let nextHandler: () => void = () => {};
   let zoomHandler = (direction: string): void => {
    console.warn("zoomHandler not yet initialized:", direction);
  };

  let searchHandler = (term: string): void => {
    console.warn("searchHandler not yet initialized:", term);
  };

  let nextHandler = (): void => {
    console.warn("nextHandler not yet initialized");
  };

  // Parse and strongly-type the JSON mapping
  const mapping: Mapping = useMemo(
    () => JSON.parse(jsonMapping) as Mapping,
    [jsonMapping]
  );

  // Pull entity info from PCF context
  const extendedMode = context.mode as ExtendedMode;
  const ctxInfo = extendedMode.contextInfo ?? {};
  mapping.entityName = ctxInfo.entityTypeName ?? "";
  if (ctxInfo.entityId) {
    mapping.recordIdValue = ctxInfo.entityId;
  }

  // Build list of fields to fetch
  const fields: fieldDefinition[] = useMemo(() => {
    const flds: fieldDefinition[] = [
      { name: mapping.recordIdField },
      { name: mapping.parentField },
      ...mapping.mapping.map((name) => ({ name })),
    ];
    if (mapping.lookupOtherTable) {
      flds.push({ name: mapping.lookupOtherTable });
    }
    return flds;
  }, [mapping]);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      // Retrieve metadata (unused here but could drive formatting)
      await context.utils.getEntityMetadata(
        mapping.entityName,
        fields.map((f) => f.name)
      );

      // Find the topmost ancestor or default to current record
      const parentResp = await context.webAPI.retrieveMultipleRecords(
        mapping.entityName,
        `?$filter=Microsoft.Dynamics.CRM.Above(PropertyName='${mapping.recordIdField}',PropertyValue='${mapping.recordIdValue}') and _${mapping.parentField}_value eq null`
      );
      const topId =
        parentResp.entities.length > 0
          ? parentResp.entities[0][mapping.recordIdField]
          : mapping.recordIdValue ?? "";

      // Fetch entire subtree under that top node
      const select = fields
        .filter((f) => f.webapiName)
        .map((f) => f.webapiName!)
        .join(",");
      const childrenResp = await context.webAPI.retrieveMultipleRecords(
        mapping.entityName,
        `?$filter=Microsoft.Dynamics.CRM.UnderOrEqual(PropertyName='${mapping.recordIdField}',PropertyValue='${topId}')&$select=${select},statecode`
      );

      // Map to ChartNode[]
      const formatted: ChartNode[] = childrenResp.entities.map((rec) => {
        const attrs: ChartAttribute[] = [];
        let nameAttr = {
          value: rec[mapping.mapping[0]] as string | null,
          statecode: rec.statecode,
        };

        mapping.mapping.forEach((fld, idx) => {
          const raw = rec[fld] as string | null;
          if (idx === 0) {
            nameAttr = { value: raw, statecode: rec.statecode };
          } else {
            attrs.push({
              value: raw,
              displayName: fld,
              type: "text",
            });
          }
        });

        return {
          id: rec[mapping.recordIdField] as string,
          parentId: (rec[mapping.parentField] as string) ?? null,
          name: nameAttr,
          attributes: attrs,
        };
      });

      setMappingControl(mapping);
      setData(formatted);
    };

    void loadData();
  }, [context, fields, mapping]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {mapping.properties?.showZoom && (
          <>
            <Button
              icon={<ZoomInRegular />}
              onClick={() => zoomHandler("in")}
            />
            <Button
              icon={<ZoomOutRegular />}
              onClick={() => zoomHandler("out")}
            />
            <Button
              icon={<PageFitRegular />}
              onClick={() => zoomHandler("fit")}
            />
          </>
        )}
        {mapping.properties?.showSearch && (
          <>
            <Input
              placeholder="Search"
              contentAfter={<SearchRegular />}
              onChange={(e) =>
                searchHandler((e.target as HTMLInputElement).value)
              }
            />
            <Button icon={<ArrowNextRegular />} onClick={() => nextHandler()} />
          </>
        )}
      </div>
      <div
        style={{
          width: mapping.properties?.width ?? context.mode.allocatedWidth,
          height:
            mapping.properties?.height ?? context.mode.allocatedHeight,
        }}
      >
        {mappingControl && (
          <OrgChartComponent
            data={data}
            mapping={mappingControl}
            setZoom={(h) => {
              zoomHandler = h;
            }}
            setSearch={(h) => {
              searchHandler = h;
            }}
            setSearchNext={(h) => {
              nextHandler = h;
            }}
            context={context}
            size={{
              width:
                mapping.properties?.width ??
                context.mode.allocatedWidth,
              height:
                mapping.properties?.height ??
                context.mode.allocatedHeight,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default App;
