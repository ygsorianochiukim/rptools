import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { LucideAngularModule, Workflow, Spline, GitBranchPlus, Save, Shapes, RouteOff, Palette, BetweenHorizontalStart, SquareMousePointer, RefreshCcw } from 'lucide-angular';
import { DiagramsService } from '../../Services/diagrams.service';
import { ColornodesService } from '../../Services/ColorNodes/colornodes.service';
import { Diagrams } from '../../Models/Diagrams/diagrams.model';
import { ColorNodes } from '../../Models/ColorNodes/color-nodes.model';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../Services/Auth/auth-services.service';

(cytoscape as any).use(dagre);

interface DynamicRow {
  [key: string]: string;
}

@Component({
  selector: 'app-diagram',
  imports: [LucideAngularModule, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './diagrams.component.html',
  styleUrls: ['./diagrams.component.scss'],
  providers: [DiagramsService, ColornodesService , AuthService]
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

  @ViewChild('cyContainer') cyContainer!: ElementRef;

  cy: any;
  nodeIndex = 1;
  connectMode = false;
  selectedNode: any = null;
  connectionStyle: 'straight' | 'curve' | 'angle' = 'straight';
  pendingSource: string | null = null;

  selectedNodeDisplay: any[] = [];

  // Modal controls
  showImportModal = false;
  ShowSavingModal = false;
  ShowColorModal = false;
  showMappingModal = false;

  sheetUrl = '';
  headers: string[] = [];
  rows: any[] = [];
  mapping = { id: 0, label: 1, dependency: null as number | null };

  diagramsField: Diagrams = {
    name: '',
    description: '',
    json_data: '',
    line_category: '',
    node_data: '',
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

  diagramID: number | null = null;

  constructor(
    private DiagramService: DiagramsService,
    private ColorService: ColornodesService,
    private route: ActivatedRoute,
    private AuthServices: AuthService
  ) {}

  ngOnInit() {
    this.diagramID = this.route.snapshot.params['id'];

    if (this.diagramID) {
      this.fetchDiagramByID();
    }
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
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            shape: 'round-rectangle',
            padding: '10px',
            'background-color': '#90caf9',
            'border-color': '#0d47a1',
            width: '200px',
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
          selector: '.placeholder',
          style: {
            'background-color': '#f48fb1',
            'border-color': '#c2185b'
          }
        }
      ]
    });

    // Node click
    this.cy.on('tap', 'node', (evt: any) => {
      if (this.connectMode) {
        const node = evt.target;

        if (this.selectedNode && this.selectedNode.id() !== node.id()) {
          this.cy.add({
            group: 'edges',
            data: {
              id: 'e' + Date.now(),
              source: this.selectedNode.id(),
              target: node.id()
            }
          });
          this.selectedNode = null;
          this.connectMode = false;
        } else {
          this.selectedNode = node;
        }
        return;
      }

      const node = evt.target;
      const newLabel = prompt('Edit Label:', node.data('label'));
      if (newLabel !== null) node.data('label', newLabel);
    });

    // Right click delete node
    this.cy.on('cxttap', 'node', (evt: any) => {
      const node = evt.target;
      if (confirm(`Delete node "${node.data('label')}"?`)) {
        this.cy.remove(node);
      }
    });

    // Right click delete edge
    this.cy.on('cxttap', 'edge', (evt: any) => {
      const edge = evt.target;
      if (confirm('Delete connection?')) {
        this.cy.remove(edge);
      }
    });
    this.cy.on('tap', 'node', (evt: any) => {
      const nodeId = evt.target.id();

      // Connecting two nodes
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

      // Normal click → rename
      const node = evt.target;
      const newLabel = prompt('Edit Label:', node.data('label'));
      if (newLabel !== null) node.data('label', newLabel);
    });

  }

  // -----------------------------
  // Toolbar Actions
  // -----------------------------


  
  addNode() {
    const id = 'n' + this.nodeIndex++;
    this.cy.add({
      group: 'nodes',
      data: { id, label: 'New Node' },
      position: { x: 200 + Math.random() * 150, y: 150 + Math.random() * 150 }
    });
  }
  applyConnectionStyle() {
    if (!this.cy) return;

    switch (this.connectionStyle) {
      case 'straight':
        this.cy.edges().style({
          'curve-style': 'straight'
        });
        break;

      case 'curve':
        this.cy.edges().style({
          'curve-style': 'bezier',
          'control-point-step-size': 40
        });
        break;

      case 'angle':
        this.cy.edges().style({
          'curve-style': 'taxi',
          'taxi-direction': 'auto',
          'taxi-turn': 20
        });
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
    this.cy.add({
      group: "edges",
      data: {
        id: `edge-${source}-${target}`,
        source: source,
        target: target
      },
      style: this.getConnectionStyle()
    });
  }

  enableConnect() {
    this.connectMode = true;
    this.selectedNode = null;
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
    const json = this.cy.json();
    this.diagramsField.json_data = JSON.stringify(json);
    this.diagramsField.sheet_url = this.sheetUrl;

    if (!this.diagramID) {
      this.diagramsField.line_category = this.connectionStyle;
      this.DiagramService.storeDiagrams(this.diagramsField).subscribe((res: any) => {
        this.diagramID = res.data.id;
      });
      debugger;
      alert('Diagram Saved');
    } else {
      this.DiagramService.updateDiagrams(this.diagramsField, this.diagramID).subscribe();
      alert('Diagram Updated');
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
    });
  }

  // -----------------------------
  // Google Sheet Import
  // -----------------------------

  extractSheetID(url: string) {
    const match = url.match(/\/d\/(.*?)\//);
    return match ? match[1] : null;
  }

  openSheetImport() {
    this.showImportModal = true;
  }

  loadSheet() {
    var sheetId;
    if (this.diagramsField.sheet_url) {
      sheetId = this.extractSheetID(this.diagramsField.sheet_url);
    }
    else{
      sheetId = this.extractSheetID(this.sheetUrl);
    }

    if (!sheetId) {
      alert('Invalid Google Sheet URL');
      return;
    }

    fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`)
      .then(res => res.text())
      .then(text => {
        const json = JSON.parse(text.substr(47).slice(0, -2));

        // Headers
        this.headers = json.table.cols.map((c: any) => c.label || 'Column');

        this.restoreMappingFromSavedNodeData();

        // Rows
        this.rows = json.table.rows;

        this.showMappingModal = true;
      })
      .catch(() => alert('Failed to load sheet.'));
  }

  // -----------------------------
  // FINAL NODE GENERATION (DYNAMIC)
  // -----------------------------

  generateNodesDynamic() {
    this.cy.elements().remove();

    const data = this.rows.map((row: any, i: number) => {
      const cells = row.c;

      const id = cells[this.mapping.id]?.v?.toString().trim() || `auto-${i}`;
      const label = cells[this.mapping.label]?.v?.toString().trim() || id;
      const dep = this.mapping.dependency !== null
        ? cells[this.mapping.dependency]?.v?.toString().trim()
        : '';

      return { id, label, dep };
    });



    const idSet = new Set(data.map(x => x.id));

    // Create nodes
    data.forEach((item, i) => {
      this.cy.add({
        group: 'nodes',
        data: { id: item.id, label: item.label, details: item },
        position: { x: 200 + (i % 4) * 260, y: 120 + Math.floor(i / 4) * 150 }
      });
    });

    // Add dependencies
    data.forEach((item) => {
      if (!item.dep) return;

      const deps = item.dep.split(',').map((x: string) => x.trim());

      deps.forEach((dep: any) => {
        if (!idSet.has(dep)) {
          this.cy.add({
            group: 'nodes',
            classes: 'placeholder',
            data: { id: dep, label: dep }
          });
        }

        this.cy.add({
          group: 'edges',
          data: { id: `e-${dep}-${item.id}`, source: dep, target: item.id }
        });
      });
    });
    const selectedHeaders = this.headers
      .filter((_, i) => this.selectedNodeDisplay[i]) // get only checked items
      .join(','); // convert to comma-separated string

    this.diagramsField.node_data = selectedHeaders;

    console.log('Saved node_data:', this.diagramsField.node_data);

    this.layout();
  }
  refreshFromSheet() {
    if (!this.diagramsField.sheet_url) {
      alert("No Google Sheet linked.");
      return;
    }

    this.loadSheetForRefresh();
  } 

  loadSheetForRefresh() {
    const sheetId = this.extractSheetID(this.diagramsField.sheet_url!);

    if (!sheetId) {
      alert("Invalid Google Sheet URL");
      return;
    }

    fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`)
      .then(res => res.text())
      .then(text => {
        const json = JSON.parse(text.substr(47).slice(0, -2));

        const newRows = json.table.rows;
        if (!newRows) {
          alert("No rows found in sheet.");
          return;
        }

        this.rows = newRows;
        this.generateNodesDynamic();
        alert("Diagram refreshed from Google Sheet!");
      })
      .catch(err => {
        console.error(err);
        alert("Failed to refresh sheet data.");
      });
  }

  fetchUser(){
    this.AuthServices.getUserFromAPI().subscribe((Userdata) => {
      this.User = Userdata;
      this.Name = this.User.firstname + " " + this.User.lastname;
    });
  }


  fetchDiagramByID() {
    this.DiagramService.displayDiagramsbyID(this.diagramID!).subscribe((data) => {
      this.diagramsField = data;

      if (this.diagramsField.json_data) {
        const json = JSON.parse(this.diagramsField.json_data);

        setTimeout(() => {
          this.cy.json(json);
          this.cy.fit();

          // ✅ APPLY SAVED LINE STYLE
          this.connectionStyle = this.diagramsField.line_category as any;
          this.applyConnectionStyle();
        }, 300);
      }

      // ✅ RESTORE selectedNodeDisplay
      if (this.diagramsField.node_data) {
        const savedHeaders = this.diagramsField.node_data.split(',').map(x => x.trim());
        this.selectedNodeDisplay = this.headers.map(h => savedHeaders.includes(h));
      }

      // FIX: mapping restoration
      this.restoreMappingFromSavedNodeData();
    });
  }

  restoreMappingFromSavedNodeData() {
    if (!this.diagramsField.node_data || this.headers.length === 0) return;

    const nodeList = this.diagramsField.node_data.split(',').map(x => x.trim());

    this.selectedNodeDisplay = this.headers.map(h => nodeList.includes(h));
  }



  ngOnDestroy() {
    if (this.cy) this.cy.destroy();
  }
}
