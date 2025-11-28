import { Routes } from '@angular/router';
import { DiagramComponent } from './pages/diagrams/diagrams.component';
import { ConversionComponent } from './pages/conversion/conversion.component';
import { DocumentsComponent } from './pages/documents/documents.component';
import { LayoutComponent } from './layout/layout/layout.component';
import { DiagramslistComponent } from './pages/diagrams/diagramslist/diagramslist.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';

export const routes: Routes = [
    {path:'' , redirectTo:'login' , pathMatch:'full'},
    {path:'login' , component: LoginComponent},
    {path:'register/:s_bpartner_employee_id' , component: RegisterComponent},
    {path: 'home' , component:LayoutComponent ,
        children: [
            {path: 'diagramsDisplay', component: DiagramslistComponent},
            {path: 'diagrams', component: DiagramslistComponent},
            {path: 'displayDiagram/:id', component: DiagramComponent},
            {path: 'createDiagram', component: DiagramComponent},
            {path: 'conversion', component: ConversionComponent},
            {path: 'documents', component: DocumentsComponent},
            {path: 'notes', component: DiagramslistComponent},
        ]
    }
];
