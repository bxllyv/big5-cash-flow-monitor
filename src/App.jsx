import { useState } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";

const PREV_INV = 732000;
const INIT_CASH = 2000000;
const ACCTS = ["GCash A","GCash B","BDO","BPI","Store Funds"];
const ACCT_CLR = {"GCash A":"#3b82f6","GCash B":"#8b5cf6","BDO":"#06b6d4","BPI":"#f59e0b","Store Funds":"#22c55e"};
const OH_KEYS = ["Rent","Salaries","Electricity","Other Expenses"];

const INIT_MONTHS = [
  {id:1,month:"Jan 2026",sales:1657172,netProfit:1479000,foodCostPct:50,foodPkg:828586,swt:120000,begInv:732000,endInv:710000,oh:{Rent:65000,Salaries:363000,Electricity:40000,"Other Expenses":0}},
  {id:2,month:"Feb 2026",sales:1528677,netProfit:1364000,foodCostPct:51,foodPkg:779625,swt:115000,begInv:710000,endInv:700000,oh:{Rent:65000,Salaries:363000,Electricity:40000,"Other Expenses":0}},
];
const INIT_WEEKLY = [
  {id:1,date:"Feb 16, 2025",acc:{"GCash A":74853.34,"GCash B":500843.30,"BDO":668541,"BPI":1126000,"Store Funds":0}},
  {id:2,date:"Mar 4, 2025",acc:{"GCash A":27174.83,"GCash B":562703.39,"BDO":542485,"BPI":1049000,"Store Funds":0}},
];
const INIT_OH = [
  {id:1,month:"Jan 2026",Rent:65000,Salaries:363000,Electricity:40000,"Other Expenses":0},
  {id:2,month:"Feb 2026",Rent:65000,Salaries:363000,Electricity:40000,"Other Expenses":0},
];

const peso = (n,d=0) => n==null ? "—" : "₱"+Number(n).toLocaleString("en-PH",{minimumFractionDigits:d,maximumFractionDigits:d});
const clr = (v,g,w) => v<=g ? "#22c55e" : v<=w ? "#f59e0b" : "#ef4444";
const sumOh = oh => OH_KEYS.reduce((s,k)=>s+(Number(oh[k])||0),0);
const blankOh = () => Object.fromEntries(OH_KEYS.map(k=>[k,""]));
const blankAcc = () => Object.fromEntries(ACCTS.map(k=>[k,""]));

