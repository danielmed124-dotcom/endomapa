$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.IO;
using System.IO.Compression;
using System.Drawing;
using System.Drawing.Imaging;
using System.Text;
using System.Text.RegularExpressions;
public static class SompPdfImage {
 public static void Extract(string path,string output){
  byte[] pdf=File.ReadAllBytes(path); string text=Encoding.GetEncoding(28591).GetString(pdf);
  var match=Regex.Match(text,@"19 0 obj[\s\S]*?/Length (\d+)[\s\S]*?stream\r?\n");
  if(!match.Success || !match.Value.Contains("/Width 1086") || !match.Value.Contains("/Height 1448") || !match.Value.Contains("/Predictor 11")) throw new Exception("Formato PDF diferente da referencia esperada.");
  int length=int.Parse(match.Groups[1].Value); byte[] raw;
  using(var input=new MemoryStream(pdf,match.Index+match.Length+2,length-6))
  using(var zip=new DeflateStream(input,CompressionMode.Decompress))
  using(var decoded=new MemoryStream()){zip.CopyTo(decoded);raw=decoded.ToArray();}
  int stride=1086*3;
  if(raw.Length!=(stride+1)*1448)throw new Exception("Dimensoes descomprimidas invalidas.");
  using(var image=new Bitmap(1086,1448)){
   for(int y=0;y<1448;y++){
    int offset=y*(stride+1); int filter=raw[offset];
    if(filter!=0 && filter!=1)throw new Exception("Filtro PNG nao previsto: "+filter);
    for(int i=0;i<stride;i++) if(filter==1 && i>=3)raw[offset+1+i]=unchecked((byte)(raw[offset+1+i]+raw[offset+1+i-3]));
    for(int x=0;x<1086;x++){int p=offset+1+x*3;image.SetPixel(x,y,Color.FromArgb(raw[p],raw[p+1],raw[p+2]));}
   }
   image.Save(output,ImageFormat.Png);
  }
 }
}
'@
[SompPdfImage]::Extract('C:\Users\Daniel\Downloads\endomapa-manual-coronal-a4 (5).pdf',(Join-Path $PSScriptRoot 'referencia-original.png'))
