import * as React from "react";
import { useEffect, useRef } from "react";
import { OrgChart } from "d3-org-chart";
import { Mapping } from "../EntitiesDefinition";
import { IInputs } from "../generated/ManifestTypes";

interface OrgChartComponentProps {
  data: any;
  mapping: Mapping;
  setZoom: (z: (zoom: string) => void) => void;
  setSearch: (s: (value: string) => void) => void;
  setSearchNext: (s: () => void) => void;
  context: ComponentFramework.Context<IInputs>;
  size: {
    width: number;
    height: number;
  };
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
  const d3Container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(new OrgChart());
  let searchRecords: { id: string; viewed: boolean }[] = [];

  const zoom = (zoom: string = "in") => {
    if (zoom === "in") {
      chartRef.current.zoomIn();
    } else if (zoom === "out") {
      chartRef.current.zoomOut();
    } else {
      chartRef.current.fit();
    }
  };

  const search = (value: string) => {
    chartRef.current.clearHighlighting();
    searchRecords = [];

    const chartData: any[] = chartRef.current.data();
    chartData.forEach((d) => {
      if (value !== "" && d.name.value.toLowerCase().includes(value.toLowerCase())) {
        d._highlighted = true;
        searchRecords.push({ id: d.id, viewed: false });
      }
    });

    chartRef.current.data(chartData).render();
    addListener();
  };

  const addListener = () => {
    const chartData: any[] = chartRef.current.data();
    chartData.forEach((d) => {
      const el = document.getElementById(`navi_${d.id}`);
      if (el) {
        el.addEventListener("click", () => navigate(d.id));
      }
    });
  };

  const setSearchRecords = () => {
    const rec = searchRecords.find((record) => !record.viewed);
    if (rec) {
      chartRef.current.setCentered(rec.id).render();
      rec.viewed = true;
    } else {
      searchRecords.forEach((r) => (r.viewed = false));
      setSearchRecords();
    }
  };

  const navigate = (id: string) => {
    (context.navigation as any).navigateTo({
      pageType: "entityrecord",
      entityName: mapping.entityName || "",
      entityId: id,
    });
  };

  useEffect(() => {
    setZoom(() => zoom);
    setSearch(() => search);
    setSearchNext(() => setSearchRecords);
  }, []);

  useEffect(() => {
    if (data && d3Container.current) {
      let content = chartRef.current
        .container(d3Container.current)
        .data(data)
        .nodeWidth(() => 360)
        .initialZoom(0.8)
        .nodeHeight(() => 150)
        .childrenMargin(() => 50)
        .compactMarginBetween(() => 50)
        .compactMarginPair(() => 80)
        .setActiveNodeCentered(true)
        .nodeContent((d: any) => {
          const isActiveNode = d.data.id === mapping.recordIdValue;
          const backgroundColor = "#FFFFFF";
          const borderColor = isActiveNode ? "#FF0000" : "#E4E2E9";
          const statusColor = d.data.name.statecode === 0 ? "#58BC3A" : "#b7b7b7";
          const textMainColor = "#08011E";
          const textColor = "#716E7B";
          const initials = (d.data.name.value || "")
            .split(" ")
            .slice(0, 2)
            .map((w: string) => w?.[0]?.toUpperCase() || "")
            .join("");
          const attributes = d.data.attributes
            .map((attr: any) =>
              attr?.value
                ? `<div style="display:flex;align-items:center" title="${attr.displayName}">${getIcon(attr.type)}&nbsp;${attr.value}</div>`
                : ""
            )
            .join("");

          return `<div style='width:${d.width}px;height:${d.height}px;padding-top:27px;padding-left:1px;padding-right:1px'>
                    <div style="font-family: 'Inter', sans-serif;background-color:${backgroundColor};margin-left:-1px;width:${d.width - 2}px;height:${d.height - 27}px;border-radius:10px;border: 1px solid ${borderColor};">
                      <div style="display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px;color:${textColor}">
                        <span id="navi_${d.data.id}">${getIcon("link")}</span>&nbsp;
                        <span title="${d.data.name.statecode === 0 ? "Active" : "Inactive"}" style="height: 15px;width: 15px;background-color: ${statusColor};border-radius: 50%; display: inline-block;"></span>
                      </div>
                      <div style="background-color:${backgroundColor};margin-top:-45px;margin-left:15px;border-radius:100px;width:50px;height:50px;"></div>
                      <div style="margin-top:-45px;">
                        <span style="display: inline-block;background-color: ${getRandomColor()};color: #fff;border-radius: 50%;font-size: 18px;line-height: 40px;width: 40px;height: 40px;text-align: center;margin-left: 20px;font-family:'Segoe UI', sans-serif;font-weight:600;">
                          ${initials}
                        </span>
                      </div>
                      <div style="font-size:20px;color:${textMainColor};margin-left:20px;margin-top:5px;width:320px;overflow:hidden;height:23px;">
                        ${d.data.name.value || ""}
                      </div>
                      <div style="color:${textColor};margin-left:20px;margin-top:3px;font-size:12px;overflow:scroll;height: 82px;">
                        ${attributes}
                      </div>
                    </div>
                  </div>`;
        })
        .expandAll();

      if (size.width && size.width !== -1) content = content.svgWidth(size.width);
      if (size.height && size.height !== -1) content = content.svgHeight(size.height);
      content.setCentered(mapping.recordIdValue || "").render();
      addListener();
    }
  }, [data, d3Container.current]);

  return <div ref={d3Container} />;
};

function getIcon(type: string): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor'><circle cx='8' cy='8' r='6'/></svg>`;
}

function getRandomColor(): string {
  const colors = ["#f1bbbc", "#9fd89f", "#f4bfab", "#fef7b2", "#edbbe7", "#a7e3a5"];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default OrgChartComponent;
