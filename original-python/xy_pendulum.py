from incremental_file import save_incrementaly 
import math

"""Provides a 2D pendulum simulation scripting component.
"""

__author__ = "Mindfulness"
__version__ = "0.1"


## VARIABLES -----------------

canvas_width = 800
canvas_height = 800

ticks = 1600.0

# Pendulum parameters
amplitude = 200.0  # Max height/width from center (pixels)
decay = 0.5        # Damping factor

frequency_y = 20.0   # Y axis frequency
frequency_x = 10.0   # X axis frequency

stroke_color = "#ff0000"
stroke_width = "0.1%"
fill_color = "#00ff00"
fill_opacity = 0
stroke_opacity = 1.0

# Radius parameters
radius_min = 5.0
radius_max = 20.0

## ----------------------------


out_x = []
out_y = []
out_r = []

# Previous positions for speed calculation
# Initialize at center + initial displacement guess
# t=0 -> norm_t=0 -> exp(0)=1 -> cos(0)=1 -> displacement = amplitude
last_x = (amplitude * 1) + canvas_width / 2
last_y = (amplitude * 1) + canvas_height / 2

# Calculation Loop
for t in range(int(ticks)):
    
    # Normalized time from 0.0 to 1.0
    norm_t = t / ticks
    
    # Decaying amplitude factor
    current_amp = amplitude * math.exp(-decay * norm_t)
    
    # Y Axis: Oscillation
    oscillation_y = math.cos(norm_t * frequency_y * 2 * math.pi)
    y = current_amp * oscillation_y
    y = y + canvas_height / 2
    
    # X Axis: Oscillation
    oscillation_x = math.cos(norm_t * frequency_x * 2 * math.pi)
    x = current_amp * oscillation_x
    x = x + canvas_width / 2
    
    # Calculate speed (Euclidean distance between points)
    dx = x - last_x
    dy = y - last_y
    speed = math.sqrt(dx*dx + dy*dy)
    
    last_x = x
    last_y = y
    
    # Map speed to radius
    # Estimate max speed logic needs adjustment for 2D but roughly similar scaling
    # Increased reference speed slightly due to 2D movement
    max_speed_ref = 15.0
    normalized_speed = min(speed / max_speed_ref, 1.0)
    
    current_radius = radius_min + (radius_max - radius_min) * normalized_speed
    
    out_x.append(x)
    out_y.append(y)
    out_r.append(current_radius)


# SVG Generation

svg = '<svg viewBox="0 0 {} {}" xmlns="http://www.w3.org/2000/svg">'.format(canvas_width, canvas_height)

for t in range(int(ticks)):
    element = '<circle cx="{}" cy="{}" r="{}" stroke="{}" stroke-width="{}" fill="{}" fill-opacity="{}" stroke-opacity="{}" />'.format(
        out_x[t], out_y[t], out_r[t], stroke_color, stroke_width, fill_color, fill_opacity, stroke_opacity)
    svg += element

svg += '</svg>'


save_incrementaly('./out', svg)
