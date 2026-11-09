const fs=require('fs'),vm=require('vm');
const root='d:/Documents/Tencent Files/毕设/毕设/';
const ctx={window:{},document:{createElement:()=>({getContext:()=>null,style:{}}),addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],body:{classList:{add(){},remove(){}}}},localStorage:{getItem:()=>null,setItem(){}},console};
vm.createContext(ctx);
const core=fs.readFileSync(root+'js/core.js','utf8');
const map=fs.readFileSync(root+'js/map.js','utf8');
function cut(src,startMarker,endMarker){
  const a=src.indexOf(startMarker);if(a<0)throw new Error('miss '+startMarker);
  const b=src.indexOf(endMarker,a);if(b<0)throw new Error('miss end '+startMarker);
  return src.slice(a,b+endMarker.length)+'\n';
}
const alias=cut(core,'const CITY_ALIAS={','\n};');
const prov=cut(core,'const CITY_PROV=','\n};');
const canon=cut(core,'function cityCanon(','\n}');
const pa=cut(map,'const PROV_ADCODE=','};');
const ex=cut(map,'const CITY2PROV_EXTRA=','\n};');
console.log('---canon---');console.log(canon);
vm.runInContext(alias+prov+canon+pa+ex+';globalThis.C=cityCanon;globalThis.CP=CITY_PROV;globalThis.EX=CITY2PROV_EXTRA;globalThis.PA=PROV_ADCODE;',ctx);
console.log('canon test',ctx.C('湘西'),ctx.C('湘西州'));
vm.runInContext(fs.readFileSync(root+'js/data.js','utf8')+';globalThis.S=SPOTS;',ctx);
const cn=ctx.S.filter(s=>s.rg==='cn');
const bad=[];
cn.forEach(s=>{
  const k=ctx.C(s.city);
  const p=ctx.CP[k]||ctx.EX[k]||'';
  if(!p||!ctx.PA[p])bad.push(s.n+'('+s.id+') city='+s.city+' -> '+k+' -> '+p);
});
console.log('cn total',cn.length);
console.log('UNRESOLVED',bad.length);bad.forEach(x=>console.log('  ',x));
const byProv={};cn.forEach(s=>{const k=ctx.C(s.city);const p=ctx.CP[k]||ctx.EX[k];byProv[p]=(byProv[p]||0)+1;});
const all=['北京','上海','天津','重庆','河北','山西','内蒙古','辽宁','吉林','黑龙江','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆','台湾','香港','澳门'];
const zero=all.filter(p=>!byProv[p]);
console.log('provinces covered',all.length-zero.length,'/',all.length,'zero:',zero.join(',')||'none');
