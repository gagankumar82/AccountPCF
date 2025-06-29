import * as React from 'react';
import { useEffect, useRef } from 'react';
import { OrgChart } from 'd3-org-chart';
import { IInputs } from '../generated/ManifestTypes';
import { Mapping, ChartNode, ChartAttribute } from '../EntitiesDefinition';

interface OrgChartComponentProps {
  data: ChartNode[];
  mapping: Mapping;
  setZoom: (handler: (direction: string) => void) => void;
  setSearch: (handler: (term: string) => void) => void;
  setSearchNext: (handler: () => void) => void;
  context: ComponentFramework.Context<IInputs>;
  size: { width: number; height: number };
}

// For nodeContent callback
interface RenderNode {
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

  // Keep track of search hits
  let searchHits: Array<{ id: string; viewed: boolean }> = [];

  // Zoom in / out / fit
  const zoom = (dir: string = 'in') => {
    if (dir === 'in') chartRef.current.zoomIn();
    else if (dir === 'out') chartRef.current.zoomOut();
    else chartRef.current.fit();
  };

  // Search highlights
  const search = (term: string) => {
    chartRef.current.clearHighlighting();
    searchHits = [];
    const lower = term.trim().toLowerCase();
    const nodes = chartRef.current.data() as ChartNode[];
    nodes.forEach((n) => {
      if (lower && n.name.value?.toLowerCase().includes(lower)) {
        (n as any)._highlighted = true;
        searchHits.push({ id: n.id, viewed: false });
      }
    });
    chartRef.current.data(nodes).render();
    attachNavListeners();
  };

  // Cycle through matches
  const focusNext = () => {
    const next = searchHits.find((h) => !h.viewed);
    if (next) {
      chartRef.current.setCentered(next.id).render();
      next.viewed = true;
    } else {
      searchHits.forEach((h) => (h.viewed = false));
      if (searchHits.length) focusNext();
    }
  };

  // Click handler for link icon
  const attachNavListeners = () => {
    const nodes = chartRef.current.data() as ChartNode[];
    nodes.forEach((n) => {
      const el = document.getElementById(`navi_${n.id}`);
      if (el) el.addEventListener('click', () => navigate(n.id));
    });
  };

  // Navigate to record form
  const navigate = (id: string) => {
    (context.navigation as any).navigateTo({
      pageType: 'entityrecord',
      entityName: mapping.entityName,
      entityId: id,
    });
  };

  // Expose handlers once on mount
  useEffect(() => {
    setZoom(zoom);
    setSearch(search);
    setSearchNext(focusNext);
  }, []);

  // Render/update chart when data changes
  useEffect(() => {
    if (data.length && containerRef.current) {
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
        .nodeContent((d: RenderNode) => {
          const isActive = d.data.id === mapping.recordIdValue;
          const initials = (d.data.name.value ?? '')
            .split(' ')
            .slice(0, 2)
            .map(w => w.charAt(0).toUpperCase())
            .join('');
          const attrsHtml = d.data.attributes
            .map(
              (a: ChartAttribute) =>
                a.value
                  ? `<div title="${a.displayName}">${getIcon(a.type)} ${a.value}</div>`
                  : ''
            )
            .join('');
          return `
            <div style="width:${d.width}px; height:${d.height}px;">
              <div style="border:1px solid ${isActive ? '#FF0000' : '#E4E2E9'}; background:#fff; padding:4px;">
                <span id="navi_${d.data.id}" style="cursor:pointer;">${getIcon('link')}</span>
                <span style="font-weight:bold; margin-left:8px;">${initials}</span>
                <div style="margin-top:8px;">${d.data.name.value ?? ''}</div>
                <div style="margin-top:4px; font-size:12px;">${attrsHtml}</div>
              </div>
            </div>`;
        })
        .expandAll();

      if (size.width > 0) chart = chart.svgWidth(size.width);
      if (size.height > 0) chart = chart.svgHeight(size.height);

      chart.setCentered(mapping.recordIdValue ?? '').render();
      attachNavListeners();
    }
  }, [data, size]);

  return <div ref={containerRef} />;
};

// Simple circle icon
const getIcon = (_type: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
     <circle cx="8" cy="8" r="6" fill="currentColor"/>
   </svg>`;

export default OrgChartComponent;
