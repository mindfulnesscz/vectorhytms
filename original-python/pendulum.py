from incremental_file import save_incrementaly 
import math

"""Provides a pendulum simulation scripting component.
"""

__author__ = "Mindfulness"
__version__ = "0.1"


## VARIABLES -----------------

canvas_width = 800
canvas_height = 400

ticks = 200.0

# Pendulum parameters
amplitude = 150.0  # Max height from center (pixels)
decay = 5.0        # Damping factor
frequency = 20.0   # Number of full swings across the canvas

stroke_color = "#ff0000"
stroke_width = "0.2%"
fill_color = "#00ff00"
fill_opacity = 0.2
stroke_opacity = 1.0

# Radius parameters
radius_min = 5.0
radius_max = 100.0

## ----------------------------


out_x = []
out_y = []
out_r = []

# Previous y for speed calculation (initialize with t=0 value roughly)
last_y = amplitude + canvas_height / 2

# Calculation Loop
for t in range(int(ticks)):
    
    # Normalized time from 0.0 to 1.0
    norm_t = t / ticks
    
    # X Axis: Linear increment
    # Spans from left (0) to right (canvas_width)
    x = norm_t * canvas_width
    
    # Y Axis: Damped Oscillation
    # y = A * e^(-lambda * t) * cos(omega * t)
    
    # Decaying amplitude factor
    current_amp = amplitude * math.exp(-decay * norm_t)
    
    # Oscillation component (cosine starts at max)
    oscillation = math.cos(norm_t * frequency * 2 * math.pi)
    
    y = current_amp * oscillation
    
    y = y + canvas_height / 2
    
    # Calculate speed (absolute difference in y)
    speed = abs(y - last_y)
    last_y = y
    
    # Map speed to radius
    # Estimate max speed per tick approx: amplitude * frequency * 2 * pi / ticks
    # 150 * 10 * 6.28 / 1000 = ~9.42. Let's saturate at 10.
    max_speed_ref = 10.0
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
