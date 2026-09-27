import sys, subprocess, numpy as np
from grade import grade, ss
IN,OUT=sys.argv[1],sys.argv[2]
FR=[int(f) for f in sys.argv[3].split(',')] if len(sys.argv)>3 else None   # preview: frame numbers
W,H,FPS=1280,720,24
# shots (seconds): moon shots get broad sky grad; city shots get qualified sky grad
MOON=[(3.125,4.708),(9.041,99)]
CITY=[(0,3.125),(7.208,8.416)]
y=np.linspace(0,1,H)[:,None]*np.ones((1,W))
gradMoon=1-ss(0.18,0.36,y)
gradCity=1-ss(0.30,0.55,y)
def sky_for(t):
    for s,e in MOON:
        if s<=t<e: return gradMoon,True
    for s,e in CITY:
        if s<=t<e: return gradCity,False
    return None,False
dec=subprocess.Popen(['ffmpeg','-v','error','-i',IN,'-f','rawvideo','-pix_fmt','rgb48le','-'],stdout=subprocess.PIPE)
if FR is None:
    enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb48le','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
        '-i',IN,'-map','0:v','-map','1:a','-c:v','libx264','-preset','slow','-crf','15','-pix_fmt','yuv420p',
        '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','copy','-movflags','+faststart','-shortest',OUT],stdin=subprocess.PIPE)
n=0; fs=W*H*3*2
while True:
    buf=dec.stdout.read(fs)
    if len(buf)<fs: break
    if FR is None or n in FR:
        rgb=np.frombuffer(buf,np.uint16).reshape(H,W,3).astype(np.float32)/65535
        sw,broad=sky_for(n/FPS)
        out=grade(rgb,sw,broad)
        o16=(out*65535+0.5).astype(np.uint16)
        if FR is None: enc.stdin.write(o16.tobytes())
        else:
            from PIL import Image; Image.fromarray((out*255+0.5).astype(np.uint8)).save(f'{OUT}_{n:03d}.png')
    n+=1
    if FR is not None and n>max(FR): break
if FR is None: enc.stdin.close(); enc.wait()
dec.stdout.close(); dec.kill()
print('frames',n)
