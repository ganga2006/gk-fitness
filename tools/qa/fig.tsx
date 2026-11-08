import { createRoot } from 'react-dom/client';
import { Figure } from '../../src/anim/Figure';
import { ANIMS } from '../../src/anim/poses';
const keys = Object.keys(ANIMS);
createRoot(document.getElementById('r')!).render(
  <div className="g">{keys.map((k) => <div className="c" key={k}><span>{k}</span><Figure anim={k} playing /></div>)}</div>);
setTimeout(() => ((window as any).__done = true), 2500);
