import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MascotRig} from '../../src/customer/mascot/MascotRig';
import '../../src/customer/hero-gaze.css';
function Preview(){
 const [mode,setMode]=useState('live'),[dark,setDark]=useState(false),[face,setFace]=useState(false);
 const presets:any={neutral:{eyes:{x:0,y:0},head:{x:0,y:0},headRoll:0,eyeOpen:1},left:{eyes:{x:-1,y:0},head:{x:-1,y:0},headRoll:-1.5,eyeOpen:1},right:{eyes:{x:1,y:0},head:{x:1,y:0},headRoll:1.5,eyeOpen:1},closed:{eyes:{x:0,y:0},head:{x:0,y:0},headRoll:0,eyeOpen:0},half:{eyes:{x:0,y:0},head:{x:0,y:0},headRoll:0,eyeOpen:.5}};
 return <main style={{background:dark?'#172c24':'#f5f1e8',color:dark?'white':'#173e30',minHeight:'100vh',fontFamily:'Arial',padding:20}}><h1>בדיקת שכבות — ללא עניבה</h1><nav style={{display:'flex',gap:12}}>{Object.keys({live:1,...presets}).map(m=><button key={m} onClick={()=>setMode(m)}>{m}</button>)}<button onClick={()=>setDark(!dark)}>רקע</button><button onClick={()=>setFace(!face)}>פנים</button></nav><div style={{display:'flex',gap:20,flexWrap:'wrap'}}><section><h2>Rig</h2><div style={{width:550,maxWidth:'90vw'}}><MascotRig previewPose={presets[mode]} inspectFace={face}/></div></section><section><h2>איור החליפה</h2><svg viewBox={face?'470 15 300 370':'0 0 1254 1254'} style={{width:550,maxWidth:'90vw'}}><image href="../../public/companion/rig/master.png" width="1254" height="1254"/></svg></section></div></main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
