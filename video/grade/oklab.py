import numpy as np
def srgb_to_lin(c): return np.where(c<=0.04045, c/12.92, ((c+0.055)/1.055)**2.4)
def lin_to_srgb(c):
    c=np.clip(c,0,1); return np.where(c<=0.0031308, c*12.92, 1.055*c**(1/2.4)-0.055)
M1=np.array([[0.4122214708,0.5363325363,0.0514459929],[0.2119034982,0.6806995451,0.1073969566],[0.0883024619,0.2817188376,0.6299787005]])
M2=np.array([[0.2104542553,0.7936177850,-0.0040720468],[1.9779984951,-2.4285922050,0.4505937099],[0.0259040371,0.7827717662,-0.8086757660]])
def rgb_to_oklab(rgb):
    lms=srgb_to_lin(rgb)@M1.T; return np.cbrt(lms)@M2.T
def oklab_to_rgb(lab):
    lms=(lab@np.linalg.inv(M2).T)**3; return lin_to_srgb(lms@np.linalg.inv(M1).T)
