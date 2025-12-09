import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { 
  LucideAngularModule, 
  Workflow, 
  Spline, 
  GitBranchPlus, 
  Save, 
  Shapes, 
  RouteOff, 
  Palette, 
  BetweenHorizontalStart, 
  SquareMousePointer, 
  RefreshCcw, 
  Minus, 
  Type, 
  Slash, 
  AlignCenter, 
  AlignHorizontalJustifyCenter, 
  AlignVerticalJustifyCenter,
  ZoomIn,
  ZoomOut,
  RotateCcwSquare,
  ReplaceAll,
  MoveRight,
  MoveLeft,
} from 'lucide-angular';
import { DiagramsService } from '../../Services/diagrams.service';
import { ColornodesService } from '../../Services/ColorNodes/colornodes.service';
import { Diagrams } from '../../Models/Diagrams/diagrams.model';
import { ColorNodes } from '../../Models/ColorNodes/color-nodes.model';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import nodeResize from 'cytoscape-node-resize';
import { AuthService } from '../../Services/Auth/auth-services.service';

(cytoscape as any).use(nodeResize);
(cytoscape as any).use(dagre);

@Component({
  selector: 'app-diagram',
  imports: [LucideAngularModule, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './diagrams.component.html',
  styleUrls: ['./diagrams.component.scss'],
  providers: [DiagramsService, ColornodesService, AuthService]
})
export class DiagramComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly WorkflowIcon = Workflow;
  readonly SplineIcon = Spline;
  readonly GitBranchPlusIcon = GitBranchPlus;
  readonly SaveIcon = Save;
  readonly ShapesIcon = Shapes;
  readonly RouteOffIcon = RouteOff;
  readonly PaletteIcon = Palette;
  readonly UploadSheetIcon = BetweenHorizontalStart;
  readonly SelectNodeIcon = SquareMousePointer;
  readonly RefreshIcon = RefreshCcw;
  readonly MinusIcon = Minus;
  readonly TypeIcon = Type;
  readonly SlashIcon = Slash;
  readonly AlignCenterIcon = AlignCenter;
  readonly AlignHorizontalIcon = AlignHorizontalJustifyCenter;
  readonly AlignVerticalIcon = AlignVerticalJustifyCenter;
  readonly ZoomInIcon = ZoomIn;
  readonly ZoomOutIcon = ZoomOut;
  readonly ZoomFitIcon = RotateCcwSquare;
  readonly ZoomResetIcon = ReplaceAll;
  readonly NextIcon = MoveRight;
  readonly PreviousIcon = MoveLeft;
  searchQuery: string = '';
  searchResults: any[] = [];
  currentSearchIndex: number = -1;
  @ViewChild('cyContainer') cyContainer!: ElementRef;
  jsonLoaded = false;
  cy: any;
  nodeIndex = 1;
  connectMode = false;
  lineMode = false;
  lineStartPos: { x: number; y: number } | null = null;
  selectedNode: any = null;
  connectionStyle: 'straight' | 'curve' | 'angle' = 'straight';
  pendingSource: string | null = null;
  selectedNodeDisplay: boolean[] = [];
  showImportModal = false;
  ShowSavingModal = false;
  ShowColorModal = false;
  showMappingModal = false;
  sheetUrl = '';
  headers: string[] = [];
  rows: any[] = [];
  filterValues: string[] = [];
  selectedFilterValue: string = '';
  mapping = { id: 0, label: 1, dependency: null as number | null, filter: null as number | null };
  statusColors: any = {
    "Closed": "#68fa57",
    "Unmatched BOQ": "#FFF",
    "Budgeting": "#ffb24d",
    "Commenced": "#5e89ff",
    "Halted": "#c9c9c9",
  };

  getStatusColor(statusValue: string): string {
    if (!statusValue) return "#E3E3E3";
    
    const normalizedStatus = statusValue.toString().trim();
    
    if (this.statusColors[normalizedStatus]) {
      return this.statusColors[normalizedStatus];
    }
    
    const lowerStatus = normalizedStatus.toLowerCase();
    for (const [key, color] of Object.entries(this.statusColors)) {
      if (key.toLowerCase() === lowerStatus) {
        return color as string;
      }
    }
    
    return "#E3E3E3";
  }
  diagramsField: Diagrams = {
    name: '',
    description: '',
    json_data: '',
    line_category: '',
    node_data: '',
    dependency: '',
    dependency_value: '',
    sheet_url: '',
    s_bpartner_i_employee_id: 2,
    created_by: 2
  };
  ColorNodeFields: ColorNodes = {
    diagram_id: null,
    label: '',
    color_key: '',
    color_code: '',
    created_by: 2,
  };
  user: any = {};
  diagramID: number | null = null;
  
  constructor(
    private DiagramService: DiagramsService,
    private ColorService: ColornodesService,
    private route: ActivatedRoute,
    private authServices: AuthService,
  ) {}
  
  ngOnInit() {
    this.diagramID = this.route.snapshot.params['id'];
    if (this.diagramID) {
      this.fetchDiagramByID();
    }
    this.authServices.getUser().subscribe((res) => {
      this.user = res;
    });
  }
  
  ngAfterViewInit() {
    this.initCytoscape();
  }
  
  initCytoscape() {
    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(displayLabel)',
            'text-valign': 'center',
            'text-halign': 'center',
            shape: 'round-rectangle',
            padding: '10px',
            'background-color': '#90caf9',
            'border-color': '#0d47a1',
            width: 'label',
            height: 'label',
            'border-width': 1,
            'text-wrap': 'wrap',
            'font-size': 12
          }
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'line-color': '#64b5f6',
            'target-arrow-color': '#1976d2',
            width: 2
          }
        },
        {
          selector: 'edge[sourceTag = "sheet"]',
          style: {
            'line-color': 'red',
            'target-arrow-color': 'red',
            width: 2
          }
        },
        {
          selector: '.placeholder',
          style: {
            'background-color': '#f48fb1',
            'border-color': '#c2185b'
          }
        },
        {
          selector: 'node[nodeType = "label"]',
          style: {
            'background-color': '#f48fb1',
            'border-width': 0,
            'font-size': 14,
            'text-valign': 'center',
            'text-halign': 'center'
          }
        },
        {
          selector: 'node[nodeType = "lineAnchor"]',
          style: {
            'width': 5,
            'height': 5,
            'background-color': '#333333',
            'border-width': 0,
            'opacity': 0.5
          }
        },
        {
          selector: 'edge[lineType = "drawn"]',
          style: {
            'curve-style': 'straight',
            'line-color': '#333333',
            'width': 1,
            'target-arrow-shape': 'none'
          }
        }
      ]
    });
    
    this.cy.on('tap', 'node', (evt: any) => {
      const node = evt.target;
      const nodeId = node.id();
      
      if (this.lineMode) {
        const pos = node.position();
        if (!this.lineStartPos) {
          this.lineStartPos = { x: pos.x, y: pos.y };
        } else {
          let endPos = { x: pos.x, y: pos.y };
          
          if (evt.originalEvent && evt.originalEvent.shiftKey) {
            const dx = Math.abs(endPos.x - this.lineStartPos.x);
            const dy = Math.abs(endPos.y - this.lineStartPos.y);
            
            if (dx > dy) {
              endPos.y = this.lineStartPos.y;
            } else {
              endPos.x = this.lineStartPos.x;
            }
          }
          
          this.createLine(this.lineStartPos, endPos);
          this.lineStartPos = null;
          this.lineMode = false;
        }
        return;
      }
      
      if (this.connectMode) {
        if (!this.pendingSource) {
          this.pendingSource = nodeId;
        } else {
          this.addConnection(this.pendingSource, nodeId);
          this.pendingSource = null;
          this.connectMode = false;
        }
        return;
      }
      
      if (node.data('nodeType') === 'label') {
        const newLabel = prompt('Edit Text:', node.data('label'));
        if (newLabel !== null) {
          node.data('label', newLabel);
          node.data('displayLabel', newLabel);
        }
        return;
      }
      
      if (node.data('nodeType') === 'lineAnchor') {
        return;
      }
      
      const newLabel = prompt('Edit Label:', node.data('label'));
      if (newLabel !== null) {
        const details = node.data('details') || {};
        node.data('label', newLabel);
        const extra = Object.entries(details)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');
        node.data('displayLabel', extra ? `${newLabel}\n${extra}` : newLabel);
      }
    });
    
    this.cy.on('tap', (evt: any) => {
      if (evt.target === this.cy && this.lineMode) {
        const pos = evt.position;
        if (!this.lineStartPos) {
          this.lineStartPos = { x: pos.x, y: pos.y };
        } else {
          let endPos = { x: pos.x, y: pos.y };
          
          if (evt.originalEvent && evt.originalEvent.shiftKey) {
            const dx = Math.abs(endPos.x - this.lineStartPos.x);
            const dy = Math.abs(endPos.y - this.lineStartPos.y);
            
            if (dx > dy) {
              endPos.y = this.lineStartPos.y;
            } else {
              endPos.x = this.lineStartPos.x;
            }
          }
          
          this.createLine(this.lineStartPos, endPos);
          this.lineStartPos = null;
          this.lineMode = false;
        }
      }
    });
    
    this.cy.on('drag', 'node[nodeType = "lineAnchor"]', (evt: any) => {
      const node = evt.target;
      const linkedAnchorId = node.data('linkedAnchor');
      
      if (evt.originalEvent && evt.originalEvent.shiftKey && linkedAnchorId) {
        const linkedAnchor = this.cy.$id(linkedAnchorId);
        if (linkedAnchor.length > 0) {
          const linkedPos = linkedAnchor.position();
          const currentPos = node.position();
          
          const dx = Math.abs(currentPos.x - linkedPos.x);
          const dy = Math.abs(currentPos.y - linkedPos.y);
          
          if (dx > dy) {
            node.position({ x: currentPos.x, y: linkedPos.y });
          } else {
            node.position({ x: linkedPos.x, y: currentPos.y });
          }
        }
      }
    });
    
    this.cy.on('cxttap', 'node', (evt: any) => {
      const node = evt.target;
      
      if (node.data('nodeType') === 'lineAnchor') {
        const connectedEdges = node.connectedEdges();
        this.cy.remove(connectedEdges);
        this.cy.remove(node);
        return;
      }
      
      if (confirm(`Delete node "${node.data('label')}"?`)) {
        this.cy.remove(node);
      }
    });
    
    this.cy.on('cxttap', 'edge', (evt: any) => {
      const edge = evt.target;
      if (confirm('Delete connection?')) {
        this.cy.remove(edge);
      }
    });
    
    this.cy.on('resize', 'node', (evt: any) => {
      const node = evt.target;
      node.data('width', node.width());
      node.data('height', node.height());
    });
  }
  
  addNode() {
    const id = 'n' + this.nodeIndex++;
    const label = 'New Node';
    this.cy.add({
      group: 'nodes',
      data: { id, label, displayLabel: label, details: {}, sheetNode: "no" },
      position: { x: 200 + Math.random() * 150, y: 150 + Math.random() * 150 }
    });
  }
  
  enableLineMode() {
    this.lineMode = true;
    this.connectMode = false;
    this.selectedNode = null;
    this.pendingSource = null;
    this.lineStartPos = null;
    alert('Line Mode: Click to place start point, then click for end point. Hold Shift for horizontal/vertical lines.');
  }
  
  createLine(start: { x: number; y: number }, end: { x: number; y: number }) {
    const startNodeId = 'line-start-' + Date.now();
    const endNodeId = 'line-end-' + Date.now();
    const edgeId = 'line-edge-' + Date.now();
    
    this.cy.add([
      {
        group: 'nodes',
        data: {
          id: startNodeId,
          label: '',
          displayLabel: '',
          nodeType: 'lineAnchor',
          sheetNode: 'no',
          linkedAnchor: endNodeId,
          linkedEdge: edgeId
        },
        position: { x: start.x, y: start.y },
        locked: false,
        grabbable: true
      },
      {
        group: 'nodes',
        data: {
          id: endNodeId,
          label: '',
          displayLabel: '',
          nodeType: 'lineAnchor',
          sheetNode: 'no',
          linkedAnchor: startNodeId,
          linkedEdge: edgeId
        },
        position: { x: end.x, y: end.y },
        locked: false,
        grabbable: true
      }
    ]);
    
    this.cy.add({
      group: 'edges',
      data: {
        id: edgeId,
        source: startNodeId,
        target: endNodeId,
        lineType: 'drawn'
      },
      selectable: false
    });
  }
  
  addLabel() {
    const id = 'label-' + Date.now();
    const labelText = prompt('Enter label text:', 'Label') || 'Label';
    
    this.cy.add({
      group: 'nodes',
      data: {
        id,
        label: labelText,
        displayLabel: labelText,
        nodeType: 'label',
        details: {},
        sheetNode: 'no'
      },
      position: { x: 300 + Math.random() * 150, y: 200 + Math.random() * 150 }
    });
  }
  
  snapToCenter() {
    const selectedNodes = this.cy.$(':selected');
    
    if (selectedNodes.length === 0) {
      alert('Please select one or more nodes first (click to select, Ctrl+click for multiple)');
      return;
    }
    
    const extent = this.cy.extent();
    const centerX = (extent.x1 + extent.x2) / 2;
    const centerY = (extent.y1 + extent.y2) / 2;
    
    selectedNodes.forEach((node: any) => {
      node.position({ x: centerX, y: centerY });
    });
  }
  
  snapHorizontal() {
    const selectedNodes = this.cy.$(':selected');
    
    if (selectedNodes.length < 2) {
      alert('Please select at least 2 nodes first (Ctrl+click for multiple)');
      return;
    }
    
    let totalY = 0;
    selectedNodes.forEach((node: any) => {
      totalY += node.position().y;
    });
    const avgY = totalY / selectedNodes.length;
    
    selectedNodes.forEach((node: any) => {
      const pos = node.position();
      node.position({ x: pos.x, y: avgY });
    });
  }
  
  snapVertical() {
    const selectedNodes = this.cy.$(':selected');
    
    if (selectedNodes.length < 2) {
      alert('Please select at least 2 nodes first (Ctrl+click for multiple)');
      return;
    }
    
    let totalX = 0;
    selectedNodes.forEach((node: any) => {
      totalX += node.position().x;
    });
    const avgX = totalX / selectedNodes.length;
    
    selectedNodes.forEach((node: any) => {
      const pos = node.position();
      node.position({ x: avgX, y: pos.y });
    });
  }
  
  onFilterColumnChange() {
    if (this.mapping.filter === null) {
      this.filterValues = [];
      this.selectedFilterValue = '';
      return;
    }
    const colIndex = this.mapping.filter;
    const values = this.rows
      .map(row => this.parseSheetValue(row.c?.[colIndex]?.v))
      .filter(v => v !== undefined && v !== null)
      .map(v => v.toString().trim());
    this.filterValues = [...new Set(values)];
    this.selectedFilterValue = this.filterValues[0] || '';
  }
  
  applyConnectionStyle() {
    if (!this.cy) return;
    switch (this.connectionStyle) {
      case 'straight':
        this.cy.edges().style({ 'curve-style': 'straight' });
        break;
      case 'curve':
        this.cy.edges().style({ 'curve-style': 'bezier', 'control-point-step-size': 40 });
        break;
      case 'angle':
        this.cy.edges().style({ 'curve-style': 'taxi', 'taxi-direction': 'auto', 'taxi-turn': 20 });
        break;
    }
    this.cy.layout({ name: 'preset' }).run();
  }
  
  getConnectionStyle() {
    if (this.connectionStyle === 'straight') return { 'curve-style': 'straight' };
    if (this.connectionStyle === 'curve') return { 'curve-style': 'bezier', 'control-point-step-size': 40 };
    return { 'curve-style': 'taxi', 'taxi-direction': 'auto', 'taxi-turn': 20 };
  }
  
  addConnection(source: string, target: string) {
    const id = `edge-${source}-${target}`;
    if (this.cy.$id(id).length === 0) {
      this.cy.add({
        group: "edges",
        data: { id, source, target },
        style: this.getConnectionStyle()
      });
    }
  }
  
  enableConnect() {
    this.connectMode = true;
    this.lineMode = false;
    this.selectedNode = null;
    this.pendingSource = null;
    this.lineStartPos = null;
  }
  
  layout() {
    try {
      this.cy.layout({ name: 'dagre', rankDir: 'TB', nodeSep: 50 }).run();
    } catch (err) {
      console.warn('Layout error', err);
    }
  }
  
  saveLocal() {
    this.ShowSavingModal = true;
  }
  
  saveDiagramsInformation() {
    if (!this.cy) return;
    this.applyConnectionStyle();
    this.cy.nodes().forEach((node: any) => {
      const label = node.data('label') || '';
      const details = node.data('details') || {};
      const extra = Object.entries(details)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      node.data('displayLabel', extra ? `${label}\n${extra}` : label);
    });
    const json = this.cy.json();
    this.diagramsField.json_data = JSON.stringify(json);
    this.diagramsField.sheet_url = this.sheetUrl || this.diagramsField.sheet_url;
    this.diagramsField.line_category = this.connectionStyle;
    this.diagramsField.created_by = this.user.id;
    this.diagramsField.s_bpartner_i_employee_id = this.user.id;
    if (!this.sheetUrl || this.mapping.dependency === null) {
      this.diagramsField.dependency = 'no';
      this.diagramsField.dependency_value = '';
    } else {
      this.diagramsField.dependency = 'yes';
      this.diagramsField.dependency_value = this.headers[this.mapping.dependency] ?? '';
    }
    if (!this.diagramID) {
      this.DiagramService.storeDiagrams(this.diagramsField).subscribe(
        (res: any) => {
          this.diagramID = res.data.id;
          alert('Diagram Saved');
        },
        () => alert('Failed to save diagram')
      );
    } else {
      this.DiagramService.updateDiagrams(this.diagramsField, this.diagramID).subscribe(
        () => alert('Diagram Updated'),
        () => alert('Failed to update diagram')
      );
    }
  }
  
  clearLocal() {
    localStorage.removeItem('diagram');
    alert('Local Storage Cleared');
  }
  
  colorNodes() {
    this.ShowColorModal = true;
  }
  
  saveColorDiagramsInformation() {
    this.ColorNodeFields.diagram_id = this.diagramID;
    this.ColorNodeFields.color_key = this.ColorNodeFields.color_code;
    this.ColorService.storeDiagramsColorNodes(this.ColorNodeFields).subscribe(() => {
      alert("Color Saved");
    }, () => alert('Failed to save color'));
  }
  
  normalizeDate(value: any): Date | null {
    if (!value) return null;
    
    if (typeof value === 'string' && value.startsWith('Date(')) {
      const match = value.match(/Date\((\d+),(\d+),(\d+)\)/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2])+ 1;
        const day = parseInt(match[3]);
        return new Date(year, month - 1, day);
      }
    }
    
    if (typeof value === 'number') {
      const epoch = new Date(1899, 11, 30);
      return new Date(epoch.getTime() + value * 24 * 60 * 60 * 1000);
    }
    let d = new Date(value);
    if (!isNaN(d.getTime())) return d;
    const parts = value.split('/');
    if (parts.length === 3) {
      const [a, b, c] = parts;
      let month = parseInt(a);
      let day = parseInt(b);
      if (month > 12) { 
        month = parseInt(b);
        day = parseInt(a);
      }
      return new Date(`${month}/${day}/${c}`);
    }
    return null;
  }
  
  autoLayoutByTargetEnd() {
    if (!this.cy) return;
    
    this.cy.nodes('[nodeType = "monthHeader"]').remove();
    this.cy.nodes('[nodeType = "redLine"]').remove();
    
    const groups: any = {};
    let farthestDate: Date | null = null;
    let farthestKey: string | null = null;

    this.cy.nodes().forEach((node: any) => {
      const details = node.data("details") || {};
      const rawEnd = details["Target End"];

      const parsed = this.normalizeDate(rawEnd);

      const key = parsed
        ? `${parsed.getFullYear()}-${(parsed.getMonth() + 1).toString().padStart(2, '0')}`
        : "Unknown";

      if (!groups[key]) {
        groups[key] = {
          nodes: [],
          date: parsed
        };
      }
      groups[key].nodes.push(node);
      
      if (parsed && (!farthestDate || parsed > farthestDate)) {
        farthestDate = parsed;
        farthestKey = key;
      }
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return a.localeCompare(b);
    });

    let baseX = 150;
    const colSpacing = 350;
    const rowSpacing = 180;
    const headerOffset = 80;

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    let farthestX = baseX;
    const farthestNodes: any[] = [];

    sortedKeys.forEach((key, colIndex) => {
      const group = groups[key];
      const colNodes = group.nodes;
      const x = baseX + colIndex * colSpacing;
      
      if (x > farthestX) {
        farthestX = x;
      }
      
      if (key === farthestKey) {
        farthestNodes.push(...colNodes);
      }
      
      let headerLabel = "Unknown";
      if (group.date) {
        const monthName = monthNames[group.date.getMonth()];
        const year = group.date.getFullYear();
        headerLabel = `${monthName} ${year} target end`;
      }

      this.cy.add({
        group: 'nodes',
        data: {
          id: `header-${key}`,
          label: headerLabel,
          displayLabel: headerLabel,
          nodeType: 'monthHeader'
        },
        position: { x: x, y: 50 },
        style: {
          'background-color': '#ffffff',
          'border-color': '#333333',
          'border-width': 0,
          'font-size': 14,
          'font-weight': 'bold',
          'text-valign': 'center',
          'text-halign': 'center',
          'width': 'label',
          'height': 'label',
          'padding': '10px'
        },
        locked: true,
        grabbable: false
      });

      let yStart = 50 + headerOffset;
      colNodes.forEach((node: any, i: number) => {
        node.position({
          x: x,
          y: yStart + i * rowSpacing
        });
      });
    });

    if (sortedKeys.length > 0) {
      const lastKey = sortedKeys[sortedKeys.length - 1];
      const lastGroup = groups[lastKey];
      const numNodes = lastGroup.nodes.length;
      const lineHeight = (50 + headerOffset) + (numNodes * rowSpacing) + 100;
      
      const lineId = 'redline-' + Date.now();
      
      this.cy.add({
        group: 'nodes',
        data: {
          id: lineId,
          label: '',
          displayLabel: '',
          nodeType: 'redLine',
          sheetNode: 'no'
        },
        position: { x: farthestX, y: lineHeight / 2 },
        style: {
          'shape': 'rectangle',
          'width': 3,
          'height': lineHeight,
          'background-color': '#ff0000',
          'border-width': 0
        },
        locked: true,
        grabbable: false
      });
    }
    
    const farthestNodeIds = new Set(farthestNodes.map((n: any) => n.id()));
    
    this.cy.edges('[sourceTag = "sheet"]').forEach((edge: any) => {
      edge.style({
        'line-color': '#333333',
        'target-arrow-color': '#333333',
        'width': 2
      });
    });

    this.cy.animate({
      fit: { padding: 50 },
      duration: 600
    });
  }

  extractSheetID(url: string) {
    if (!url) return null;
    const match = url.match(/\/d\/(.*?)\//);
    return match ? match[1] : null;
  }
  
  openSheetImport() {
    this.showImportModal = true;
  }
  
  loadSheet() {
    const sheetId = this.extractSheetID(this.sheetUrl);
    if (!sheetId) {
      alert('Invalid Google Sheet URL');
      return;
    }
    this.loadSheetFromUrl(this.sheetUrl, true);
  }
  
  loadSheetFromUrl(url: string, generate: boolean = false) {
    const sheetId = this.extractSheetID(url);
    if (!sheetId) {
      alert('Invalid Google Sheet URL');
      return;
    }
    fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`)
      .then(res => res.text())
      .then(text => {
        const json = JSON.parse(text.substr(47).slice(0, -2));
        this.headers = json.table.cols.map((c: any) => c.label || 'Column');
        this.rows = json.table.rows || [];
        if (!this.selectedNodeDisplay || this.selectedNodeDisplay.length !== this.headers.length) {
          this.selectedNodeDisplay = new Array(this.headers.length).fill(false);
        }
        this.restoreMappingFromSavedNodeData();
        this.diagramsField.sheet_url = url;
        if (generate) {
          this.restoreMappingFromSavedNodeData();
          this.applySavedMapping();
          this.generateNodesDynamic();
        } else {
          this.restoreMappingFromSavedNodeData();
        }
      })
      .catch(err => {
        console.error(err);
        alert('Failed to load sheet.');
      });
  }
  
  applySavedMapping() {
    if (!this.headers.length) return;
    this.mapping.id = 0;
    this.mapping.label = 1;
    if (this.diagramsField.dependency === 'yes') {
      const depIndex = this.headers.indexOf(this.diagramsField.dependency_value!);
      this.mapping.dependency = depIndex >= 0 ? depIndex : null;
    } else {
      this.mapping.dependency = null;
    }
  }
  
  parseSheetValue(value: any) {
    if (typeof value === 'string' && value.startsWith('Date(')) {
      const match = value.match(/Date\((\d+),(\d+),(\d+)\)/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) + 1;
        const day = parseInt(match[3]);
        const result = `${month}/${day}/${year}`;
        return result;
      }
    }
    if (typeof value === 'number') {
      const epoch = new Date(1899, 11, 30);
      const milliseconds = Math.floor(value) * 24 * 60 * 60 * 1000;
      const date = new Date(epoch.getTime() + milliseconds);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      const result = `${month}/${day}/${year}`;
      return result;
    }
    const result = value?.toString() ?? '';
    return result;
  }
  
  generateNodesDynamic() {
    if (!this.cy) return;
    const existingPositions = new Map<string, {x: number, y: number}>();
    this.cy.nodes().filter((n: any) => n.data('sheetNode') === 'yes').forEach((node: any) => {
      existingPositions.set(node.id(), {
        x: node.position().x,
        y: node.position().y
      });
    });
    
    this.cy.nodes().filter((n: any) => n.data('sheetNode') === 'yes').remove();
    this.cy.edges('[sourceTag = "sheet"]').remove();
    const selectedHeaders = this.headers
      .filter((_, i) => this.selectedNodeDisplay[i])
      .map(h => h.trim());
    this.diagramsField.node_data = selectedHeaders.join(',');
    const idCol = this.mapping.id;
    const labelCol = this.mapping.label;
    const depCol = this.mapping.dependency;
    const filterCol = this.mapping.filter;
    
    const existingNodeIds = new Set<string>();
    const nodeDependencies: Array<{nodeId: string, dependencies: string[]}> = [];
    
    for (const row of this.rows) {
      const cells = row.c;
      if (!cells) continue;
      if (filterCol !== null) {
        const filterValue = this.parseSheetValue(cells[filterCol]?.v)?.toString().trim() || "";
        if (filterValue !== this.selectedFilterValue) {
          continue;
        }
      }
      let nodeId = this.parseSheetValue(cells[idCol]?.v)?.toString() || "";
      const nodeLabel = this.parseSheetValue(cells[labelCol]?.v)?.toString() || "";
      if (!nodeId) continue;
      
      if (existingNodeIds.has(nodeId)) {
        nodeId = `${nodeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      existingNodeIds.add(nodeId);
      
      const details: any = {};
      this.headers.forEach((header, index) => {
        if (this.selectedNodeDisplay[index]) {
          details[header] = this.parseSheetValue(cells[index]?.v);
        }
      });
      let nodeColor = "#E3E3E3";
      const statusValue = details["Status"] ?? details["status"] ?? details["STATUS"] ?? details["project_status"];
      nodeColor = this.getStatusColor(statusValue);
      const extra = Object.entries(details)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      const displayLabel = extra ? `${nodeLabel}\n${extra}` : nodeLabel;
      
      // Use existing position if available, otherwise use random position
      const savedPosition = existingPositions.get(nodeId);
      const position = savedPosition || { x: Math.random() * 600, y: Math.random() * 600 };
      
      this.cy.add({
        group: "nodes",
        data: {
          id: nodeId,
          label: nodeLabel,
          displayLabel,
          details,
          sheetNode: "yes"
        },
        style: {
          "background-color": nodeColor,
          "border-color": "#1a237e"
        },
        position: position
      });
      
      if (depCol !== null) {
        const depRaw = this.parseSheetValue(cells[depCol]?.v)?.toString() || "";
        const dependencies = depRaw.split(",").map((v: string) => v.trim()).filter((v: string | any[]) => v.length > 0);
        nodeDependencies.push({ nodeId, dependencies });
      }
    }
    
    for (const { nodeId, dependencies } of nodeDependencies) {
      dependencies.forEach((dep: any) => {
        const targetNode = this.cy.$id(nodeId);
        const sourceNode = this.cy.$id(dep);
        
        if (targetNode.length > 0 && sourceNode.length > 0) {
          this.cy.add({
            group: "edges",
            data: {
              id: `edge-${dep}-${nodeId}-${Math.random()}`,
              source: dep,
              target: nodeId,
              sourceTag: "sheet"
            },
            style: this.getConnectionStyle()
          });
        }
      });
    }
    this.showCriticalPath();
    this.refreshNodeColors();
    const hasNewNodes = Array.from(existingNodeIds).some(id => !existingPositions.has(id));
    if (hasNewNodes || existingPositions.size === 0) {
      this.layout();
    }
  }
  
  refreshFromSheet() {
    if (!this.diagramsField.sheet_url) {
      alert("No Google Sheet linked.");
      return;
    }
    
    const sheetId = this.extractSheetID(this.diagramsField.sheet_url);
    if (!sheetId) {
      alert('Invalid Google Sheet URL');
      return;
    }
    
    fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`)
      .then(res => res.text())
      .then(text => {
        const json = JSON.parse(text.substr(47).slice(0, -2));
        this.headers = json.table.cols.map((c: any) => c.label || 'Column');
        this.rows = json.table.rows || [];
        
        this.updateNodesFromSheet();
        this.showCriticalPath();
        
        alert('Data refreshed and critical path highlighted!');
      })
      .catch(err => {
        console.error(err);
        alert('Failed to refresh sheet data.');
      });
  }
  
  showCriticalPath() {
    if (!this.cy) return;
    this.cy.edges('[sourceTag = "sheet"]').forEach((edge: any) => {
      edge.style({
        'line-color': '#333333',
        'target-arrow-color': '#333333',
        'width': 2
      });
    });
    let farthestTimestamp: number | null = null;
    let farthestNodeId: string | null = null;
    
    this.cy.nodes('[sheetNode = "yes"]').forEach((node: any) => {
      const incomingEdges = node.incomers('edge[sourceTag = "sheet"]');
      if (incomingEdges.length === 0) {
        return;
      }
      
      const details = node.data("details") || {};
      const rawEnd = details["Effective Target End"] || 
                    details["Effective Target end"] || 
                    details["effective target end"] ||
                    details["EffectiveTargetEnd"] ||
                    details["effective_target_end"];
      
      if (rawEnd) {
        const parsed = this.normalizeDate(rawEnd);
        
        if (parsed && !isNaN(parsed.getTime())) {
          const timestamp = parsed.getTime();
          if (farthestTimestamp === null || timestamp > farthestTimestamp) {
            farthestTimestamp = timestamp;
            farthestNodeId = node.id();
          }
        }
      }
    });
    
    if (!farthestNodeId || farthestTimestamp === null) {
      return;
    }
    const criticalPathEdges = new Set<string>();
    const nodesToProcess: string[] = [farthestNodeId];
    const processedNodes = new Set<string>();
    
    while (nodesToProcess.length > 0) {
      const currentNodeId = nodesToProcess.pop()!;
      
      if (processedNodes.has(currentNodeId)) {
        continue;
      }
      processedNodes.add(currentNodeId);
      
      const currentNode = this.cy.$id(currentNodeId);
      const incomingEdges = currentNode.incomers('edge[sourceTag = "sheet"]');
      
      if (incomingEdges.length === 0) {
        continue;
      }
      let maxTimestamp: number | null = null;
      let maxSourceNode: any = null;
      let maxEdge: any = null;
      
      incomingEdges.forEach((edge: any) => {
        const sourceNode = edge.source();
        const details = sourceNode.data("details") || {};
        const rawEnd = details["Effective Target End"] || 
                      details["Effective Target end"] || 
                      details["effective target end"] ||
                      details["EffectiveTargetEnd"] ||
                      details["effective_target_end"];
        
        if (rawEnd) {
          const parsed = this.normalizeDate(rawEnd);
          if (parsed && !isNaN(parsed.getTime())) {
            const timestamp = parsed.getTime();
            if (maxTimestamp === null || timestamp > maxTimestamp) {
              maxTimestamp = timestamp;
              maxSourceNode = sourceNode;
              maxEdge = edge;
            }
          }
        }
      });
      if (maxEdge && maxSourceNode) {
        criticalPathEdges.add(maxEdge.id());
        nodesToProcess.push(maxSourceNode.id());
      }
    }
    criticalPathEdges.forEach((edgeId: string) => {
      const edge = this.cy.$id(edgeId);
      if (edge.length > 0) {
        edge.style({
          'line-color': 'red',
          'target-arrow-color': 'red',
          'width': 3
        });
      }
    });
  }
  
  updateNodesFromSheet() {
    if (!this.cy || !this.rows.length) return;
    
    const idCol = this.mapping.id;
    const labelCol = this.mapping.label;
    const filterCol = this.mapping.filter;
    
    const existingSheetNodes = this.cy.nodes('[sheetNode = "yes"]');
    
    const updatedDataMap = new Map();
    
    for (const row of this.rows) {
      const cells = row.c;
      if (!cells) continue;
      
      if (filterCol !== null) {
        const filterValue = this.parseSheetValue(cells[filterCol]?.v)?.toString().trim() || "";
        if (filterValue !== this.selectedFilterValue) {
          continue;
        }
      }
      
      const nodeId = this.parseSheetValue(cells[idCol]?.v)?.toString() || "";
      if (!nodeId) continue;
      
      const nodeLabel = this.parseSheetValue(cells[labelCol]?.v)?.toString() || "";
      
      const details: any = {};
      this.headers.forEach((header, index) => {
        if (this.selectedNodeDisplay[index]) {
          details[header] = this.parseSheetValue(cells[index]?.v);
        }
      });
      
      let nodeColor = "#E3E3E3";
      const statusValue = details["Status"] ?? details["status"] ?? details["STATUS"] ?? details["project_status"] ?? details["Project Status"];
      nodeColor = this.getStatusColor(statusValue);
      
      updatedDataMap.set(nodeId, {
        label: nodeLabel,
        details: details,
        color: nodeColor
      });
    }
    
    existingSheetNodes.forEach((node: any) => {
      const nodeId = node.id();
      const updatedData = updatedDataMap.get(nodeId);
      
      if (updatedData) {
        node.data('label', updatedData.label);
        node.data('details', updatedData.details);
        
        const extra = Object.entries(updatedData.details)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        const displayLabel = extra ? `${updatedData.label}\n${extra}` : updatedData.label;
        node.data('displayLabel', displayLabel);
        
        node.style('background-color', updatedData.color);
        
        updatedDataMap.delete(nodeId);
      }
    });
  }
  
  getStatusColorsList(): Array<{status: string, color: string}> {
    return Object.entries(this.statusColors).map(([status, color]) => ({
      status,
      color: color as string
    }));
  }
  
  addCustomStatus() {
    const status = prompt('Enter status name:');
    if (!status) return;
    
    const color = prompt('Enter color (hex format, e.g., #FF5733):', '#E3E3E3');
    if (!color) return;
    
    this.statusColors[status] = color;
    alert(`Status "${status}" added with color ${color}`);
  }
  
  removeCustomStatus(status: string) {
    if (confirm(`Remove status "${status}"?`)) {
      delete this.statusColors[status];
      alert(`Status "${status}" removed`);
    }
  }
  
  editStatusColor(status: string) {
    const newColor = prompt(`Enter new color for "${status}" (hex format):`, this.statusColors[status]);
    if (newColor) {
      this.statusColors[status] = newColor;
      alert(`Color for "${status}" updated to ${newColor}`);
      this.refreshNodeColors();
    }
  }
  
  refreshNodeColors() {
    if (!this.cy) return;
    
    this.cy.nodes('[sheetNode = "yes"]').forEach((node: any) => {
      const details = node.data('details') || {};
      const statusValue = details["Status"] ?? details["status"] ?? details["STATUS"] ?? details["project_status"]?? details["Project Status"];
      node.style('background-color', this.getStatusColor(statusValue));
    });
  }
  
  searchNodes() {
    if (!this.cy || !this.searchQuery.trim()) {
      this.clearSearch();
      return;
    }
    
    this.cy.nodes().removeClass('highlighted');
    
    const query = this.searchQuery.toLowerCase().trim();
    this.searchResults = [];
    
    this.cy.nodes('[sheetNode = "yes"]').forEach((node: any) => {
      const label = (node.data('label') || '').toLowerCase();
      const details = node.data('details') || {};
      const detailsText = Object.values(details).join(' ').toLowerCase();
      
      if (label.includes(query) || detailsText.includes(query)) {
        this.searchResults.push(node);
      }
    });
    
    if (this.searchResults.length > 0) {
      this.currentSearchIndex = 0;
      this.highlightSearchResult();
    } else {
      alert('No nodes found matching your search.');
    }
  }
  
  highlightSearchResult() {
    if (this.searchResults.length === 0) return;
    
    this.cy.nodes().removeClass('highlighted');
    
    this.searchResults.forEach((node: any, index: number) => {
      if (index === this.currentSearchIndex) {
        node.addClass('highlighted');
        node.style({
          'border-width': 4,
          'border-color': '#FF5722'
        });
        
        this.cy.animate({
          center: {
            eles: node
          },
          zoom: 1.5,
          duration: 500
        });
      } else {
        node.style({
          'border-width': 2,
          'border-color': '#FFA726'
        });
      }
    });
  }
  
  nextSearchResult() {
    if (this.searchResults.length === 0) return;
    
    this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
    this.highlightSearchResult();
  }
  
  previousSearchResult() {
    if (this.searchResults.length === 0) return;
    
    this.currentSearchIndex = this.currentSearchIndex - 1;
    if (this.currentSearchIndex < 0) {
      this.currentSearchIndex = this.searchResults.length - 1;
    }
    this.highlightSearchResult();
  }
  
  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.currentSearchIndex = -1;
    
    if (this.cy) {
      this.cy.nodes().removeClass('highlighted');
      this.cy.nodes('[sheetNode = "yes"]').forEach((node: any) => {
        node.style({
          'border-width': 1,
          'border-color': '#1a237e'
        });
      });
    }
  }
  
  zoomIn() {
    if (!this.cy) return;
    const currentZoom = this.cy.zoom();
    this.cy.animate({
      zoom: currentZoom * 1.2,
      duration: 300
    });
  }
  
  zoomOut() {
    if (!this.cy) return;
    const currentZoom = this.cy.zoom();
    this.cy.animate({
      zoom: currentZoom * 0.8,
      duration: 300
    });
  }
  
  resetZoom() {
    if (!this.cy) return;
    this.cy.animate({
      fit: { padding: 50 },
      duration: 500
    });
  }
  
  zoomToFit() {
    if (!this.cy) return;
    this.cy.fit(this.cy.nodes('[sheetNode = "yes"]'), 50);
  }
  
  hasSavedMapping() {
    return (
      this.diagramsField.node_data &&
      this.diagramsField.node_data.length > 0 &&
      this.diagramsField.dependency_value !== undefined
    );
  }
  
  loadSheetForRefresh() {
    this.refreshFromSheet();
  }
  
  fetchDiagramByID() {
    this.DiagramService.displayDiagramsbyID(this.diagramID!).subscribe((data) => {
      this.diagramsField = data;
      if (this.diagramsField.sheet_url) {
        this.sheetUrl = this.diagramsField.sheet_url;
        this.loadSheetFromUrl(this.diagramsField.sheet_url, false);
      }
      if (!this.jsonLoaded && this.diagramsField.json_data) {
        try {
          const json = JSON.parse(this.diagramsField.json_data);
          this.cy.json(json);
          this.jsonLoaded = true;
          setTimeout(() => {
            this.cy.nodes().forEach((node: any) => node.trigger('resize'));
            this.cy.edges().forEach((edge: any) => edge.trigger('position'));
            this.connectionStyle = (this.diagramsField.line_category as any) || this.connectionStyle;
            this.applyConnectionStyle();
            this.cy.fit();
            
            this.refreshNodeColors();
            
            if (this.diagramsField.sheet_url) {
              this.showCriticalPath();
            }
          }, 100);
        } catch (err) {
          console.warn('Invalid saved json_data');
        }
      }
      this.restoreMappingFromSavedNodeData();
    }, (err) => {
      console.error(err);
      alert('Failed to fetch diagram');
    });
  }
  
  restoreMappingFromSavedNodeData() {
    if (!this.diagramsField.node_data) return;
    if (!this.headers || this.headers.length === 0) {
      return;
    }
    const nodeList = this.diagramsField.node_data.split(',').map(x => x.trim()).filter(Boolean);
    this.selectedNodeDisplay = this.headers.map(h => nodeList.includes(h));
  }
  
  ngOnDestroy() {
    if (this.cy) this.cy.destroy();
  }
  autoLayout() {
    if (!this.cy) return;
    const sheetNodes = this.cy.nodes('[sheetNode = "yes"]');
    if (sheetNodes.length === 0) {
      alert('No sheet nodes to layout. Please import data from Google Sheets first.');
      return;
    }
    const confirmed = confirm('Are you sure you want to auto-layout the nodes?');
    if (!confirmed) return;
    try {
      this.cy.layout({
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 80,
        rankSep: 120,
        padding: 50,
        animate: true,
        animationDuration: 500,
        fit: true
      }).run();
    } catch (err) {
      console.error('Auto layout error:', err);
      alert('Failed to apply auto layout');
    }
  }
}