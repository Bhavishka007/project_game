// Tiny server: serves the game from ./dist and stores result cards so phones can download them via QR.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import {fileURLToPath} from 'node:url'
const dir=path.dirname(fileURLToPath(import.meta.url)),dist=path.join(dir,'dist'),cards=path.join(dir,'cards')
fs.mkdirSync(cards,{recursive:true})
const PORT=+process.env.PORT||3000
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'}
const ips=()=>Object.values(os.networkInterfaces()).flat().filter(i=>i&&i.family==='IPv4'&&!i.internal).map(i=>i.address)
const page=id=>`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Your Face Wars card</title>
<body style="margin:0;background:#0b0a1a;color:#fff;font-family:system-ui;text-align:center;padding:20px">
<h2 style="font-size:28px;margin:8px 0 16px">Your Face Wars card</h2>
<img src="/card/${id}.jpg" style="max-width:100%;border-radius:14px;box-shadow:0 10px 40px #ff3b6b88">
<p><a href="/card/${id}.jpg" download="face-wars.jpg" style="display:inline-block;margin-top:18px;padding:14px 28px;border-radius:12px;background:#ff3b6b;color:#fff;font-weight:700;text-decoration:none">Download photo</a></p>
<p style="opacity:.6;font-size:13px">If the button does nothing, press and hold the photo and choose Save.</p></body>`
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x')
  if(u.pathname==='/api/info'){res.setHeader('content-type','application/json');return res.end(JSON.stringify({ips:ips(),port:PORT}))}
  if(req.method==='POST'&&u.pathname==='/api/card'){
    const ch=[];let n=0
    req.on('data',c=>{n+=c.length;if(n>8e6)req.destroy();else ch.push(c)})
    req.on('end',()=>{const id=crypto.randomBytes(5).toString('hex');fs.writeFileSync(path.join(cards,id+'.jpg'),Buffer.concat(ch));res.setHeader('content-type','application/json');res.end(JSON.stringify({id}))})
    return
  }
  let m=u.pathname.match(/^\/card\/([a-f0-9]+)\.jpg$/)
  if(m){const f=path.join(cards,m[1]+'.jpg');if(!fs.existsSync(f)){res.statusCode=404;return res.end('Not found')}res.setHeader('content-type','image/jpeg');return fs.createReadStream(f).pipe(res)}
  m=u.pathname.match(/^\/card\/([a-f0-9]+)$/)
  if(m){res.setHeader('content-type','text/html');return res.end(page(m[1]))}
  const f=path.resolve(dist,'.'+(u.pathname==='/'?'/index.html':u.pathname))
  if(!f.startsWith(dist)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;return res.end('Not found')}
  res.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res)
}).listen(PORT,'0.0.0.0',()=>{
  console.log(`\nFace Wars is running.\n  Open on the laptop:  http://localhost:${PORT}`)
  ips().forEach(i=>console.log(`  Phones (same Wi-Fi): http://${i}:${PORT}`))
})
