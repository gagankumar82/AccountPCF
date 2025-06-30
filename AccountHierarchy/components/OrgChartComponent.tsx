import * as React from "react";
import { useEffect, useRef } from "react";
import { OrgChart } from "d3-org-chart";
import { Mapping, ChartNode } from "../EntitiesDefinition";
import { IInputs } from "../generated/ManifestTypes";

interface OrgChartComponentProps {
  data: ChartNode[];
  mapping: Mapping;
  setZoom: (handler: (zoom: string) => void) => void;
  setSearch: (handler: (value: string) => void) => void;
  setSearchNext: (handler: () => void) => void;
  context: ComponentFramework.Context<IInputs>;
  size: {
    width: number;
    height: number;
  };
}

interface NavigationExe {
  navigateTo(opts: {
    pageType: "entityrecord";
    entityName: string;
    entityId: string;
  }): Promise<void>;
}
interface OrgChartRenderNode {
  data: ChartNode;
  width: number;
  height: number;
}

const OrgChartComponent: React.FC<OrgChartComponentProps> = ({
  data,
  mapping,
  setZoom,
  setSearch,
  setSearchNext,
  context,
  size,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<OrgChart>(new OrgChart());
  //let searchRecords: Array<{ id: string; viewed: boolean }> = [];
  let searchRecords: { id: string; viewed: boolean }[] = [];

  // Zoom control
  const zoom = (direction = "in"): void => {
    if (direction === "in") {
      chartRef.current.zoomIn();
    } else if (direction === "out") {
      chartRef.current.zoomOut();
    } else {
      chartRef.current.fit();
    }
  };

  // Text‐search & highlight
  const search = (term: string): void => {
    chartRef.current.clearHighlighting();
    searchRecords = [];
    const nodes = chartRef.current.data() as ChartNode[];
    nodes.forEach((node) => {
      const name = node.name.value ?? "";
      if (
        term.trim() !== "" &&
        name.toLowerCase().includes(term.toLowerCase())
      ) {
       // (node as any)._highlighted = true;
       (node as ChartNode & { _highlighted?: boolean })._highlighted = true;
        searchRecords.push({ id: node.id, viewed: false });
      }
    });
    chartRef.current.data(nodes).render();
    attachListeners();
  };

  // Cycle focus through highlighted nodes
  const focusNext = (): void => {
    const next = searchRecords.find((r) => !r.viewed);
    if (next) {
      chartRef.current.setCentered(next.id).render();
      next.viewed = true;
    } else {
      searchRecords.forEach((r) => (r.viewed = false));
      if (searchRecords.length > 0) {
        focusNext();
      }
    }
  };

  // Attach click handlers for the “link” icon in each node
  const attachListeners = (): void => {
    const nodes = chartRef.current.data() as ChartNode[];
    nodes.forEach((node) => {
      const el = document.getElementById(`navi_${node.id}`);
      if (el) {
        el.addEventListener("click", () => navigateTo(node.id));
      }
    });
  };

  // Navigate to record form
  const navigateTo = (id: string): void => {
    // PCF navigation API is loosely typed
   // (context.navigation as any).navigateTo({
    //  pageType: "entityrecord",
     // entityName: mapping.entityName ?? "",
    //  entityId: id,
  //  });
  const nav = context.navigation as unknown as NavigationExe;
nav.navigateTo({
  pageType: "entityrecord",
  entityName: mapping.entityName || "",
  entityId: id,
});
  };

  // Register parent‐exposed handlers on mount
  useEffect(() => {
    setZoom(zoom);
    setSearch(search);
    setSearchNext(focusNext);
  }, []);

  // Render or re-render chart whenever `data` changes
  useEffect(() => {
    if (data.length > 0 && containerRef.current) {
      let chart = chartRef.current
        .container(containerRef.current)
        .data(data)
        .nodeWidth(() => 360)
        .nodeHeight(() => 150)
        .childrenMargin(() => 50)
        .compactMarginBetween(() => 50)
        .compactMarginPair(() => 80)
        .initialZoom(0.8)
        .setActiveNodeCentered(true)
        .nodeContent((d: OrgChartRenderNode) => {
          const isActive = d.data.id === mapping.recordIdValue;
          const initials = (d.data.name.value ?? "")
            .split(" ")
            .slice(0, 2)
            .map((w) => w.charAt(0).toUpperCase())
            .join("");
          const attrsHtml = d.data.attributes
            .map(
              (attr) =>
                attr.value
                  ? `<div title="${attr.displayName}">${getIcon(
                      attr.type
                    )} ${attr.value}</div>`
                  : ""
            )
            .join("");
          return `
            <div style="width:${d.width}px;height:${d.height}px;">
              <div style="border:1px solid ${
                isActive ? "#FF0000" : "#E4E2E9"
              };padding:4px;background:#fff;">
                <span id="navi_${d.data.id}" style="cursor:pointer;">
                  ${getIcon("link")}
                </span>
                <span style="font-weight:bold;margin-left:8px;">
                  ${initials}
                </span>
                <div style="margin-top:8px;font-size:14px;">
                  ${d.data.name.value ?? ""}
                </div>
                <div style="margin-top:4px;font-size:12px;">
                  ${attrsHtml}
                </div>
              </div>
            </div>`;
        })
        .expandAll();

      if (size.width > 0) {
        chart = chart.svgWidth(size.width);
      }
      if (size.height > 0) {
        chart = chart.svgHeight(size.height);
      }

      chart
        .setCentered(mapping.recordIdValue ?? "")
        .render();
      attachListeners();
    }
  }, [data]);

  return <div ref={containerRef} />;
};

// Minimal SVG icon generator
const getIcon = (type: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
     <circle cx="8" cy="8" r="6" fill="currentColor"/>
   </svg>`;

export default OrgChartComponent;
