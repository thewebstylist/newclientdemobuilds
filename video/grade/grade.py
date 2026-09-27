import numpy as np
from PIL import Image, ImageFilter
from oklab import *
def ss(e0,e1,x): t=np.clip((x-e0)/(e1-e0),0,1); return t*t*(3-2*t)
P=dict(mid_cool=0.40, hi_cool=1.0, sh_cool=0.85, cast_cap=0.065,
       blue_sh=0.030, blue_mid=0.008, blue_hi=0.014, protect_lo=0.085, protect_hi=0.15,
       contrast=1.25, pivot=0.45, black=0.02, hi_lift=0.04, chroma=1.22, skin_boost=1.18,
       bloom=0.22, bloom_thr=0.72)
U70=np.array([np.cos(np.radians(70)),np.sin(np.radians(70))])
U255=np.array([np.cos(np.radians(255)),np.sin(np.radians(255))])

def sky_night(L,a,b,C,h,w,broad):
    """Turn golden sky into moonlit night-blue. w = spatial weight (0..1)."""
    if broad:   # moon shots: whole dusky sky band
        q=ss(40,55,h)*(1-ss(90,110,h))*(1-ss(0.10,0.14,C))*ss(0.20,0.30,L)
    else:       # city shots: only bright, clearly golden glow (not faces)
        q=ss(58,66,h)*(1-ss(88,100,h))*ss(0.065,0.085,C)*(1-ss(0.13,0.16,C))*ss(0.56,0.62,L)
    k=w*q*(0.6 if broad else 1.0)
    moon=ss(0.66,0.80,L)                       # keep the moon disc bright white
    tgtC=(0.034 if broad else 0.045)*(1-moon)+0.012*moon
    a2=U255[0]*tgtC; b2=U255[1]*tgtC
    L2=L*(1-(0.06 if broad else 0.12)*(1-moon))                     # deepen sky slightly, not the moon
    return L+(L2-L)*k, a+(a2-a)*k, b+(b2-b)*k

def grade(rgb, skyw=None, broad=False, p=P):
    lab=rgb_to_oklab(rgb); L,a,b=lab[...,0],lab[...,1],lab[...,2]
    C=np.hypot(a,b); h=np.degrees(np.arctan2(b,a))%360
    if skyw is not None:
        L,a,b=sky_night(L,a,b,C,h,skyw,broad); C=np.hypot(a,b)
    # 1) remove golden cast: strong in highlights/shadows, gentle in skin midtones; saturated colors protected
    along=a*U70[0]+b*U70[1]
    amt=p['mid_cool']+(p['hi_cool']-p['mid_cool'])*ss(0.50,0.66,L)+(p['sh_cool']-p['mid_cool'])*(1-ss(0.18,0.38,L))
    protect=1-ss(p['protect_lo'],p['protect_hi'],C)
    sub=np.clip(along,0,p['cast_cap'])*amt*protect
    a=a-sub*U70[0]; b=b-sub*U70[1]
    # 2) moonlight tint: blue shadows, clean cool highlights, light touch in mids
    tint=p['blue_sh']*(1-ss(0.12,0.42,L))+p['blue_mid']*ss(0.3,0.5,L)*(1-ss(0.5,0.62,L))+p['blue_hi']*ss(0.52,0.7,L)*(1-ss(0.9,1.0,L))
    tint=tint*(0.4+0.6*protect)*ss(0.0,0.06,L)
    a=a+tint*U255[0]; b=b+tint*U255[1]
    # 3) contrast S-curve + highlight lift
    x=L; k=p['contrast']; pv=p['pivot']
    Ls=np.where(x<pv, pv*(np.clip(x,0,None)/pv)**k, pv+(1-pv)*(1-np.clip(1-(x-pv)/(1-pv),0,None)**k))
    Ls=p['black']+(1-p['black'])*Ls+p['hi_lift']*ss(0.6,0.95,x)*(1-ss(0.95,1,x))
    Ls=np.clip(Ls,0,1)
    # 4) vibrance, extra for skin/red hues
    C2=np.hypot(a,b); h2=np.degrees(np.arctan2(b,a))%360
    skin=ss(15,35,h2)*(1-ss(62,80,h2))
    gain=p['chroma']*(1+(p['skin_boost']-1)*skin)
    gain=1+(gain-1)*(1-ss(0.18,0.3,C2))
    out=oklab_to_rgb(np.stack([Ls,a*gain,b*gain],-1))
    # 5) soft cool bloom on bright highlights (moon, lights, whites)
    if p['bloom']>0:
        H,W=Ls.shape
        m=ss(p['bloom_thr'],0.95,Ls)
        small=Image.fromarray((m*255).astype(np.uint8)).resize((W//4,H//4),Image.BILINEAR)
        g=np.asarray(small.filter(ImageFilter.GaussianBlur(10)).resize((W,H),Image.BILINEAR)).astype(np.float32)/255
        glow=g[...,None]*np.array([0.86,0.93,1.0])*p['bloom']
        out=1-(1-out)*(1-glow)   # screen
    return np.clip(out,0,1)