const S = {
  page:  {fontFamily:"'Segoe UI',Arial,sans-serif",background:"#07090f",minHeight:"100vh",color:"#e2e8f0"},
  card:  {background:"#0f1520",border:"1px solid #1a2540",borderRadius:12,padding:16},
  mcard: {background:"linear-gradient(135deg,#0f1520,#111d2e)",border:"1px solid #1a2540",borderRadius:12,padding:15},
  lbl:   {display:"block",fontSize:9,color:"#334155",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",marginBottom:4},
  input: {background:"#07090f",border:"1px solid #1a2540",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12,width:"100%",fontFamily:"inherit",outline:"none"},
  th:    {padding:"5px 9px",textAlign:"right",color:"#334155",borderBottom:"1px solid #1a2540",fontSize:9,textTransform:"uppercase",letterSpacing:".06em",fontWeight:700,whiteSpace:"nowrap"},
  td:    {padding:"7px 9px",textAlign:"right",fontSize:12,whiteSpace:"nowrap",fontFamily:"'Courier New',monospace"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:99,padding:16},
  modal: {background:"#0f1520",border:"1px solid #1a2540",borderRadius:14,padding:22,width:520,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"},
};

const TT = {contentStyle:{background:"#0f1520",border:"1px solid #1a2540",borderRadius:8,fontSize:11},labelStyle:{color:"#64748b"}};

function KPI({label,value,sub,color}){
  return(
    <div style={S.mcard}>
      <div style={{fontSize:9,color:"#334155",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>{label}</div>
      <div style={{fontSize:18,fontWeight:700,color:color||"#f1f5f9",fontFamily:"'Courier New',monospace",lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:color||"#475569",marginTop:4,opacity:.6}}>{sub}</div>}
    </div>
  );
}

function SLabel({t}){ return <div style={{fontSize:9,fontWeight:700,color:"#1e3a5f",textTransform:"uppercase",letterSpacing:".08em",marginBottom:11}}>{t}</div>; }

function Field({label,full,children}){
  return(
    <div style={{gridColumn:full?"span 2":"span 1"}}>
      <label style={S.lbl}>{label}</label>
      {children}
    </div>
  );
}

function Inp({value,onChange,placeholder}){
  return <input style={S.input} value={value} onChange={onChange} placeholder={placeholder||""}/>;
}

export default function App(){
  const [months, setMonths] = useState(INIT_MONTHS);
  const [weekly, setWeekly] = useState(INIT_WEEKLY);
  const [ohLog,  setOhLog]  = useState(INIT_OH);
  const [tab,    setTab]    = useState("weekly");
  const [mOpen,  setMOpen]  = useState(false);
  const [wOpen,  setWOpen]  = useState(false);
  const [ohOpen, setOhOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editOhId, setEditOhId] = useState(null);

  const blankM = () => {
    const last = months[months.length-1];
    return {month:"",sales:"",netProfit:"",foodCostPct:"",foodPkg:"",swt:"",begInv:last?String(last.endInv):"",endInv:"",oh:{Rent:"65000",Salaries:"363000",Electricity:"40000","Other Expenses":"0"}};
  };
  const [mf, setMf] = useState(blankM());
  const [wf, setWf] = useState({date:"",acc:blankAcc()});
  const [of, setOf] = useState({month:"",...Object.fromEntries(OH_KEYS.map(k=>[k,""]))});

  // Compute monthly cash trail
  let run = INIT_CASH;
  const trail = months.map((e,i)=>{
    const ohT = sumOh(e.oh);
    const prevI = i===0 ? PREV_INV : months[i-1].endInv;
    const invD = (Number(e.endInv)||0)-(Number(prevI)||0);
    const cf   = (Number(e.netProfit)||0) - (Number(e.swt)||0) - ohT - invD;
    run += cf;
    return {...e,ohT,invD,cf,cashEnd:Math.round(run)};
  });
  const latM = trail[trail.length-1];

  // Compute weekly totals
  const wRows = weekly.map(w=>({...w,total:ACCTS.reduce((s,k)=>s+(Number(w.acc[k])||0),0)}));
  const latW  = wRows[wRows.length-1];
  const prevW = wRows[wRows.length-2];
  const wDelta = latW&&prevW ? latW.total-prevW.total : null;

  function openAddM(){ setEditId(null); setMf(blankM()); setMOpen(true); }
  function openEditM(e){ setEditId(e.id); setMf({...e,oh:{...e.oh}}); setMOpen(true); }

  function saveM(){
    const entry={
      month:mf.month, sales:+mf.sales||0, netProfit:+mf.netProfit||0,
      foodCostPct:+mf.foodCostPct||0, foodPkg:+mf.foodPkg||0,
      swt:+mf.swt||0, begInv:+mf.begInv||0, endInv:+mf.endInv||0,
      oh:Object.fromEntries(OH_KEYS.map(k=>[k,+mf.oh[k]||0]))
    };
    if(editId){
      setMonths(months.map(m=>m.id===editId?{...entry,id:editId}:m));
      setOhLog(ohLog.map(o=>o.id===editId?{id:editId,month:entry.month,...entry.oh}:o));
    } else {
      const id=Date.now();
      setMonths([...months,{...entry,id}]);
      setOhLog([...ohLog,{id,month:entry.month,...entry.oh}]);
    }
    setMOpen(false);
  }

  function saveW(){
    if(!wf.date) return;
    setWeekly([...weekly,{id:Date.now(),date:wf.date,acc:Object.fromEntries(ACCTS.map(k=>[k,+wf.acc[k]||0]))}]);
    setWf({date:"",acc:blankAcc()}); setWOpen(false);
  }

  function openEditOH(o){
    setEditOhId(o.id);
    setOf({...o});
    setOhOpen(true);
  }

  function deleteOH(id){
    if(window.confirm("Delete this overhead entry?")) setOhLog(ohLog.filter(o=>o.id!==id));
  }

  function saveOH(){
    if(!of.month) return;
    if(editOhId){
      const entry={id:editOhId,month:of.month,...Object.fromEntries(OH_KEYS.map(k=>[k,+of[k]||0]))};
      setOhLog(ohLog.map(o=>o.id===editOhId?entry:o));
    } else {
      const entry={id:Date.now(),month:of.month,...Object.fromEntries(OH_KEYS.map(k=>[k,+of[k]||0]))};
      setOhLog([...ohLog,entry]);
    }
    setOhOpen(false);
    setEditOhId(null);
    setOf({month:"",...Object.fromEntries(OH_KEYS.map(k=>[k,""]))});
  }

  const TABS=[["weekly","💰 Weekly Cash"],["monthly","📋 Monthly P&L"],["overhead","🏷 Overhead"],["trends","📈 Trends"],["leaks","🔍 Leaks"]];
  const cashClr = v => v>=3000000?"#22c55e":v>=2000000?"#f59e0b":"#ef4444";

  const btnBase = {border:"none",borderRadius:7,padding:"7px 13px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:".05em",textTransform:"uppercase"};

  return(
    <div style={S.page}>

      {/* ── HEADER ── */}
      <div style={{borderBottom:"1px solid #1a2540",padding:"11px 18px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:28,height:28,background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#fff"}}>₱</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>BIG5 Cash Flow Monitor</div>
            <div style={{fontSize:9,color:"#1a2540",letterSpacing:".08em",textTransform:"uppercase"}}>Restaurant · Philippine Peso</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",flex:1}}>
          {TABS.map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{...btnBase,background:tab===k?"#1d4ed8":"transparent",color:tab===k?"#fff":"#475569",padding:"6px 12px"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setWOpen(true)}  style={{...btnBase,background:"#1d4ed8",color:"#fff"}}>+ Weekly</button>
          <button onClick={openAddM}             style={{...btnBase,background:"#6d28d9",color:"#fff"}}>+ Month</button>
          <button onClick={()=>setOhOpen(true)}  style={{...btnBase,background:"#15803d",color:"#fff"}}>+ Overhead</button>
        </div>
      </div>

      <div style={{padding:"16px 18px",maxWidth:1260}}>

        {/* ══ WEEKLY CASH ══════════════════════════════════════════ */}
        {tab==="weekly" && (
          <div style={{display:"flex",flexDirection:"column",gap:13}}>

            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              <KPI label="Latest Total Cash"
                value={latW?peso(latW.total,2):"—"} sub={latW?.date}
                color={latW?cashClr(latW.total):"#6b7280"}/>
              <KPI label="Week-on-Week Δ"
                value={wDelta!=null?(wDelta>=0?"+":"")+peso(wDelta,2):"—"}
                sub={wDelta!=null?(wDelta>=0?"↑ Up this week":"↓ Down this week"):""}
                color={wDelta==null?"#6b7280":wDelta>=0?"#22c55e":"#ef4444"}/>
              <KPI label="Largest Account"
                value={latW?Object.entries(latW.acc).sort((a,b)=>b[1]-a[1])[0][0]:"—"}
                sub={latW?peso(Math.max(...Object.values(latW.acc)),2):""} color="#60a5fa"/>
              <KPI label="Entries Logged" value={weekly.length}
                sub={weekly.length?weekly[0].date+" → "+weekly[weekly.length-1].date:""} color="#a78bfa"/>
            </div>

            <div style={S.card}>
              <SLabel t="Total Cash on Hand — Weekly Trend"/>
              <ResponsiveContainer width="100%" height={185}>
                <AreaChart data={wRows.map(w=>({d:w.date,v:w.total}))}>
                  <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2540"/>
                  <XAxis dataKey="d" tick={{fontSize:10,fill:"#334155"}}/>
                  <YAxis tick={{fontSize:10,fill:"#334155"}} tickFormatter={v=>"₱"+(v/1e6).toFixed(2)+"M"}/>
                  <Tooltip {...TT} formatter={v=>peso(v,2)}/>
                  <ReferenceLine y={2500000} stroke="#22c55e" strokeDasharray="4 4" label={{value:"₱2.5M",fill:"#22c55e",fontSize:9,position:"right"}}/>
                  <ReferenceLine y={1800000} stroke="#ef4444" strokeDasharray="4 4" label={{value:"Floor",fill:"#ef4444",fontSize:9,position:"right"}}/>
                  <Area type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2.5} fill="url(#ag)" dot={{fill:"#3b82f6",r:5}} name="Cash"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={S.card}>
              <SLabel t="Account Breakdown by Week"/>
              <ResponsiveContainer width="100%" height={185}>
                <BarChart data={wRows.map(w=>({d:w.date,...w.acc}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2540"/>
                  <XAxis dataKey="d" tick={{fontSize:10,fill:"#334155"}}/>
                  <YAxis tick={{fontSize:10,fill:"#334155"}} tickFormatter={v=>"₱"+(v/1000).toFixed(0)+"K"}/>
                  <Tooltip {...TT} formatter={v=>peso(v,2)}/>
                  <Legend iconType="circle" wrapperStyle={{fontSize:10,color:"#475569"}}/>
                  {ACCTS.map(a=><Bar key={a} dataKey={a} stackId="a" fill={ACCT_CLR[a]}/>)}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={S.card}>
              <SLabel t="Weekly Cash Log"/>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr>
                      <th style={{...S.th,textAlign:"left"}}>Date</th>
                      {ACCTS.map(a=><th key={a} style={{...S.th,color:ACCT_CLR[a]}}>{a}</th>)}
                      <th style={{...S.th,color:"#f1f5f9"}}>Total</th>
                      <th style={S.th}>Δ vs Prior</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wRows.map((w,i)=>{
                      const d=i===0?null:w.total-wRows[i-1].total;
                      return(
                        <tr key={w.id} style={{borderBottom:"1px solid #07090f"}}>
                          <td style={{...S.td,textAlign:"left",color:"#93c5fd",fontWeight:700,fontFamily:"inherit"}}>{w.date}</td>
                          {ACCTS.map(a=><td key={a} style={{...S.td,color:w.acc[a]>0?"#94a3b8":"#1a2540"}}>{w.acc[a]>0?peso(w.acc[a],2):"—"}</td>)}
                          <td style={{...S.td,color:"#f1f5f9",fontWeight:700}}>{peso(w.total,2)}</td>
                          <td style={{...S.td,color:d==null?"#1a2540":d>=0?"#22c55e":"#ef4444",fontWeight:700}}>{d==null?"—":(d>=0?"+":"")+peso(d,2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ MONTHLY P&L ══════════════════════════════════════════ */}
        {tab==="monthly" && (
          <div style={{display:"flex",flexDirection:"column",gap:13}}>

            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              <KPI label="Latest Month" value={latM?.month||"—"} color="#93c5fd"/>
              <KPI label="Sales" value={latM?peso(latM.sales):"—"} color="#f1f5f9"/>
              <KPI label="Net Profit (disc-net)" value={latM?peso(latM.netProfit):"—"}
                sub={latM?((latM.netProfit/latM.sales)*100).toFixed(1)+"% of sales":""} color="#a78bfa"/>
              <KPI label="Food Cost %" value={latM?latM.foodCostPct+"%":"—"} sub="Target ≤ 48%"
                color={latM?clr(latM.foodCostPct,48,52):"#6b7280"}/>
            </div>

            <div style={S.card}>
              <SLabel t="Monthly P&L Log"/>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr>
                      <th style={{...S.th,textAlign:"left"}}>Month</th>
                      {["Sales","Net Profit","Food & Pkg","SWT","Food Cost %","Beg Inv","End Inv","Overhead","Cash Flow",""].map((h,i)=>(
                        <th key={i} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trail.map(e=>{
                      const swtP = e.sales?(e.swt/e.sales*100):0;
                      return(
                        <tr key={e.id} style={{borderBottom:"1px solid #07090f"}}>
                          <td style={{...S.td,textAlign:"left",color:"#93c5fd",fontWeight:700,fontFamily:"inherit"}}>{e.month}</td>
                          <td style={S.td}>{peso(e.sales)}</td>
                          <td style={{...S.td,color:"#a78bfa"}}>{peso(e.netProfit)}</td>
                          <td style={S.td}>{peso(e.foodPkg)}</td>
                          <td style={{...S.td,color:clr(swtP,3,5)}}>{peso(e.swt)}</td>
                          <td style={{...S.td,color:clr(e.foodCostPct,48,52)}}>{e.foodCostPct}%</td>
                          <td style={S.td}>{peso(e.begInv)}</td>
                          <td style={{...S.td,color:e.endInv>500000?"#f59e0b":"#94a3b8"}}>{peso(e.endInv)}</td>
                          <td style={{...S.td,color:"#f59e0b"}}>{peso(e.ohT)}</td>
                          <td style={{...S.td,color:e.cf>0?"#22c55e":"#ef4444",fontWeight:700}}>{peso(e.cf)}</td>
                          <td style={{padding:"5px 8px"}}>
                            <button onClick={()=>openEditM(e)} style={{...btnBase,background:"#1a2540",color:"#94a3b8",padding:"3px 9px",fontSize:9}}>Edit</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
              <div style={S.card}>
                <SLabel t="Sales vs Net Profit"/>
                <ResponsiveContainer width="100%" height={165}>
                  <LineChart data={trail.map(e=>({m:e.month,Sales:e.sales,NetProfit:e.netProfit}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2540"/>
                    <XAxis dataKey="m" tick={{fontSize:10,fill:"#334155"}}/>
                    <YAxis tick={{fontSize:10,fill:"#334155"}} tickFormatter={v=>"₱"+(v/1e6).toFixed(2)+"M"}/>
                    <Tooltip {...TT} formatter={v=>peso(v)}/>
                    <Legend iconType="circle" wrapperStyle={{fontSize:10,color:"#475569"}}/>
                    <Line type="monotone" dataKey="Sales" stroke="#3b82f6" strokeWidth={2} dot={{r:4}}/>
                    <Line type="monotone" dataKey="NetProfit" stroke="#a78bfa" strokeWidth={2} dot={{r:4}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={S.card}>
                <SLabel t="Monthly Cash Flow"/>
                <ResponsiveContainer width="100%" height={165}>
                  <BarChart data={trail.map(e=>({m:e.month,Flow:e.cf}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2540"/>
                    <XAxis dataKey="m" tick={{fontSize:10,fill:"#334155"}}/>
                    <YAxis tick={{fontSize:10,fill:"#334155"}} tickFormatter={v=>"₱"+(v/1000).toFixed(0)+"K"}/>
                    <Tooltip {...TT} formatter={v=>peso(v)}/>
                    <ReferenceLine y={0} stroke="#334155"/>
                    <Bar dataKey="Flow" fill="#3b82f6" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ══ OVERHEAD ══════════════════════════════════════════════ */}
        {tab==="overhead" && (
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {OH_KEYS.map((k,i)=>{
                const lat=ohLog[ohLog.length-1];
                return <KPI key={k} label={k} value={lat?peso(lat[k]):"—"} color={["#3b82f6","#8b5cf6","#06b6d4","#f59e0b"][i]}/>;
              })}
            </div>
            <div style={S.card}>
              <SLabel t="Overhead Log"/>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr>
                      <th style={{...S.th,textAlign:"left"}}>Month</th>
                      {OH_KEYS.map((k,i)=><th key={k} style={{...S.th,color:["#3b82f6","#8b5cf6","#06b6d4","#f59e0b"][i]}}>{k}</th>)}
                      <th style={{...S.th,color:"#f59e0b"}}>Total</th>
                      <th style={S.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ohLog.map(o=>{
                      const tot=OH_KEYS.reduce((s,k)=>s+(Number(o[k])||0),0);
                      return(
                        <tr key={o.id} style={{borderBottom:"1px solid #07090f"}}>
                          <td style={{...S.td,textAlign:"left",color:"#93c5fd",fontWeight:700,fontFamily:"inherit"}}>{o.month}</td>
                          {OH_KEYS.map(k=><td key={k} style={S.td}>{peso(o[k]||0)}</td>)}
                          <td style={{...S.td,color:"#f59e0b",fontWeight:700}}>{peso(tot)}</td>
                          <td style={{padding:"5px 8px",whiteSpace:"nowrap"}}>
                            <button onClick={()=>openEditOH(o)} style={{...btnBase,background:"#1a2540",color:"#94a3b8",padding:"3px 9px",fontSize:9,marginRight:4}}>Edit</button>
                            <button onClick={()=>deleteOH(o.id)} style={{...btnBase,background:"rgba(239,68,68,0.1)",color:"#ef4444",padding:"3px 9px",fontSize:9}}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={S.card}>
              <SLabel t="Overhead Composition"/>
              <ResponsiveContainer width="100%" height={185}>
                <BarChart data={ohLog.map(o=>({m:o.month,...Object.fromEntries(OH_KEYS.map(k=>[k,o[k]||0]))}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2540"/>
                  <XAxis dataKey="m" tick={{fontSize:10,fill:"#334155"}}/>
                  <YAxis tick={{fontSize:10,fill:"#334155"}} tickFormatter={v=>"₱"+(v/1000).toFixed(0)+"K"}/>
                  <Tooltip {...TT} formatter={v=>peso(v)}/>
                  <Legend iconType="circle" wrapperStyle={{fontSize:10,color:"#475569"}}/>
                  {OH_KEYS.map((k,i)=><Bar key={k} dataKey={k} stackId="a" fill={["#3b82f6","#8b5cf6","#06b6d4","#f59e0b"][i]}/>)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ══ TRENDS ════════════════════════════════════════════════ */}
        {tab==="trends" && (
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
              <div style={S.card}>
                <SLabel t="Food Cost % — Target 48%"/>
                <ResponsiveContainer width="100%" height={170}>
                  <LineChart data={trail.map(e=>({m:e.month,fc:e.foodCostPct}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2540"/>
                    <XAxis dataKey="m" tick={{fontSize:10,fill:"#334155"}}/>
                    <YAxis domain={[44,60]} tick={{fontSize:10,fill:"#334155"}} tickFormatter={v=>v+"%"}/>
                    <Tooltip {...TT} formatter={v=>v+"%"}/>
                    <ReferenceLine y={48} stroke="#22c55e" strokeDasharray="4 4" label={{value:"48%",fill:"#22c55e",fontSize:9}}/>
                    <ReferenceLine y={52} stroke="#f59e0b" strokeDasharray="4 4" label={{value:"52%",fill:"#f59e0b",fontSize:9}}/>
                    <Line type="monotone" dataKey="fc" stroke="#f472b6" strokeWidth={2.5} dot={{r:4,fill:"#f472b6"}} name="Food Cost %"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={S.card}>
                <SLabel t="SWT vs 3% of Sales Benchmark"/>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={trail.map(e=>({m:e.month,SWT:e.swt,Benchmark:e.sales*0.03}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2540"/>
                    <XAxis dataKey="m" tick={{fontSize:10,fill:"#334155"}}/>
                    <YAxis tick={{fontSize:10,fill:"#334155"}} tickFormatter={v=>"₱"+(v/1000).toFixed(0)+"K"}/>
                    <Tooltip {...TT} formatter={v=>peso(v)}/>
                    <Legend iconType="circle" wrapperStyle={{fontSize:10,color:"#475569"}}/>
                    <Bar dataKey="SWT" fill="#ef4444" radius={[4,4,0,0]}/>
                    <Bar dataKey="Benchmark" fill="#22c55e" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={S.card}>
              <SLabel t="Inventory — Beg vs End (Target End ≤ ₱500K)"/>
              <ResponsiveContainer width="100%" height={165}>
                <BarChart data={trail.map(e=>({m:e.month,"Beg Inv":e.begInv,"End Inv":e.endInv}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2540"/>
                  <XAxis dataKey="m" tick={{fontSize:10,fill:"#334155"}}/>
                  <YAxis tick={{fontSize:10,fill:"#334155"}} tickFormatter={v=>"₱"+(v/1000).toFixed(0)+"K"}/>
                  <Tooltip {...TT} formatter={v=>peso(v)}/>
                  <Legend iconType="circle" wrapperStyle={{fontSize:10,color:"#475569"}}/>
                  <ReferenceLine y={500000} stroke="#22c55e" strokeDasharray="4 4" label={{value:"₱500K target",fill:"#22c55e",fontSize:9}}/>
                  <Bar dataKey="Beg Inv" fill="#475569" radius={[4,4,0,0]}/>
                  <Bar dataKey="End Inv" fill="#f59e0b" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ══ LEAKS ═════════════════════════════════════════════════ */}
        {tab==="leaks" && (
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            {trail.map((e,i)=>{
              const prevI = i===0?PREV_INV:trail[i-1].endInv;
              const iLeak = Math.max(0,(Number(e.endInv)||0)-(Number(prevI)||0));
              const sLeak = Math.max(0,(Number(e.swt)||0)-(Number(e.sales)||0)*0.03);
              const fLeak = Math.max(0,((Number(e.foodCostPct)||0)/100-0.48)*(Number(e.sales)||0));
              const tot   = iLeak+sLeak+fLeak;
              return(
                <div key={e.id} style={S.card}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:13,color:"#93c5fd"}}>{e.month}</div>
                    <div style={{fontSize:11,fontWeight:700,color:tot>200000?"#ef4444":tot>80000?"#f59e0b":"#22c55e"}}>
                      Estimated Leak: {peso(tot)}
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10}}>
                    {[{l:"Inventory Buildup",v:iLeak,c:"#f59e0b"},{l:"Excess SWT",v:sLeak,c:"#ef4444"},{l:"Food Cost Overage",v:fLeak,c:"#f472b6"}].map((x,j)=>(
                      <div key={j} style={{background:"#07090f",borderRadius:9,padding:12}}>
                        <div style={{fontSize:9,color:"#1a2540",textTransform:"uppercase",letterSpacing:".07em",fontWeight:700,marginBottom:5}}>{x.l}</div>
                        <div style={{fontSize:16,fontWeight:700,color:x.c,fontFamily:"'Courier New',monospace"}}>{peso(x.v)}</div>
                      </div>
                    ))}
                  </div>
                  {tot>0&&(
                    <div style={{height:5,borderRadius:3,display:"flex",gap:1,overflow:"hidden"}}>
                      {[{v:iLeak,c:"#f59e0b"},{v:sLeak,c:"#ef4444"},{v:fLeak,c:"#f472b6"}].map((x,j)=>(
                        <div key={j} style={{flex:x.v,background:x.c,minWidth:x.v>0?2:0}}/>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={S.card}>
              <SLabel t="Benchmark Reference"/>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  {["Metric","Target","Caution","Red Flag"].map(h=><th key={h} style={{...S.th,textAlign:"left"}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {[["Food Cost %","≤ 48%","48–52%","> 52%"],["SWT / Spoilage","≤ 3% of sales","3–5%","> 5%"],["End Inventory","≤ ₱500K","₱500K–₱650K","> ₱650K"],["Cash on Hand","≥ ₱3.5M","₱2M–₱3.5M","< ₱2M"],["Total Overhead","≤ ₱468K/mo","₱468–550K","> ₱550K"]].map((r,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #07090f"}}>
                      <td style={{...S.td,textAlign:"left",fontFamily:"inherit",color:"#cbd5e1"}}>{r[0]}</td>
                      <td style={{...S.td,textAlign:"left",fontFamily:"inherit",color:"#22c55e"}}>{r[1]}</td>
                      <td style={{...S.td,textAlign:"left",fontFamily:"inherit",color:"#f59e0b"}}>{r[2]}</td>
                      <td style={{...S.td,textAlign:"left",fontFamily:"inherit",color:"#ef4444"}}>{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══ MODAL: Month ══ */}
      {mOpen&&(
        <div style={S.overlay} onClick={()=>setMOpen(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:"#f1f5f9",marginBottom:3}}>{editId?"Edit Month":"Log New Month"}</div>
            <div style={{fontSize:10,color:"#334155",marginBottom:16}}>All amounts in Philippine Peso</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="Month" full><Inp value={mf.month} onChange={e=>setMf({...mf,month:e.target.value})} placeholder="Mar 2026"/></Field>
              <Field label="Sales (₱)"><Inp value={mf.sales} onChange={e=>setMf({...mf,sales:e.target.value})} placeholder="1657172"/></Field>
              <Field label="Net Profit — disc-net (₱)"><Inp value={mf.netProfit} onChange={e=>setMf({...mf,netProfit:e.target.value})} placeholder="1479000"/></Field>
              <Field label="Beg Inventory (₱)"><Inp value={mf.begInv} onChange={e=>setMf({...mf,begInv:e.target.value})} placeholder="732000"/></Field>
              <Field label="End Inventory (₱)"><Inp value={mf.endInv} onChange={e=>setMf({...mf,endInv:e.target.value})} placeholder="710000"/></Field>
              <Field label="SWT — Spoilage / Waste / Trimmings (₱)" full><Inp value={mf.swt} onChange={e=>setMf({...mf,swt:e.target.value})} placeholder="120000"/></Field>
              <Field label="Food & Packaging (₱)"><Inp value={mf.foodPkg} onChange={e=>setMf({...mf,foodPkg:e.target.value})} placeholder="828000"/></Field>
              <Field label="Food Cost %"><Inp value={mf.foodCostPct} onChange={e=>setMf({...mf,foodCostPct:e.target.value})} placeholder="50"/></Field>
            </div>
            <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #1a2540"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#1a2540",textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>Overhead</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {OH_KEYS.map(k=>(
                  <Field key={k} label={k}>
                    <Inp value={mf.oh[k]} onChange={e=>setMf({...mf,oh:{...mf.oh,[k]:e.target.value}})} placeholder="0"/>
                  </Field>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={saveM} style={{...btnBase,background:"#1d4ed8",color:"#fff",flex:1}}>{editId?"Save Changes":"Add Month"}</button>
              <button onClick={()=>setMOpen(false)} style={{...btnBase,background:"transparent",color:"#475569",border:"1px solid #1a2540"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Weekly ══ */}
      {wOpen&&(
        <div style={S.overlay} onClick={()=>setWOpen(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:"#f1f5f9",marginBottom:3}}>Log Weekly Cash</div>
            <div style={{fontSize:10,color:"#334155",marginBottom:16}}>Enter account balances as of the date</div>
            <Field label="Date"><Inp value={wf.date} onChange={e=>setWf({...wf,date:e.target.value})} placeholder="Mar 9, 2026"/></Field>
            <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:9}}>
              {ACCTS.map(k=>(
                <div key={k} style={{display:"grid",gridTemplateColumns:"140px 1fr",alignItems:"center",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:ACCT_CLR[k]}}/>
                    <span style={{fontSize:12,fontWeight:600,color:"#94a3b8"}}>{k}</span>
                  </div>
                  <Inp value={wf.acc[k]} onChange={e=>setWf({...wf,acc:{...wf.acc,[k]:e.target.value}})} placeholder="0"/>
                </div>
              ))}
            </div>
            <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #1a2540",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",fontFamily:"'Courier New',monospace"}}>
                Total: {peso(ACCTS.reduce((s,k)=>s+(Number(wf.acc[k])||0),0),2)}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={saveW} style={{...btnBase,background:"#1d4ed8",color:"#fff"}}>Save Entry</button>
                <button onClick={()=>setWOpen(false)} style={{...btnBase,background:"transparent",color:"#475569",border:"1px solid #1a2540"}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Overhead ══ */}
      {ohOpen&&(
        <div style={S.overlay} onClick={()=>setOhOpen(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:"#f1f5f9",marginBottom:3}}>{editOhId?"Edit Overhead":"Log Overhead"}</div>
            <div style={{fontSize:10,color:"#334155",marginBottom:16}}>Monthly overhead breakdown</div>
            <Field label="Month"><Inp value={of.month} onChange={e=>setOf({...of,month:e.target.value})} placeholder="Mar 2026"/></Field>
            <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:9}}>
              {OH_KEYS.map((k,i)=>(
                <div key={k} style={{display:"grid",gridTemplateColumns:"160px 1fr",alignItems:"center",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:["#3b82f6","#8b5cf6","#06b6d4","#f59e0b"][i]}}/>
                    <span style={{fontSize:12,fontWeight:600,color:"#94a3b8"}}>{k}</span>
                  </div>
                  <Inp value={of[k]} onChange={e=>setOf({...of,[k]:e.target.value})} placeholder="0"/>
                </div>
              ))}
            </div>
            <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #1a2540",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",fontFamily:"'Courier New',monospace"}}>
                Total: {peso(OH_KEYS.reduce((s,k)=>s+(Number(of[k])||0),0))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={saveOH} style={{...btnBase,background:"#15803d",color:"#fff"}}>{editOhId?"Save Changes":"Save"}</button>
                <button onClick={()=>{setOhOpen(false);setEditOhId(null);}} style={{...btnBase,background:"transparent",color:"#475569",border:"1px solid #1a2540"}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
