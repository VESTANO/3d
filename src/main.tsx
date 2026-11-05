import React, {lazy,Suspense,useEffect,useState} from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './brand.css';
import './mobile.css';
import './standalone.css';
import {warehouseFromHash} from './warehouse/profiles';
const WarehousePage=lazy(()=>import('./warehouse/WarehousePage'));
function PageRouter(){
  const [warehouse,setWarehouse]=useState(()=>warehouseFromHash(window.location.hash));
  useEffect(()=>{const route=()=>setWarehouse(warehouseFromHash(window.location.hash));window.addEventListener('hashchange',route);return()=>window.removeEventListener('hashchange',route);},[]);
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});document.title=warehouse?`${warehouse.label} · Paravoor — Vestano`:'China to Kerala · Rack Equipment — Vestano';},[warehouse]);
  return warehouse?<Suspense fallback={<div style={{padding:40,color:'#126bca',fontFamily:'Arial'}}>Opening your warehouse…</div>}><WarehousePage key={warehouse.id} profile={warehouse}/></Suspense>:<App/>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><PageRouter /></React.StrictMode>);
