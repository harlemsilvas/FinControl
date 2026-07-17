import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../layouts/app-shell';
import { FoundationPage } from '../pages/foundation-page';
import { NotFoundPage } from '../pages/not-found-page';
import { ProtectedRoute } from '../auth/protected-route';
import { LoginPage } from '../pages/login-page';
import { MasterDataPage } from '../master-data/master-data-page';
import { resources } from '../master-data/resources';
import { PayablesListPage } from '../payables/payables-list-page';
import { PayableFormPage } from '../payables/payable-form-page';
import { AgendaPage } from '../intelligence/agenda-page';

export const router=createBrowserRouter([
  {path:'/login',element:<LoginPage/>},
  {element:<ProtectedRoute/>,children:[{path:'/',element:<AppShell/>,children:[
    {index:true,element:<FoundationPage/>},
    {path:'agenda',element:<AgendaPage/>},
    {path:'payables',element:<PayablesListPage/>},
    {path:'payables/new',element:<PayableFormPage/>},
    {path:'payables/:id',element:<PayableFormPage/>},
    ...Object.entries(resources).map(([path,config])=>({path,element:<MasterDataPage config={config}/>})),
    {path:'*',element:<NotFoundPage/>},
  ]}]},
]);
