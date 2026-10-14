param([Parameter(Mandatory=$true)][string]$Origem, [Parameter(Mandatory=$true)][string]$Destino)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class FollicleBlue {
  public static void Convert(string source, string target) {
    using (var original = new Bitmap(source))
    using (var result = original.Clone(new Rectangle(0,0,original.Width,original.Height),PixelFormat.Format32bppArgb)) {
      var area = new Rectangle(0,0,result.Width,result.Height);
      var bits = result.LockBits(area,ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
      try {
        var row = new byte[result.Width*4];
        for(int y=0;y<result.Height;y++) {
          var ptr=IntPtr.Add(bits.Scan0,y*bits.Stride);
          Marshal.Copy(ptr,row,0,row.Length);
          for(int i=0;i<row.Length;i+=4) {
            // RGB -> GBR: rotação de matiz de 240 graus, sem arredondamento.
            // Mantém alfa, luminosidade HSL, saturação, resolução e geometria.
            byte b=row[i], g=row[i+1], r=row[i+2];
            row[i]=r; row[i+1]=b; row[i+2]=g;
          }
          Marshal.Copy(row,0,ptr,row.Length);
        }
      } finally { result.UnlockBits(bits); }
      result.Save(target,ImageFormat.Png);
    }
    using(var before=new Bitmap(source))
    using(var after=new Bitmap(target)) {
      if(before.Size!=after.Size) throw new Exception("Dimensões alteradas.");
      for(int y=0;y<before.Height;y++) for(int x=0;x<before.Width;x++) {
        var a=before.GetPixel(x,y); var b=after.GetPixel(x,y);
        if(a.A!=b.A || a.G!=b.R || a.B!=b.G || a.R!=b.B)
          throw new Exception("Conversão ou transparência divergente.");
      }
      Console.WriteLine("Conferidos todos os pixels: " + before.Width + " x " + before.Height + "; alfa idêntico e cores convertidas sem perda.");
    }
  }
}
'@
[FollicleBlue]::Convert([IO.Path]::GetFullPath($Origem),[IO.Path]::GetFullPath($Destino))
