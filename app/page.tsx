'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Volume2, VolumeX, Pause, ArrowUp, ArrowDown, ArrowLeft, MessageCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Game, type Resident, type Conversation } from './world';

export default function Home() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null);
  const [ready, setReady] = useState(false), [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false), [paused, setPaused] = useState(false), [sound, setSound] = useState(false);
  const playingRef=useRef(playing);playingRef.current=playing;
  const [near, setNear] = useState<Resident | null>(null);
  const [talk, setTalk] = useState<Conversation | null>(null);
  const [heard, setHeard] = useState<string[]>([]);
  const [aside, setAside] = useState<{name:string;line:string}|null>(null);
  const audio = useRef<{ctx:AudioContext;gain:GainNode}|null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const g = new Game(canvas.current, { nearby: setNear, conversation: c => { setTalk(c); if(c) setHeard(old => old.includes(c.resident.id) ? old : [...old,c.resident.id]); }, aside: setAside, pause: () => setPaused(p => !p) });
    game.current = g;
    g.load().then(()=>{setReady(true);if(playingRef.current)g.start();}).catch(()=>setError(true));
    return () => { g.destroy(); game.current = null; };
  }, []);
  useEffect(() => { game.current?.setPaused(paused); }, [paused]);
  useEffect(() => {
    const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!context?.registerTool||!ready)return;
    const lifecycle=new AbortController();
    try { void Promise.resolve(context.registerTool({name:'start_city_story',title:'Enter Lantern Alley',description:'Start City Dummy Story and show the playable alley.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input:unknown)=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object.');setPlaying(true);game.current?.start();await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));return {story:'City Dummy Story',location:'Lantern Alley',started:true};}},{signal:lifecycle.signal})).catch(()=>{}); } catch { /* Optional browser API is unavailable. */ }
    return()=>lifecycle.abort();
  },[ready]);
  useEffect(() => () => { void audio.current?.ctx.close(); }, []);
  function start() { setPlaying(true); game.current?.start(); canvas.current?.focus(); }
  function closeTalk() { game.current?.endConversation(); canvas.current?.focus(); }
  function toggleSound() {
    if (!audio.current) {
      const ctx = new AudioContext(), gain=ctx.createGain(); gain.gain.value=0; gain.connect(ctx.destination);
      const buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate), data=buffer.getChannelData(0);
      let brown=0; for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.022)/1.025;data[i]=brown*2.8;}
      const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1100;source.connect(filter);filter.connect(gain);source.start();
      [55,82.41,110.18].forEach((f,i)=>{const osc=ctx.createOscillator(),v=ctx.createGain();osc.type='sine';osc.frequency.value=f;v.gain.value=.022/(i+1);osc.connect(v);v.connect(gain);osc.start();});
      audio.current={ctx,gain};
    }
    const next=!sound;void audio.current.ctx.resume();audio.current.gain.gain.setTargetAtTime(next ? .28 : 0,audio.current.ctx.currentTime,.5);setSound(next);
  }
  return <main className={`experience ${playing?'in-game':'at-home'}`}>
    <div className="world-wrap"><canvas ref={canvas} width={1200} height={800} tabIndex={0} aria-label="City alley. Move with WASD or arrow keys. Press E near a resident to talk. Escape pauses." /><div className="scene-vignette" aria-hidden="true" /></div>
    <header className="topbar"><div className="district"><span className="signal"/><span>LOWER CITY <span className="district-sep">/</span> AFTER HOURS</span></div><div className="top-actions"><button className="icon-button" onClick={toggleSound} aria-label={sound?'Mute city ambience':'Enable city ambience'}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>{playing&&<button className="icon-button" onClick={()=>setPaused(true)} aria-label="Pause game"><Pause size={19}/></button>}</div></header>
    {!playing ? <section className="home-content"><div className="edition"><span/> A CITY FULL OF OTHER LIVES</div><h1><span>Life and Adventures of</span><strong>Swango<span className="title-period">.</span></strong></h1><p className="home-line">Every window, a life.<br/>Every stranger, a story.</p><button className="start-button" onClick={start} disabled={!ready}><span>{error?'The alley could not load':ready?'Enter the city':'Opening the alley…'}</span><ArrowRight size={22}/></button>{error&&<button className="text-button" onClick={()=>window.location.reload()}>Try again</button>}<div className="story-caption">STORY: CITY DUMMY STORY <span>01</span></div></section> : <>
      <div className="chapter"><span>STORY: CITY DUMMY STORY</span><h1>Lantern Alley</h1><p>Stay a little. People have things to say.</p></div>
      {aside&&!talk&&<div className="overheard" aria-live="polite"><span>OVERHEARD · {aside.name}</span><p>“{aside.line}”</p></div>}
      {!talk&&near&&<button className="talk-prompt" onClick={()=>game.current?.interact()}><kbd>E</kbd><span>Talk to {near.name}</span><MessageCircle size={17}/></button>}
      {!talk&&!near&&<div className="explore-hint">Walk up to someone to say hello.</div>}
      {talk&&<section className="conversation" aria-label={`Conversation with ${talk.resident.name}`}><div className="conversation-top"><div><span className="speaker">{talk.resident.name}</span><span className="occupation">{talk.resident.role}</span></div><button className="icon-button" onClick={closeTalk} aria-label="Leave conversation"><X size={18}/></button></div><p className="dialogue-line" aria-live="polite">{talk.line}</p><div className="responses">{talk.choices?.map((choice,i)=><button key={choice.text} onClick={()=>game.current?.choose(i)}><span>0{i+1}</span>{choice.text}<ArrowRight size={16}/></button>)}<button className="leave-response" onClick={closeTalk}>{talk.choices?'Leave them to their evening':'See you around.'}<span>↵</span></button></div></section>}
      <div className="touch-controls" aria-label="Movement controls">{[['up',ArrowUp],['left',ArrowLeft],['down',ArrowDown],['right',ArrowRight]].map(([dir,Icon])=>{const I=Icon as typeof ArrowUp,d=dir as string;return <button key={d} className={`direction ${d}`} aria-label={`Move ${d}`} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);game.current?.setDirection(d,true);}} onPointerUp={()=>game.current?.setDirection(d,false)} onPointerCancel={()=>game.current?.setDirection(d,false)}><I size={22}/></button>;})}</div>
    </>}
    <footer className="bottom-bar"><div className="control-legend"><span><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> Move</span><span><kbd>E</kbd> Talk</span><span><kbd>ESC</kbd> Pause</span></div><span className="footer-note">{playing?`${heard.length} / 4 LIVES CROSSED`:'A SMALL PLACE. A FIRST CHAPTER.'}</span></footer>
    <Dialog open={paused} onOpenChange={setPaused}><DialogContent className="pause-panel"><DialogTitle>Take a breath.</DialogTitle><DialogDescription>The city will still be here.</DialogDescription><button className="start-button" onClick={()=>{setPaused(false);canvas.current?.focus();}}>Back to the alley <ArrowRight size={20}/></button><button className="text-button" onClick={()=>{setPaused(false);setPlaying(false);game.current?.home();setTalk(null);setNear(null);setAside(null);}}>Return to title</button><p className="pause-help">WASD or arrows to move. E to talk.<br/>Click the ground to walk there.<br/>1 / 2 to answer. Escape to step away.</p></DialogContent></Dialog>
  </main>;
}
