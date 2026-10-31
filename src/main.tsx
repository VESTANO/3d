import React, {lazy,Suspense,useEffect,useState} from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './brand.css';
import './mobile.css';
import './standalone.css';
const WarehousePage=lazy(()=>import('./warehouse/WarehousePage'));
function PageRouter(){
  const [warehouse,setWarehouse]=useState(()=>window.location.hash==='#warehouse');
  useEffect(()=>{const route=()=>setWarehouse(window.location.hash==='#warehouse');window.addEventListener('hashchange',route);return()=>window.removeEventListener('hashchange',route);},[]);
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});document.title=warehouse?'Warehouse · Paravoor — Vestano':'China to Kerala · Rack Equipment — Vestano';},[warehouse]);
  return warehouse?<Suspense fallback={<div style={{padding:40,color:'#126bca',fontFamily:'Arial'}}>Opening your warehouse…</div>}><WarehousePage/></Suspense>:<App/>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><PageRouter /></React.StrictMode>);
