# Interactive Particle Credit Link

This project creates an interactive particle animation that forms the text "Jonas Kjeldmand Jensen". When users hover over or touch the text (on mobile devices), the particles react and move organically. Clicking or tapping the text triggers an explosion effect before redirecting to a specified URL.

## Features

- Responsive design that works on both desktop and mobile devices
- Interactive particle animation that reacts to mouse/touch input
- Text formed by particles that disperse and re-form
- Explosion effect on click/tap, followed by a page redirect
- Smooth performance optimized for various screen sizes and pixel densities

## Technical Details

The project consists of three main files:

1. `index.html`: The main HTML file that sets up the canvas element.
2. `credit.js`: The JavaScript file containing all the logic for the particle animation, interactivity, and explosion effect.
3. `credit.css`: The CSS file that styles the canvas and ensures it covers the full viewport.

The animation is created using HTML5 Canvas and vanilla JavaScript. It uses requestAnimationFrame for smooth animation and is optimized for performance on both desktop and mobile devices.

## Customization

You can customize the following aspects of the animation:

- Text content: Change the 'Jonas Kjeldmand Jensen' string in the `init()` function.
- Redirect URL: Modify the `redirectURL` constant at the top of the JavaScript file.
- Particle behavior: Adjust parameters like `maxDistance`, `returnForce`, and explosion speed in the `Particle` class methods.
- Visual style: Modify particle size, color, and density in the `Particle` class constructor and `draw()` method.

## Browser Compatibility

This animation should work on all modern browsers that support HTML5 Canvas and ES6 JavaScript features. It has been optimized for both desktop and mobile devices.

## Performance Considerations

The animation adjusts the number of particles based on the device's pixel ratio to maintain good performance across different devices. On high-density displays, it may create fewer particles to ensure smooth animation.


Enjoy the interactive particle text animation! Feel free to use, modify, and expand upon this project for your own creative purposes.