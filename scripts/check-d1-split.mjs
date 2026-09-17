// Chép nguyên thuật toán từ node_modules/wrangler/wrangler-dist/cli.js (src/d1/splitter.ts)
import { readFileSync } from 'node:fs';
function consumeWhile(it, pred){let n=it.next(),s='';while(!n.done){s+=n.value;if(!pred(s))break;n=it.next();}return s;}
function consumeUntilMarker(it, m){let n=it.next(),s='';while(!n.done){s+=n.value;if(s.endsWith(m))break;n=it.next();}return s;}
function isDollarQuoteIdentifier(s){const l=s.slice(-1);return /[a-zA-Z0-9_]/.test(l)||(l==='$'&&s.length>0);}
function isCompoundStatementStart(s){return /\s(BEGIN|CASE)\s$/i.test(s);}
function isCompoundStatementEnd(s){return /\sEND[;\s]$/.test(s);}
function split(sql){const st=[];let str='';const stack=[];const it=sql[Symbol.iterator]();let next=it.next();
 while(!next.done){const c=next.value;if(stack[0]?.(str+c))stack.shift();
  switch(c){case "'":case '"':case '`':str+=c+consumeUntilMarker(it,c);break;
   case '$':{const d='$'+consumeWhile(it,isDollarQuoteIdentifier);str+=d;if(d.endsWith('$'))str+=consumeUntilMarker(it,d);break;}
   case '-':next=it.next();if(!next.done&&next.value==='-'){consumeUntilMarker(it,'\n');str+='\n';break;}else{str+=c;continue;}
   case '/':next=it.next();if(!next.done&&next.value==='*'){consumeUntilMarker(it,'*/');break;}else{str+=c;continue;}
   case ';':if(stack.length===0){st.push(str);str='';}else str+=c;break;
   default:str+=c;}
  if(isCompoundStatementStart(str))stack.unshift(isCompoundStatementEnd);next=it.next();}
 st.push(str);return st.map(s=>s.trim()).filter(Boolean);}
const f=process.argv[2]; const parts=split(readFileSync(f,'utf8'));
const sizes=parts.map(p=>Buffer.byteLength(p)).sort((a,b)=>b-a);
console.log(f.split('/').pop(), '→', parts.length, 'câu lệnh | lớn nhất', sizes[0], 'bytes', sizes[0] > 100000 ? '❌ QUÁ 100KB' : '✅');
