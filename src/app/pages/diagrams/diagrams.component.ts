import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { LucideAngularModule , Palette , RefreshCcw , BetweenHorizontalStart , SquareMousePointer , Workflow , Spline , GitBranchPlus , Save , Shapes , RouteOff} from 'lucide-angular';
import { DiagramsService } from '../../Services/diagrams.service';
import { Diagrams } from '../../Models/Diagrams/diagrams.model';
import { HttpClientModule } from '@angular/common/http';
import { ColornodesService } from '../../Services/ColorNodes/colornodes.service';
import { ColorNodes } from '../../Models/ColorNodes/color-nodes.model';
import { ActivatedRoute } from '@angular/router';

(cytoscape as any).use(dagre);

interface ProjectRow {
  id: string;
  name: string;
  start: string;
  end: string;
  se: string;
  dep: string; // can be empty or comma-separated list of project ids
}

@Component({
  selector: 'app-diagram',
  imports: [LucideAngularModule , CommonModule, FormsModule , HttpClientModule],
  templateUrl: './diagrams.component.html',
  styleUrls: ['./diagrams.component.scss'],
  providers:[DiagramsService , ColornodesService]
})
export class DiagramComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly WorkflowIcon = Workflow;
  readonly SplineIcon = Spline;
  readonly GitBranchPlusIcon = GitBranchPlus;
  readonly SaveIcon = Save;
  readonly ShapesIcon = Shapes;
  readonly PaletteIcon = Palette;
  readonly RouteOffIcon = RouteOff;
  readonly RefreshIcon = RefreshCcw;
  readonly UploadSheetIcon = BetweenHorizontalStart;
  readonly SelectNodeIcon = SquareMousePointer;

  @ViewChild('cyContainer') cyContainer!: ElementRef;
  selectedFileId: string = '';
  showImportModal = false;
  showMappingModal = false;
  ShowSavingModal = false;
  ShowColorModal = false;

  sheetUrl = '';
  sheetColumns: string[][] = [];
  selectedImportColumn = 0;

  diagramsField: Diagrams ={
    name: '',
    description: '',
    json_data: '',
    sheet_url: '',
    s_bpartner_i_employee_id: 2,
    created_by: 2,
  }
  ColorNodeFields: ColorNodes = {
    diagram_id: null,
    label: '',
    color_key: '',
    color_code: '',
    created_by: 2,
  }
  diagramID: null | any;

  selectedNodeId = '';
  selectedMapColumn = 0;
  selectedMapRow = 0;
  cy: any;
  connectMode = false;
  selectedNode: any = null;
  nodeIndex = 1;
  fetchDiagramID: number | null = null;

  projects: ProjectRow[] = [];
  showAccordion = false;
  accordionData: ProjectRow | null = null;

  constructor(private DiagramsServices: DiagramsService , private ColorServices : ColornodesService , private ActRouter : ActivatedRoute){}

  ngOnInit() {
    this.fetchDiagramID = this.ActRouter.snapshot.params['id'];
    this.diagramID = this.ActRouter.snapshot.params['id'];
    if (this.fetchDiagramID) {
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
            'shape': 'round-rectangle',
            'padding': '10px',
            'background-color': '#90caf9',
            'border-color': '#0d47a1',
            'width': '200px',
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
      if (this.connectMode) {
        if (this.selectedNode && this.selectedNode.id() !== node.id()) {
          this.cy.add({
            group: 'edges',
            data: {
              id: 'e' + Date.now(),
              source: this.selectedNode.id(),
              target: node.id()
            }
          });
          this.connectMode = false;
          this.selectedNode = null;
        } else {
          this.selectedNode = node;
        }
        return;
      }

      const details = node.data('details') as ProjectRow | undefined;
      if (details) {
        this.accordionData = details;
        this.showAccordion = true;
      } else {
        const newLabel = prompt('Edit Label:', node.data('label'));
        if (newLabel !== null) node.data('label', newLabel);
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

      if (confirm("Delete this connection?")) {
        this.cy.remove(edge);
      }
    });
  }

  addNode() {
    const id = 'n' + this.nodeIndex++;
    this.cy.add({
      group: 'nodes',
      data: { id, label: 'Click to Edit '},
      position: {
        x: 200 + Math.random() * 100,
        y: 100 + Math.random() * 100
      }
    });
  }
  removeNode() {
    if (!this.selectedNode) {
      alert("No node selected.");
      return;
    }

    this.cy.remove(this.selectedNode);
    this.selectedNode = null;
  }
  removeEdge(edgeId: string) {
    const edge = this.cy.getElementById(edgeId);

    if (!edge.length) {
      alert("Edge not found.");
      return;
    }

    this.cy.remove(edge);
  }


  enableConnect() {
    this.connectMode = true;
    this.selectedNode = null;
  }

  layout() {
    try {
      this.cy.layout({ name: 'dagre', rankDir: 'TB', nodeSep: 50, edgeSep: 10 }).run();
    } catch (err) {
      console.warn('layout error', err);
    }
  }

  saveLocal(){
    this.ShowSavingModal = true;
  }

  saveDiagramsInformation() {
    const json = this.cy.json();
    localStorage.setItem('diagram', JSON.stringify(json));
    this.diagramsField.json_data = JSON.stringify(json);
    this.diagramsField.sheet_url = this.sheetUrl;
    if (this.diagramID == null) {
      this.DiagramsServices.storeDiagrams(this.diagramsField).subscribe((diagram:any)=>{
        this.diagramID = diagram.data.id
      });
      alert('Diagrams Added');
    }
    else{
      this.DiagramsServices.updateDiagrams(this.diagramsField , this.diagramID).subscribe((diagram:any)=>{
        console.log('Update diagram id', this.diagramID);
      });
      alert('Diagrams Updates');
    }
  }
    
  loadLocal() {
    const saved = localStorage.getItem('diagram');
    if (!saved) {
      alert('No saved diagram found.');
      return;
    }

    const json = JSON.parse(saved);

    this.cy.destroy();
    this.initCytoscape();

    this.cy.json(json);
    alert('Diagram loaded from localStorage!');
  }
  colorNodes(){
    this.ShowColorModal = true;
  }

  saveColorDiagramsInformation(){
    this.ColorNodeFields.diagram_id = this.diagramID;
    this.ColorNodeFields.color_key = this.ColorNodeFields.color_code;
    this.ColorServices.storeDiagramsColorNodes(this.ColorNodeFields).subscribe(() => {
    })
  }

  clearLocal() {
    localStorage.removeItem('diagram');
    alert('Local storage cleared.');
  }

  ngOnDestroy() {
    if (this.cy) this.cy.destroy();
  }

  openSheetImport() {
    this.showImportModal = true;
  }

  openMapping() {
    this.showMappingModal = true;
  }

  extractSheetID(url: string) {
    const match = url.match(/\/d\/(.*?)\//);
    return match ? match[1] : null;
  }
  loadSheet() {
    const sheetId = this.extractSheetID(this.sheetUrl);
    if (!sheetId) {
      alert("Invalid Google Sheet URL.");
      return;
    }

    fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`)
      .then(res => res.text())
      .then(text => {
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows;
        this.projects = rows.map((row: any) => {
          return {
            id: (row.c[0]?.v ?? '').toString().trim(),
            name: (row.c[1]?.v ?? '').toString(),
            start: (row.c[2]?.v ?? '').toString(),
            end: (row.c[3]?.v ?? '').toString(),
            se: (row.c[4]?.v ?? '').toString(),
            dep: (row.c[5]?.v ?? '').toString().trim()
          } as ProjectRow;
        });
        let colCount = rows[0]?.c?.length ?? 0;
        this.sheetColumns = Array.from({ length: colCount }, () => []);
        rows.forEach((row: any) => {
          row.c.forEach((cell: any, colIdx: number) => {
            this.sheetColumns[colIdx].push(cell?.v ?? "");
          });
        });
        this.generateNodesFromProjects();

        alert("Sheet Loaded Successfully!");
      })
      .catch(err => {
        console.error(err);
        alert("Failed to load sheet.");
      });
  }
  generateNodesFromProjects() {
    this.cy.elements().remove();
    this.projects.forEach((p, i) => {
      const nodeId = p.id && p.id !== '' ? p.id : `auto-${i}`;

      this.cy.add({
        group: "nodes",
        data: {
          id: nodeId,
          label: p.name || nodeId,
          details: p
        },
        position: {
          x: 200 + (i % 4) * 260,
          y: 100 + Math.floor(i / 4) * 150
        }
      });
    });
    const idsSet = new Set(this.projects.map(p => (p.id && p.id !== '' ? p.id : '').toString()));
    this.projects.forEach((p, i) => {
      if (!p.dep) return;
      const toId = (p.id && p.id !== '') ? p.id : `auto-${i}`;
      const deps = p.dep.split(',').map(x => x.trim()).filter(x => x !== '');
      deps.forEach(depId => {
        let sourceId = depId;
        if (!idsSet.has(depId)) {
          sourceId = `ph-${depId}`;
          if (!this.cy.getElementById(sourceId).length) {
            this.cy.add({
              group: "nodes",
              data: { id: sourceId, label: depId, details: { id: depId, name: depId, start: '', end: '', se: '', dep: '' } },
              classes: 'placeholder',
              position: { x: 50 + Math.random() * 100, y: 50 + Math.random() * 100 }
            });
          }
        }
        const edgeId = `e-${sourceId}-${toId}`;
        if (!this.cy.getElementById(edgeId).length) {
          this.cy.add({
            group: "edges",
            data: { id: edgeId, source: sourceId, target: toId }
          });
        }
      });
    });

    this.layout();
  }
  refreshFromSheet() {
    if (!this.selectedFileId) {
      alert('No sheet loaded. Use Load Sheet first.');
      return;
    }

    const url = this.selectedFileId + '&cb=' + Date.now();

    fetch(url)
      .then(res => res.text())
      .then(text => {
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows;
        this.projects = rows.map((row: any) => ({
          id: (row.c[0]?.v ?? '').toString().trim(),
          name: (row.c[1]?.v ?? '').toString(),
          start: (row.c[2]?.v ?? '').toString(),
          end: (row.c[3]?.v ?? '').toString(),
          se: (row.c[4]?.v ?? '').toString(),
          dep: (row.c[5]?.v ?? '').toString().trim()
        }));

        this.generateNodesFromProjects();
      })
      .catch(err => console.error(err));
  }

  importNodesFromColumn() {
    const labels = this.sheetColumns[this.selectedImportColumn] || [];

    labels.forEach(text => {
      const id = 'n' + this.nodeIndex++;

      this.cy.add({
        group: 'nodes',
        data: { id, label: text || 'Empty' },
        position: { x: Math.random() * 300, y: Math.random() * 300 }
      });
    });

    alert("Nodes created from column!");
    this.showImportModal = false;
  }

  applyMapping() {
    const node = this.cy.getElementById(this.selectedNodeId);
    const label = this.sheetColumns[this.selectedMapColumn][this.selectedMapRow];

    node.data('label', label);

    alert(`Mapped to Node ${this.selectedNodeId}: "${label}"`);

    this.showMappingModal = false;
  }
  fetchDiagramByID() {
    this.DiagramsServices.displayDiagramsbyID(this.fetchDiagramID!).subscribe((data) => {
      this.diagramsField = data;
      if (this.diagramsField.json_data) {
        const json = JSON.parse(this.diagramsField.json_data);
        setTimeout(() => {
          if (this.cy) {
            this.cy.json(json);
            this.cy.fit();
          }
        }, 300);
      }
    });
  }
}
