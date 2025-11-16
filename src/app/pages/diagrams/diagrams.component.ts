import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { LucideAngularModule , RefreshCcw , BetweenHorizontalStart , SquareMousePointer , Workflow , Spline , GitBranchPlus , Save , Shapes , RouteOff} from 'lucide-angular';


(cytoscape as any).use(dagre);

@Component({
  selector: 'app-diagram',
  imports: [LucideAngularModule , CommonModule, FormsModule],
  templateUrl: './diagrams.component.html',
  styleUrls: ['./diagrams.component.scss']
})
export class DiagramComponent implements OnInit, OnDestroy {
  readonly WorkflowIcon = Workflow;
  readonly SplineIcon = Spline;
  readonly GitBranchPlusIcon = GitBranchPlus;
  readonly SaveIcon = Save;
  readonly ShapesIcon = Shapes;
  readonly RouteOffIcon = RouteOff;
  readonly RefreshIcon = RefreshCcw;
  readonly UploadSheetIcon = BetweenHorizontalStart;
  readonly SelectNodeIcon = SquareMousePointer;
  @ViewChild('cyContainer') cyContainer!: ElementRef;
  selectedFileId: string = '';
  showImportModal = false;
  showMappingModal = false;

  sheetUrl = '';
  sheetColumns: string[][] = [];
  selectedImportColumn = 0;

  selectedNodeId = '';
  selectedMapColumn = 0;
  selectedMapRow = 0;
  cy: any;
  connectMode = false;
  selectedNode: any = null;
  nodeIndex = 1;

  ngOnInit() {}

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
            'padding': '10px !important',
            'background-color': '#90caf9',
            'border-color': '#0d47a1',
            'width': '200px !important',
            'border-width': 1
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
      }
      else {
        const newLabel = prompt('Edit Label:', node.data('label'));
        if (newLabel !== null) node.data('label', newLabel);
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

  enableConnect() {
    this.connectMode = true;
    this.selectedNode = null;
  }

  layout() {
    this.cy.layout({ name: 'dagre' }).run();
  }

  saveLocal() {
    const json = this.cy.json();
    localStorage.setItem('diagram', JSON.stringify(json));
    alert('Saved to localStorage!');
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
    this.selectedFileId = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
    if (!sheetId) {
      alert("Invalid Google Sheet URL.");
      return;
    }
    

    fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`)
      .then(res => res.text())
      .then(text => {
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows;

        let colCount = rows[0].c.length;
        this.sheetColumns = Array.from({ length: colCount }, () => []);

        rows.forEach((row: any) => {
          row.c.forEach((cell: any, colIdx: number) => {
            this.sheetColumns[colIdx].push(cell?.v ?? "");
          });
        });

        alert("Sheet Loaded Successfully!");
      })
      .catch(err => {
        console.error(err);
        alert("Failed to load sheet.");
      });
  }
  importNodesFromColumn() {
    const labels = this.sheetColumns[this.selectedImportColumn];

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
  refreshFromSheet() {
    const url = this.selectedFileId + '&cb=' + Date.now();

    fetch(url)
      .then(res => res.text())
      .then(text => {
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows;

        rows.forEach((row: any, index: number) => {
          const newLabel = row.c[1]?.v || 'No Label';
          const nodeId = 'n' + index;
          const node = this.cy.getElementById(nodeId);

          if (node) {
            node.data('label', newLabel);
          }
        });
      })
      .catch(err => console.error(err));
  }
}
