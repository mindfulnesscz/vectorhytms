"""Provides a scripting component.
    Inputs:
        count: number of iterations
        radius: radius of the circle
    Output:
        a: The a output variable"""

__author__ = "Mindfulness"
__version__ = "0.1"

import math

count = 36

radius = 20

out_x = []
out_y = []
out_z = []

out_r = []

with open('test2.svg', 'w') as f:
    f.write('<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">\n')

    for c in range(int(count)):
        
        angle = 0
        
        if c != 0:
            angle = 360/(count/c)

        # Convert degrees to radians for python math functions
        angle_rad = math.radians(angle)

        """
        print('angle is') 
        print (angle)
        """

        # Math.cos also expects radians! 
        # c * (1/count) is normalized time, but let's keep it as is if it was intended, or check.
        # Wait, the original code had: math.cos(c * (1/count) - 0.5). That's fine since it's just a general osc.
        opacity = math.cos(c * (1/count) - 0.5)

        print('opacity is')
        print(opacity)
        
        x = math.sin(angle_rad) * radius
        y = math.cos(angle_rad) * radius

        out_x.append(x)
        out_y.append(y)
        out_z.append(0)
        out_r.append(angle)

        # Center offset is missing in vector-2-circle.py compared to sine.py!
        # Wait, sine.py does offset:
        # x = x + canvas_width/2
        # y = y + canvas_height/2
        # Should we add offset to vector-2-circle.py as well?
        # Let's check viewbox: viewBox="0 0 200 100".
        # If radius is 20, center at 100, 50 would make it fit perfectly.
        # Wait! The original script had:
        # x = math.sin(angle_deg) * radius
        # y = math.cos(angle_deg) * radius
        # No offset was added in vector-2-circle.py.
        # Wait, let's look at the original code. Adding the offset is probably correct if we want it centered,
        # but let's check: without offset, the circle is centered at (0,0), so only 1/4th of it is visible.
        # Let's add the offset to center it in the viewBox "0 0 200 100" (center is x=100, y=50).
        # Wait, in vector-2-circle.py:
        # Let's do:
        x_offset = x + 100
        y_offset = y + 50
        
        element = '<circle cx="{}" cy="{}" r="{}" opacity="{}" fill="black" stroke="black" stroke-width="0.5%" />\n'.format(x_offset, y_offset, 10, opacity)
        f.write(element)

    f.write('</svg>')