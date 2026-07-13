

## for float division using / 
from __future__ import division
import math

from incremental_file import save_incrementaly



__author__ = "Mindfulness"
__version__ = "0.1"

## VARIABLES -----------------

canvas_width = 200
canvas_height = 200

count = 44

radius = 20
radius_max = 40
radius_min = 20

scale_max = 20
scale_min = 5

stroke_width = "0%"
fill_color = "#ff0000"
opacity = 0.1


## ----------------------------


out_x = []
out_y = []
out_z = []

out_r = []


sine = '<svg viewBox="0 0 {} {}" xmlns="http://www.w3.org/2000/svg">'.format(canvas_width, canvas_height)



for c in range(int(count)):
    
    angle = 0
    
    if c != 0:
        angle = 360/(count/c)

    ## make in degrees 
    angle_deg = angle * 0.0174532925

    ##print('angle is') 
    
    ##print (c)
    ##print (angle)
    ##print ('------------')  

    
    ##
    # function scope ( from 0 to max)
    ##
    max = 2*math.pi

    ## 
    # maximum scale
    ##
    s_max = 20


    ## THE CIRCLE
    y = math.sin(c/count * max) * radius
    x = math.cos(c/count * max) * radius

    # Now adding offset to center
    x = x + canvas_width/2
    y = y + canvas_height/2


    ## small circle radius

    sr_range = scale_max - scale_min
    sr_c = c/count * sr_range
    sr_c = sr_c + scale_min

    r = c/count * s_max
    o = c/count

    """
    print('opacity is')
    print (opacity)
    """
    
    ##x = math.sin(angle_deg) * radius

    ##x = c * 10
    
    ##y = math.cos(angle_deg) * radius
    
    out_x.append(x)
    out_y.append(y)
    out_z.append(0)
    out_r.append(angle)

    sine += '<circle cx="{}" cy="{}" r="{}" opacity="{}" fill="{}" stroke="black" stroke-width="{}" />\n'.format(x, y, sr_c, opacity, fill_color, stroke_width)


sine += '</svg>'


save_incrementaly('./out', sine)