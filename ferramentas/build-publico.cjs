// Publicação por lista permitida: nunca copiar o repositório inteiro para o site.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dest=path.join(root,process.argv[2]||'dist-publico');
if(path.dirname(dest)!==root||!path.basename(dest).startsWith('dist-publico'))throw new Error('Destino deve ser uma pasta dist-publico dentro desta cópia.');
if(fs.existsSync(dest))throw new Error('dist-publico já existe. Use uma pasta limpa de implantação para não manter arquivos antigos.');
fs.mkdirSync(dest);
const files=new Set(['index.html','login.html','app.html','recuperar-senha.html','_headers']);
for(const name of ['index.html','login.html','app.html','recuperar-senha.html']){
 const text=fs.readFileSync(path.join(root,name),'utf8');
 for(const match of text.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)){
  const relative=match[1];if(!/^(https?:|data:|mailto:|#)/.test(relative)&&/\.(?:js|css)$/.test(relative))files.add(relative);
 }
}
for(const dir of ['assets','tubas','fusao-hycosy']){
 for(const file of fs.readdirSync(path.join(root,dir),{recursive:true,withFileTypes:true})){
  if(!file.isFile())continue;
  const absolute=path.join(file.parentPath||file.path,file.name);
  if(/\.(?:png|jpg|jpeg|webp|svg|woff2?|ttf|otf|js|css|html)$/i.test(file.name))files.add(path.relative(root,absolute).split(path.sep).join('/'));
 }
}
for(const relative of files){
 const source=path.resolve(root,relative),target=path.resolve(dest,relative);
 if(!source.startsWith(root+path.sep)||!target.startsWith(dest+path.sep))throw new Error('Caminho fora da publicação');
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
}
fs.writeFileSync(path.join(dest,'404.html'),'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página não encontrada | Endocarta</title><link rel="stylesheet" href="/styles.css"><main class="conteudo"><section class="cartao"><h1>Página não encontrada</h1><p>Este endereço não está disponível.</p><a href="/">Voltar ao Endocarta</a></section></main></html>');
console.log(JSON.stringify({arquivos:files.size+1,destino:path.basename(dest),excluidos:['tests','supabase','docs','output','arquivos de desenvolvimento','fluxos antigos não usados pelo aplicativo']}));
