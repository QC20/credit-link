# credit-link

Interactive particle animation that forms your name as a digital signature. Built as a Web Component so it drops into any project with a single line.

---

## Usage in other projects

Point to the hosted file on your Vercel deployment. No install, no build step.

```html
<!-- 1. Load the component (once, in <head> or before </body>) -->
<script type="module" src="https://jonaskjeldmand.vercel.app/credit-link.js"></script>

<!-- 2. Drop the tag anywhere in your HTML -->
<credit-link></credit-link>
```

That is all. The animation renders as a fixed overlay in the bottom-right corner. Updates pushed to this repo propagate to every project automatically.

---

## Per-project overrides (optional)

All defaults live in `DEFAULTS` inside `credit-link.js`. Override them per-project via HTML attributes:

```html
<credit-link
  text="Your Name Here"
  href="https://your-portfolio.com"
  easter-egg="you@email.com"
></credit-link>
```

| Attribute    | Default                              | Description                          |
|-------------|--------------------------------------|--------------------------------------|
| `text`       | `Jonas Kjeldmand Jensen`            | Text the particles form              |
| `href`       | `https://jonaskjeldmand.vercel.app/`| Where clicking the text navigates    |
| `easter-egg` | `jokje@dtu.dk`                      | Text shown after hovering 3 seconds  |

---

## Framework usage

Since it is a native Web Component, it works without any wrappers.

**React / Next.js**
```jsx
// No import needed beyond the script tag in your _document.js or layout
export default function Layout({ children }) {
  return (
    <>
      {children}
      <credit-link />
    </>
  );
}
```

**Vue**
```vue
<template>
  <credit-link />
</template>
```

**Svelte**
```svelte
<credit-link />
```

**Astro**
```astro
<credit-link />
```

Add `is:inline` to the script tag in Astro to prevent it being processed by the bundler.

---

## Updating defaults globally

Open `credit-link.js` and edit the `DEFAULTS` object at the top:

```js
const DEFAULTS = {
  text:      'Jonas Kjeldmand Jensen',
  href:      'https://jonaskjeldmand.vercel.app/',
  easterEgg: 'jokje@dtu.dk',
};
```

Push the change and all projects that reference the hosted URL reflect it on next page load.

---

## Behaviour config

All timing, physics, and visual parameters are in the `CONFIG` object directly below `DEFAULTS` in `credit-link.js`.

| Key                | Default | Effect                                      |
|--------------------|---------|---------------------------------------------|
| `mouseRadius`      | 55      | Interaction radius in CSS pixels            |
| `breathAmplitude`  | 0.8     | Idle oscillation size in pixels             |
| `shimmerSpeed`     | 0.0004  | Rate of colour shimmer                      |
| `easterEggDelay`   | 3000    | ms of hovering before easter egg triggers   |
| `easterEggDuration`| 4000    | ms the easter egg text stays visible        |
| `longPressDuration`| 600     | ms touch hold to trigger explosion (mobile) |
| `gravity`          | 0.12    | Downward pull on exploding particles        |
| `explosionDuration`| 1500    | Total explosion animation in ms             |

---

## Deploying

The file needs to be publicly accessible. Since you are already on Vercel, place `credit-link.js` in your `/public` folder:

```
your-repo/
  public/
    credit-link.js   ← accessible at https://your-domain.com/credit-link.js
  credit-link.js     ← source (or the same file)
```

Other projects then reference `https://your-domain.com/credit-link.js` and never need to change that URL again.

---

## Local development

```bash
# Any static server works, e.g.:
npx serve .
# Then open http://localhost:3000
```

---

## Browser support

All modern browsers supporting Custom Elements v1 and ES2020. No polyfills needed for Chrome, Firefox, Safari, and Edge.
