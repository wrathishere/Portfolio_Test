import { useEffect, useMemo, useState } from 'react';
import { BookController } from './book/BookController';
import { BookCanvas } from './book/Book';
import { Navigation } from './components/Navigation';
import { FallbackGallery } from './components/FallbackGallery';
import { fetchPortfolioPages } from './data/googleSheets';
import type { PortfolioDataResult } from './data/types';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { canUseWebGL } from './utils/webgl';
import './styles/global.css';
export default function App(){ const [data,setData]=useState<PortfolioDataResult>(); const [error,setError]=useState<string>(); const [tick,setTick]=useState(0); const reduced=usePrefersReducedMotion(); useEffect(()=>{fetchPortfolioPages().then(r=>{r.warnings.forEach(w=>console.warn(w)); setData(r);}).catch(e=>setError(e instanceof Error?e.message:String(e)));},[]); const controller=useMemo(()=> data?new BookController(Math.max(1,Math.ceil(data.pages.filter(p=>p.type==='page').length/2)),()=>setTick(x=>x+1),reduced):undefined,[data,reduced]); useEffect(()=>{ const on=(e:KeyboardEvent)=>{ if(!controller)return; if(e.key==='ArrowRight')controller.turn('forward'); if(e.key==='ArrowLeft')controller.turn('backward'); }; addEventListener('keydown',on); return()=>removeEventListener('keydown',on);},[controller]); if(error) return <main className="status" role="alert"><h1>Portfolio data unavailable</h1><p>{error}</p><p>Configure Google Sheets or enable explicit demo data in your environment.</p></main>; if(!data||!controller) return <main className="status" aria-busy="true"><p>Loading portfolio book…</p></main>; if(!canUseWebGL()) return <FallbackGallery pages={data.pages}/>; const innerCount=data.pages.filter(p=>p.type==='page').length; return <main className="app"><section className="stage" aria-label="Interactive 3D portfolio book"><BookCanvas pages={data.pages} controller={controller}/></section><Navigation controller={controller} current={controller.spread*2+1} total={innerCount} onTick={()=>setTick(tick+1)}/><p className="hint">Click the closed book to open. Drag page corners, swipe, or use arrow keys to browse.</p></main>; }
