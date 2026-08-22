import { useEffect, useState } from 'react';
export function usePrefersReducedMotion(){ const [v,setV]=useState(false); useEffect(()=>{ const q=matchMedia('(prefers-reduced-motion: reduce)'); setV(q.matches); const f=()=>setV(q.matches); q.addEventListener('change',f); return()=>q.removeEventListener('change',f);},[]); return v; }
