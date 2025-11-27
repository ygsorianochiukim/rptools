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
import nodeResize from 'cytoscape-node-resize';
(cytoscape as any).use(nodeResize);
(cytoscape as any).use(dagre);

@Component({
  selector: 'app-diagram',
  imports: [LucideAngularModule, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './diagrams.component.html',
  styleUrls: ['./diagrams.component.scss'],
  providers: [DiagramsService, ColornodesService]
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

  selectedNodeDisplay: boolean[] = [];
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

  diagramID: number | null = null;

  constructor(
    private DiagramService: DiagramsService,
    private ColorService: ColornodesService,
    private route: ActivatedRoute
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
            label: 'data(displayLabel)',
            'text-valign': 'center',
            'text-halign': 'center',
            shape: 'round-rectangle',
            padding: '20px',
            'background-color': '#90caf9',
            'border-color': '#0d47a1',
            width: '400px',
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
          selector: '.placeholder',
          style: {
            'background-color': '#f48fb1',
            'border-color': '#c2185b'
          }
        }
      ]
    });
    this.cy.on('tap', 'node', (evt: any) => {
      const node = evt.target;
      const nodeId = node.id();
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

    this.cy.on('cxttap', 'node', (evt: any) => {
      const node = evt.target;
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
      console.log(`Resized ${node.data('id')} to ${node.width()}x${node.height()}`);
    });
  }

  // -----------------------------
  // Toolbar Actions
  // -----------------------------

  addNode() {
    const id = 'n' + this.nodeIndex++;
    const label = 'New Node';
    this.cy.add({
      group: 'nodes',
      data: { id, label, displayLabel: label, details: {} },
      position: { x: 200 + Math.random() * 150, y: 150 + Math.random() * 150 }
    });
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
    this.selectedNode = null;
    this.pendingSource = null;
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

    // 3️⃣ Prepare JSON for saving
    const json = this.cy.json();
    this.diagramsField.json_data = JSON.stringify(json);
    this.diagramsField.sheet_url = this.sheetUrl || this.diagramsField.sheet_url;
    this.diagramsField.line_category = this.connectionStyle;

    // 4️⃣ Handle dependency info
    if (!this.sheetUrl || this.mapping.dependency === null) {
      // No sheet or no dependency column selected
      this.diagramsField.dependency = 'no';
      this.diagramsField.dependency_value = '';
    } else {
      // Sheet exists, handle dependency column
      this.diagramsField.dependency = 'yes';
      this.diagramsField.dependency_value = this.headers[this.mapping.dependency] ?? '';
    }

    // 5️⃣ Save or update diagram
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

  // -----------------------------
  // Google Sheet Import (centralized)
  // -----------------------------

  extractSheetID(url: string) {
    if (!url) return null;
    const match = url.match(/\/d\/(.*?)\//);
    return match ? match[1] : null;
  }

  openSheetImport() {
    this.showImportModal = true;
  }

  loadSheet() {
    // Called from import modal: use sheetUrl (input)
    const sheetId = this.extractSheetID(this.sheetUrl);
    if (!sheetId) {
      alert('Invalid Google Sheet URL');
      return;
    }
    this.loadSheetFromUrl(this.sheetUrl, true);
  }

  /**
   * Central function to load headers & rows from a sheet URL.
   * If generate === true, it will generate nodes immediately.
   */
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

        // Headers & rows
        this.headers = json.table.cols.map((c: any) => c.label || 'Column');
        this.rows = json.table.rows || [];

        // ensure selectedNodeDisplay has the right length
        if (!this.selectedNodeDisplay || this.selectedNodeDisplay.length !== this.headers.length) {
          this.selectedNodeDisplay = new Array(this.headers.length).fill(false);
        }

        // if diagram has saved node_data, restore selections before generating
        this.restoreMappingFromSavedNodeData();

        // if this was a saved diagram being opened, persist the sheet URL to diagramsField
        this.diagramsField.sheet_url = url;

        if (generate) {
          this.generateNodesDynamic();
        } else {
          // show mapping modal (if from import)
          this.showMappingModal = true;
        }

      })
      .catch(err => {
        console.error(err);
        alert('Failed to load sheet.');
      });
  }

  // -----------------------------
  // FINAL NODE GENERATION (DYNAMIC)
  // -----------------------------

  generateNodesDynamic() {
    // remove everything safely
    if (this.cy) this.cy.elements().remove();

    // build selected headers array from UI (selectedNodeDisplay)
    const selectedHeaders = this.headers
      .filter((_, i) => this.selectedNodeDisplay[i])
      .map(h => h.trim());

    // save into DB model (as comma list)
    this.diagramsField.node_data = selectedHeaders.join(',');

    // Build rows -> nodes
    const data = this.rows.map((row: any, i: number) => {
      const cells = row.c || [];

      const id = (cells[this.mapping.id]?.v ?? `auto-${i}`).toString().trim();
      const label = (cells[this.mapping.label]?.v ?? id).toString().trim();

      // prepare details: only include selected headers
      const details: Record<string, any> = {};
      selectedHeaders.forEach(h => {
        const colIndex = this.headers.indexOf(h);
        details[h] = (cells[colIndex]?.v ?? '').toString();
      });

      // dependency handling
      const dep = this.mapping.dependency !== null
        ? (cells[this.mapping.dependency]?.v ?? '').toString().trim()
        : '';

      return { id, label, dep, details };
    });



    const idSet = new Set(data.map(x => x.id));

    // Create nodes with displayLabel combining label + selected fields
    data.forEach((item, i) => {
      const extra = Object.entries(item.details)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      const displayLabel = extra ? `${item.label}\n${extra}` : item.label;

      // avoid duplicate nodes
      if (this.cy.$id(item.id).length === 0) {
        this.cy.add({
          group: 'nodes',
          data: { id: item.id, label: item.label, displayLabel, details: item.details },
          position: { x: 200 + (i % 4) * 260, y: 120 + Math.floor(i / 4) * 150 }
        });
      }
    });

    // Add dependencies (edges & placeholders for missing nodes)
    data.forEach((item) => {
      if (!item.dep) return;

      const deps = item.dep.split(',').map((x: string) => x.trim()).filter(Boolean);

      deps.forEach((dep: any) => {
        if (!idSet.has(dep) && this.cy.$id(dep).length === 0) {
          // create placeholder node if dependency not found
          this.cy.add({
            group: 'nodes',
            classes: 'placeholder',
            data: { id: dep, label: dep, displayLabel: dep, details: {} }
          });
        }

        const edgeId = `e-${dep}-${item.id}`;
        if (this.cy.$id(edgeId).length === 0) {
          this.cy.add({
            group: 'edges',
            data: { id: edgeId, source: dep, target: item.id }
          });
        }
      });
    });
    const selectedHeaders = this.headers
      .filter((_, i) => this.selectedNodeDisplay[i]) // get only checked items
      .join(','); // convert to comma-separated string

    this.diagramsField.node_data = selectedHeaders;

    console.log('Saved node_data:', this.diagramsField.node_data);

    // apply connection style and run layout
    this.applyConnectionStyle();
    this.layout();
  }

  refreshFromSheet() {
    if (!this.diagramsField.sheet_url) {
      alert("No Google Sheet linked.");
      return;
    }
    this.loadSheetFromUrl(this.diagramsField.sheet_url!, true);
  }

  loadSheetForRefresh() {
    // kept for backwards compatibility — use refreshFromSheet()
    this.refreshFromSheet();
  }

  fetchDiagramByID() {
    this.DiagramService.displayDiagramsbyID(this.diagramID!).subscribe((data) => {
      this.diagramsField = data;

      // if there is saved sheet_url, auto-load it (headers + rows) and then regenerate nodes
      if (this.diagramsField.sheet_url) {
        // keep sheetUrl input value in sync
        this.sheetUrl = this.diagramsField.sheet_url;
        this.loadSheetFromUrl(this.diagramsField.sheet_url, false); // load headers/rows and restore selections
      }

      if (this.diagramsField.json_data) {
        try {
          const json = JSON.parse(this.diagramsField.json_data);
          setTimeout(() => {
            // if json contains elements, restore them
            if (this.cy) {
              this.cy.json(json);
              this.cy.fit();
            }
            // apply saved line style
            this.connectionStyle = (this.diagramsField.line_category as any) || this.connectionStyle;
            this.applyConnectionStyle();
          }, 300);
        } catch (err) {
          console.warn('Invalid saved json_data');
        }
      }

      // restore selectedNodeDisplay if node_data exists and headers were previously loaded.
      // If headers aren't loaded yet, restoreMappingFromSavedNodeData() will be called by loadSheetFromUrl
      this.restoreMappingFromSavedNodeData();
    }, (err) => {
      console.error(err);
      alert('Failed to fetch diagram');
    });
  }

  restoreMappingFromSavedNodeData() {
    // If no saved node_data, nothing to restore
    if (!this.diagramsField.node_data) return;

    // Ensure headers are loaded; otherwise we can't map
    if (!this.headers || this.headers.length === 0) {
      return;
    }

    const nodeList = this.diagramsField.node_data.split(',').map(x => x.trim()).filter(Boolean);

    // Build boolean array of checked headers
    this.selectedNodeDisplay = this.headers.map(h => nodeList.includes(h));
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
