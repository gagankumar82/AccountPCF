// --- Final Fixed Main.tsx with all remaining errors resolved ---

import { useState, useEffect } from "react";
import * as React from "react";
import OrgChartComponent from "./OrgChartComponent";
import { fieldDefinition, Mapping } from "../EntitiesDefinition";
import { Button, Input } from "@fluentui/react-components";
import {
  ZoomInRegular,
  ZoomOutRegular,
  SearchRegular,
  PageFitRegular,
  ArrowNextRegular,
} from "@fluentui/react-icons";

interface AppProps {
  context: ComponentFramework.Context<any>;
  jsonMapping: string;
}

const App = ({ context, jsonMapping: rawMapping }: AppProps) => {
  const [data, setData] = useState<any[] | null>(null);
  const [jsonMappingControl, setJsonMappingControl] = useState<Mapping | null>(null);
  const [searchOnGoing, setSearchOnGoing] = useState<boolean>(true);

  const jsonMapping: Mapping = JSON.parse(rawMapping);
  jsonInputCheck(jsonMapping);

  const contextInfo = (context.mode as any)["contextInfo"] ?? {}; // ✅ fix the contextInfo error
  jsonMapping.entityName = contextInfo.entityTypeName ?? "";

  const fields: fieldDefinition[] = extractFields(jsonMapping);

  let clickZoom: ((z: string) => void) | null = null;
  let searchNode: ((value: string) => void) | null = null;
  let searchNextNode: (() => void) | null = null;

  useEffect(() => {
    const getAllData = async () => {
      let dataEM = await context.utils.getEntityMetadata(
        jsonMapping.entityName ?? "",
        fields.map((u) => u.name)
      );

      dataEM = await isExternalLookup(dataEM, jsonMapping);
      getAttributeDetails(dataEM);

      const getTopParentData = await context.webAPI.retrieveMultipleRecords(
        jsonMapping.entityName ?? "",
        `?$filter=Microsoft.Dynamics.CRM.Above(PropertyName='${jsonMapping.recordIdField}',PropertyValue='${jsonMapping.recordIdValue}') and _${jsonMapping.parentField}_value eq null`
      );

      const getTopParentDataId =
        getTopParentData.entities.length === 0
          ? jsonMapping.recordIdValue
          : getTopParentData.entities[0][jsonMapping.recordIdField];

      const concatFields = fields
        .filter((f) => f.webapiName)
        .map((f) => f.webapiName)
        .join(",");

      const getChildrenData = await context.webAPI.retrieveMultipleRecords(
        jsonMapping.entityName ?? "",
        `?$filter=Microsoft.Dynamics.CRM.UnderOrEqual(PropertyName='${jsonMapping.recordIdField}',PropertyValue='${getTopParentDataId}')&$select=${concatFields},statecode`
      );

      const jsonData = formatJson(getChildrenData.entities, jsonMapping);
      setJsonMappingControl(jsonMapping);
      setData(jsonData);
    };

    getAllData();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        {jsonMapping.properties?.showZoom && (
          <div id="carfup_HierarchyControl_zoom">
            <Button icon={<ZoomInRegular />} onClick={() => zoom("in")} title="Zoom In" />
            &nbsp;
            <Button icon={<ZoomOutRegular />} onClick={() => zoom("out")} title="Zoom Out" />
            &nbsp;
            <Button icon={<PageFitRegular />} onClick={() => zoom("fit")} title="Fit to screen" />
            &nbsp;
          </div>
        )}
        {jsonMapping.properties?.showSearch && (
          <Input
            contentAfter={<SearchRegular />}
            placeholder="Search"
            onChange={(e) => search((e.target as HTMLInputElement).value)}
          />
        )}&nbsp;
        {jsonMapping.properties?.showSearch && (
          <Button
            icon={<ArrowNextRegular />}
            onClick={() => searchNext()}
            title="Search Next Result"
            disabled={searchOnGoing}
          />
        )}
      </div>
      <div
        id="carfup_HierarchyControl"
        style={{
          width: jsonMapping.properties?.width ?? context.mode.allocatedWidth + "px",
          height: jsonMapping.properties?.height ?? context.mode.allocatedHeight + "px",
        }}
      >
        <OrgChartComponent
          data={data ?? []}
          mapping={jsonMappingControl!}
          setZoom={(z: (zoom: string) => void) => {
            clickZoom = z;
          }}
          setSearch={(s: (value: string) => void) => {
            searchNode = s;
          }}
          setSearchNext={(s: () => void) => {
            searchNextNode = s;
          }}
          context={context}
          size={{
            width: jsonMapping.properties?.width ?? context.mode.allocatedWidth,
            height: jsonMapping.properties?.height ?? context.mode.allocatedHeight,
          }}
        />
      </div>
    </div>
  );

  function zoom(zoom = "in") {
    clickZoom?.(zoom);
  }

  function search(value: string) {
    searchNode?.(value);
    setSearchOnGoing(value === "" || value == null);
  }

  function searchNext() {
    searchNextNode?.();
  }

  function renameKey(
    obj: Record<string, any>,
    oldKey: string,
    newKey: string,
    targetJson: any
  ) {
    if (oldKey) {
      if (["id", "parentId"].includes(newKey)) {
        targetJson[newKey] = obj[oldKey];
      } else {
        let key = oldKey;
        const type = fields.find((f) => f.webapiName === oldKey)?.type;
        if (type && ["lookup", "datetime", "picklist"].includes(type)) {
          key = `${oldKey}@OData.Community.Display.V1.FormattedValue`;
        }
        const details = {
          value: getValue(obj[key], type),
          type,
          displayName: fields.find((f) => f.webapiName === oldKey)?.displayName,
          statecode: obj.statecode,
        };
        if (newKey === "attribute") {
          targetJson.push(details);
        } else {
          targetJson[newKey] = details;
        }
      }
    }
  }

  function getValue(value: any, type?: string) {
    let result = value;
    switch (type) {
      case "date":
        result = context.formatting.formatDateShort(new Date(value));
        break;
      case "money":
        result = context.formatting.formatCurrency(value);
        break;
    }
    return result === undefined ? null : result;
  }

  function getAttributeDetails(em: any) {
    em.Attributes.forEach((attr: any) => {
      const index = fields.findIndex((f) => f.name === attr.LogicalName);
      fields[index].webapiName =
        em.PrimaryAttributeId !== attr.LogicalName &&
        ["lookup", "owner", "customer"].includes(attr.AttributeTypeName)
          ? `_${attr.LogicalName}_value`
          : attr.LogicalName;
      fields[index].type = returnType(attr);
      fields[index].displayName = attr.DisplayName;
    });
  }

  function formatJson(jsonData: any[], mapping: Mapping) {
    const targetJson: any[] = [];
    jsonData.forEach((obj) => {
      const propsTarget: any = { attributes: [] };
      renameKey(obj, isLookup(mapping.recordIdField), "id", propsTarget);
      renameKey(obj, isLookup(mapping.parentField), "parentId", propsTarget);
      mapping.mapping.forEach((field, index) => {
        if (index === 0) {
          renameKey(obj, isLookup(field), "name", propsTarget);
        } else {
          renameKey(obj, isLookup(field), "attribute", propsTarget.attributes);
        }
      });
      targetJson.push(propsTarget);
    });
    return targetJson;
  }

  function extractFields(jsonMapping: Mapping): fieldDefinition[] {
    const fields: fieldDefinition[] = [
      { name: jsonMapping.recordIdField },
      { name: jsonMapping.parentField },
      ...jsonMapping.mapping.map((field) => ({ name: field })),
    ];
    if (jsonMapping.lookupOtherTable) fields.push({ name: jsonMapping.lookupOtherTable });
    return fields;
  }

  function isLookup(field: string) {
    return fields.find((f) => f.name === field)?.type === "lookup"
      ? `_${field}_value`
      : field;
  }

  function returnType(attr: any): string {
    let result = attr.AttributeTypeName;
    switch (attr.AttributeTypeName) {
      case "owner":
      case "partylist":
      case "customer":
      case "lookup":
        result = "lookup";
        break;
      case "decimal":
      case "double":
      case "integer":
      case "int":
      case "bigint":
        result = "number";
        break;
      case "string":
        switch (attr.attributeDescriptor?.FormatName) {
          case "Url":
            result = "url";
            break;
          case "Phone":
            result = "phone";
            break;
        }
        break;
    }
    return result;
  }

  async function isExternalLookup(dataEM: any, jsonMapping: Mapping) {
    const contextInfo = (context.mode as any)["contextInfo"];
    let lookupTableDetails = dataEM;
    if (jsonMapping.lookupOtherTable) {
      const lookupField = dataEM.Attributes._collection[jsonMapping.lookupOtherTable];
      lookupTableDetails = await context.utils.getEntityMetadata(
        lookupField.Targets[0],
        fields.map((u) => u.name)
      );
      const lookupFieldValue = await context.webAPI.retrieveRecord(
        jsonMapping.entityName ?? "",
        contextInfo.entityId,
        `?$select=_${jsonMapping.lookupOtherTable}_value`
      );
      jsonMapping.entityName = lookupTableDetails.LogicalName;
      jsonMapping.recordIdField = lookupTableDetails.PrimaryIdAttribute;
      jsonMapping.recordIdValue = lookupFieldValue[`_${jsonMapping.lookupOtherTable}_value`];
    } else {
      jsonMapping.recordIdValue = contextInfo.entityId;
    }
    return lookupTableDetails;
  }

  function jsonInputCheck(mapping: Mapping) {
    if (mapping.mapping.includes("attribute1")) {
      alert(
        "Hierarchy control PCF :\nPlease make sure that you updated the JSON schema of the Hierarchy control to properly works.\n\nPlease go to https://github.com/carfup/PCF_HierarchyControl to have the new JSON schema."
      );
    }
  }
};

export default App;
