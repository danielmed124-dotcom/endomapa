param([string]$Origem)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public static class FollicleAsset {
  public static void Prepare(string source, string destination) {
    using (var original = new Bitmap(source))
    using (var image = original.Clone(new Rectangle(0,0,original.Width,original.Height),PixelFormat.Format32bppArgb)) {
      int w=image.Width,h=image.Height;
      var data=image.LockBits(new Rectangle(0,0,w,h),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
      var pixels=new byte[w*h*4];
      try {
        Marshal.Copy(data.Scan0,pixels,0,pixels.Length);
        var visited=new bool[w*h]; var queue=new Queue<int>();
        for(int x=0;x<w;x++) {queue.Enqueue(x);queue.Enqueue((h-1)*w+x);}
        for(int y=0;y<h;y++) {queue.Enqueue(y*w);queue.Enqueue(y*w+w-1);}
        while(queue.Count>0) {
          int p=queue.Dequeue(); if(visited[p]) continue; visited[p]=true;
          int i=p*4; int brightness=Math.Max(pixels[i],Math.Max(pixels[i+1],pixels[i+2]));
          if(brightness>=65) continue;
          // Remove somente o fundo escuro conectado a borda; preserva o interior.
          double alpha=Math.Max(0,Math.Min(1,(brightness-10)/55.0));
          pixels[i+3]=(byte)Math.Round(255*alpha);
          for(int c=0;c<3;c++) pixels[i+c]=alpha==0?(byte)0:(byte)Math.Min(255,Math.Round(pixels[i+c]/alpha));
          int x=p%w,y=p/w;
          if(x>0) queue.Enqueue(p-1); if(x<w-1) queue.Enqueue(p+1);
          if(y>0) queue.Enqueue(p-w); if(y<h-1) queue.Enqueue(p+w);
        }
        Marshal.Copy(pixels,0,data.Scan0,pixels.Length);
      } finally {image.UnlockBits(data);}
      image.Save(destination,ImageFormat.Png);
    }
  }
}
'@
if (!$Origem) { throw 'Informe o caminho da imagem original em -Origem.' }
$saida = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../assets/lesoes/foliculo.png'))
[FollicleAsset]::Prepare([IO.Path]::GetFullPath($Origem),$saida)
Write-Output 'Folículo preparado com transparência e resolução original.'
