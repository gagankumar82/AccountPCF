declare module 'd3-org-chart' {
  export class OrgChart {
    // Core methods
    container(container: any): OrgChart;
    data(): any;
    data(data: any): OrgChart;
    render(): OrgChart;

    // Zoom and fit
    zoomIn(): OrgChart;
    zoomOut(): OrgChart;
    fit(config?: any): OrgChart;

    // Highlight & Centering
    setCentered(id: string): OrgChart;
    setHighlighted(id: string): OrgChart;
    setUpToTheRootHighlighted(id: string): OrgChart;
    clearHighlighting(): OrgChart;

    // Expand/Collapse/Node control
    setExpanded(id: string, expanded?: boolean): OrgChart;
    addNode(node: any): OrgChart;
    removeNode(nodeId: string): OrgChart;
    expandAll(): OrgChart;
    collapseAll(): OrgChart;

    // Export
    exportImg(config?: any): OrgChart;
    exportSvg(): OrgChart;
    fullscreen(elem?: HTMLElement): OrgChart;

    // Layout and node customization
    nodeWidth(func: (d: any) => number): OrgChart;
    nodeHeight(func: (d: any) => number): OrgChart;
    childrenMargin(func: (d: any) => number): OrgChart;
    compactMarginBetween(func: (d: any) => number): OrgChart;
    compactMarginPair(func: (d: any) => number): OrgChart;
    initialZoom(zoom: number): OrgChart;

    // Other useful config setters (if used)
    //nodeContent?(func: Function): OrgChart;
    nodeContent(func: (d: any) => string): OrgChart;
    buttonContent?(func: Function): OrgChart;
    pagingButton?(func: Function): OrgChart;
    setActiveNodeCentered(value: boolean): OrgChart;
    svgWidth(value: number): OrgChart;
svgHeight(value: number): OrgChart;
  }
}
