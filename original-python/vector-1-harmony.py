from incremental_file import save_incrementaly 


"""Provides a scripting component.
    Inputs:
        dfgdfg: The x script variable
        y: The y script variable
    Output:
        a: The a output variable"""



__author__ = "Mindfulness"
__version__ = "2022.09.27"


import math

"declare initial variables"

ticks = 1000.0
path = 50

x_tone = 50.0
y_tone = 33
z_tone = 33

stroke_color = "black"
stroke_width = "0%"
fill_color = "#ff0000"
opacity = 0.2


## VARIABLES -----------------

canvas_width = 200
canvas_height = 200

"""Declare the output arrays"""

out_x = []
out_y = []
out_z = []

out_scale_x = []
out_scale_y = []
out_scale_z = []

size_x = 0
size_y = 0
size_z = 0

print (7.0/3.0)
print (x_tone)
print (y_tone)

y_scale = x_tone/y_tone
z_scale  = x_tone/z_tone

x_swings = float(ticks/x_tone)

print (x_swings)

y_swings = (x_swings/y_scale)
z_swings = (x_swings/z_scale)

x_path = path
y_path = x_path/y_scale
z_path = x_path/z_scale

x_decrementer = x_path/ticks
y_decrementer = y_path/ticks
z_decrementer = z_path/ticks

xdegree = math.pi / x_tone
ydegree = math.pi / y_tone
zdegree = math.pi / z_tone

box_sizes = [0.5, 0.5, 0.5]

tones_x = []
tones_y = []
tones_z = []

for x in range(int(x_tone)):
    tones_x.append(math.sin(x * xdegree + math.pi / 2))

for y in range(int(y_tone)):
    tones_y.append(math.sin(y * ydegree + math.pi / 2))

for z in range(int(z_tone)):
    tones_z.append(math.sin(z * zdegree + math.pi / 2))



x_increment = 1
x_counter = 0

y_increment = 1
y_counter = 0

z_increment = 1
z_counter = 0

cdegerator = []

for t in range(int(ticks)):
    if x_counter ==  x_tone -1:
        x_increment = -1

    if x_counter == 0:
        x_increment = 1

    if y_counter ==  y_tone -1:
        y_increment = -1

    if y_counter == 0:
        y_increment = 1

    if z_counter ==  z_tone -1:
        z_increment = -1

    if z_counter == 0:
        z_increment = 1
        
    curr_x_dec =  x_path-(x_decrementer*t)
    if curr_x_dec < 0:
        curr_x_dec = 0

    curr_y_dec =  y_path-(y_decrementer*t)
    if curr_y_dec < 0:
        curr_y_dec = 0

    curr_z_dec =  z_path-(z_decrementer*t)
    if curr_z_dec < 0:
        curr_z_dec = 0

    x_move = tones_x[x_counter]*curr_x_dec
    #x_move = [t]
    y_move = tones_y[y_counter]*curr_y_dec
    z_move = tones_z[z_counter]*curr_z_dec

    "SCALE"
    scale_x =   ( 1 - tones_x[x_counter] )
    if scale_x<0:
        scale_x = scale_x*-1

    scale_y =   ( 1 - tones_y[y_counter] )
    if scale_y<0:
        scale_y = scale_y*-1

    scale_z =   ( 1 - tones_z[z_counter] )
    if scale_z<0:
        scale_z = scale_z*-1


    t_dec = 2/(ticks / (ticks+1-t))

    "Increment counters"
    x_counter = x_counter + x_increment
    y_counter = y_counter + y_increment
    z_counter = z_counter + z_increment

    "Append to export arrays"
    out_x.append(x_move + canvas_width/2)
    out_y.append(y_move + canvas_height/2)
    out_z.append(z_move)

    out_scale_x.append(scale_x+t_dec+0.3)
    out_scale_y.append(scale_y+t_dec+0.3)
    out_scale_z.append(scale_z+t_dec+0.3)


"File handle"



svg = '<svg viewBox="0 0 {} {}" xmlns="http://www.w3.org/2000/svg">'.format(canvas_width, canvas_height)

for t in range(int(ticks)):

    element = '<circle cx="{}" cy="{}" r="{}" stroke="{}" stroke-width="{}" fill="{}" opacity="{}" />'.format(out_x[t], out_y[t], out_scale_x[t], stroke_color, stroke_width, fill_color, opacity)
    svg += element

svg += '</svg>'


save_incrementaly('./out', svg)













	


